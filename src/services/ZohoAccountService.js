import axios from 'axios';
import fse from 'fs-extra';
import path from 'path';
import FormData from 'form-data';
import { env, zohoHttpsAgent } from '../config/env.js';
import logger from '../utils/logger.js';
import auth from './ZohoAuthService.js';

const BASE   = `${env.ZOHO_API_DOMAIN}/crm/v2`;
const MODULE = 'Accounts';

class ZohoAccountService {

    constructor() {
        this.storageRoot = path.resolve(env.ATTACHMENT_DIR);
    }

    // ── Shared headers helper ────────────────────────────────────────────────
    async #headers() {
        const token = await auth.getToken();
        return { Authorization: `Zoho-oauthtoken ${token}` };
    }

    // ════════════════════════════════════════════════════════════════════════
    //  FETCH RECORDS
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Fetch all accounts (paginated).
     * Returns same structure as Zoho: { data: [...], info: { more_records, count, ... } }
     */
    async fetchRecords({ page = 1, per_page = 50 } = {}) {
        const headers = await this.#headers();

        logger.info('ZohoAccountService: fetchRecords', { page, per_page });

        try {
            const { data: res } = await axios.get(`${BASE}/${MODULE}`, {
                headers,
                httpsAgent: zohoHttpsAgent,
                params:     { page, per_page },
                timeout:    30_000,
            });

            return {
                data: res.data || [],
                info: res.info || {},
            };
        } catch (err) {
            if (err.response?.status === 401) auth.clearToken();
            logger.error('ZohoAccountService: fetchRecords failed', { message: err.message });
            throw err;
        }
    }

    /**
     * Fetch a single account by CRM record ID.
     * Returns the record object directly (same as Zoho data[0]).
     */
    async fetchRecordById(recordId) {
        const headers = await this.#headers();

        logger.info('ZohoAccountService: fetchRecordById', { recordId });

        try {
            const { data: res } = await axios.get(`${BASE}/${MODULE}/${recordId}`, {
                headers,
                httpsAgent: zohoHttpsAgent,
                timeout:    15_000,
            });

            return res.data?.[0] || null;
        } catch (err) {
            if (err.response?.status === 401) auth.clearToken();
            if (err.response?.status === 404) return null;
            logger.error('ZohoAccountService: fetchRecordById failed', { recordId, message: err.message });
            throw err;
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  CREATE / UPDATE RECORDS
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Create a new account record in Zoho CRM.
     * Returns Zoho's response data array (data[0] with id, status, message, details).
     */
    async createRecord(fields) {
        const headers = await this.#headers();

        logger.info('ZohoAccountService: createRecord', { fields: Object.keys(fields) });

        try {
            const { data: res } = await axios.post(
                `${BASE}/${MODULE}`,
                { data: [fields] },
                {
                    headers:    { ...headers, 'Content-Type': 'application/json' },
                    httpsAgent: zohoHttpsAgent,
                    timeout:    15_000,
                }
            );

            // Return same shape Zoho returns: data[0]
            return res.data?.[0] || res;
        } catch (err) {
            if (err.response?.status === 401) auth.clearToken();
            logger.error('ZohoAccountService: createRecord failed', { message: err.message, zoho: err.response?.data });
            throw err;
        }
    }

    /**
     * Update an existing account record in Zoho CRM.
     * Returns Zoho's response data (same shape as create).
     */
    async updateRecord(recordId, fields) {
        const headers = await this.#headers();

        logger.info('ZohoAccountService: updateRecord', { recordId, fields: Object.keys(fields) });

        try {
            const { data: res } = await axios.put(
                `${BASE}/${MODULE}/${recordId}`,
                { data: [fields] },
                {
                    headers:    { ...headers, 'Content-Type': 'application/json' },
                    httpsAgent: zohoHttpsAgent,
                    timeout:    15_000,
                }
            );

            return res.data?.[0] || res;
        } catch (err) {
            if (err.response?.status === 401) auth.clearToken();
            logger.error('ZohoAccountService: updateRecord failed', { recordId, message: err.message, zoho: err.response?.data });
            throw err;
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  STANDARD ATTACHMENTS
    // ════════════════════════════════════════════════════════════════════════

    /**
     * List all standard attachments on an account (metadata only).
     */
    async listAttachments(recordId) {
        const headers = await this.#headers();

        logger.info('ZohoAccountService: listAttachments', { recordId });

        try {
            const { data: res } = await axios.get(
                `${BASE}/${MODULE}/${recordId}/Attachments`,
                { headers, httpsAgent: zohoHttpsAgent, timeout: 15_000 }
            );

            return (res.data || []).map(a => ({
                id:        a.id,
                fileName:  a.File_Name,
                size:      a.Size,
                createdBy: a.Created_By?.name || null,
                createdAt: a.Created_Time    || null,
            }));
        } catch (err) {
            if (err.response?.status === 204) return [];  // no attachments
            if (err.response?.status === 401) auth.clearToken();
            logger.error('ZohoAccountService: listAttachments failed', { recordId, message: err.message });
            throw err;
        }
    }

    /**
     * Download ALL standard attachments for an account → save to disk.
     */
    async downloadAllAttachments(recordId) {
        const attachments = await this.listAttachments(recordId);

        if (attachments.length === 0) {
            return { recordId, total: 0, downloaded: [], message: 'No attachments found.' };
        }

        const results = await Promise.all(
            attachments.map(a => this.downloadOneAttachment(recordId, a.id, a.fileName))
        );

        const allOk = results.every(r => r.status_api_check);

        return {
            recordId,
            total:            attachments.length,
            status_api_check: allOk,
            downloaded:       results,
        };
    }

    /**
     * Download a single standard attachment → save to disk → return path + URL.
     */
    async downloadOneAttachment(recordId, attachmentId, fileName) {
        const headers = await this.#headers();
        const dir     = path.join(this.storageRoot, MODULE, recordId, 'attachments');
        const dest    = path.join(dir, fileName);

        await fse.ensureDir(dir);

        logger.info('ZohoAccountService: downloadOneAttachment', { recordId, attachmentId, fileName });

        try {
            const response = await axios.get(
                `${BASE}/${MODULE}/${recordId}/Attachments/${attachmentId}`,
                {
                    headers,
                    httpsAgent:   zohoHttpsAgent,
                    responseType: 'stream',
                    timeout:      120_000,
                }
            );

            await new Promise((resolve, reject) => {
                const writer = fse.createWriteStream(dest);
                response.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const stat       = await fse.stat(dest);
            const storageUrl = this.#buildUrl(`${MODULE}/${recordId}/attachments/${fileName}`);

            return {
                attachmentId,
                fileName,
                status_api_check: true,
                localPath:        dest,
                storageUrl,
                size:             stat.size,
            };
        } catch (err) {
            if (err.response?.status === 401) auth.clearToken();
            logger.error('ZohoAccountService: downloadOneAttachment failed', { recordId, attachmentId, message: err.message });
            return {
                attachmentId,
                fileName,
                status_api_check: false,
                error:            err.message,
            };
        }
    }

    /**
     * Upload a file as a standard Zoho CRM attachment.
     */
    async uploadAttachment(recordId, file) {
        const headers = await this.#headers();

        logger.info('ZohoAccountService: uploadAttachment', { recordId, name: file.originalname, size: file.size });

        const form = new FormData();
        form.append('file', file.buffer, {
            filename:    file.originalname,
            contentType: file.mimetype,
        });

        try {
            const { data: res } = await axios.post(
                `${BASE}/${MODULE}/${recordId}/Attachments`,
                form,
                {
                    headers:    { ...headers, ...form.getHeaders() },
                    httpsAgent: zohoHttpsAgent,
                    timeout:    60_000,
                }
            );

            return {
                status_api_check: true,
                zohoResponse:     res.data?.[0] || res,
                fileName:         file.originalname,
                size:             file.size,
            };
        } catch (err) {
            if (err.response?.status === 401) auth.clearToken();
            logger.error('ZohoAccountService: uploadAttachment failed', { recordId, message: err.message });
            throw err;
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  RECORD IMAGE (photo field)
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Download the record image (photo) for an account.
     * Returns { stream, contentType, fileName } for streaming to client.
     *
     * Uses: GET /crm/v2/Accounts/{record_ID}/photo
     */
    async downloadRecordImage(recordId) {
        const headers = await this.#headers();

        logger.info('ZohoAccountService: downloadRecordImage', { recordId });

        try {
            const response = await axios.get(
                `${BASE}/${MODULE}/${recordId}/photo`,
                {
                    headers,
                    httpsAgent:   zohoHttpsAgent,
                    responseType: 'stream',
                    timeout:      30_000,
                }
            );

            const contentType = response.headers['content-type'] || 'image/jpeg';
            const disposition = response.headers['content-disposition'] || '';
            const fileName    = this.#extractFileName(disposition, `${recordId}-photo.jpg`);

            return { stream: response.data, contentType, fileName };

        } catch (err) {
            if (err.response?.status === 401) auth.clearToken();
            if (err.response?.status === 404 || err.response?.status === 204) {
                const noImg  = new Error(`No record image for account ${recordId}`);
                noImg.code   = 'NO_IMAGE';
                throw noImg;
            }
            logger.error('ZohoAccountService: downloadRecordImage failed', { recordId, message: err.message });
            throw err;
        }
    }

    /**
     * Upload / replace the record image (photo) for an account.
     *
     * Uses: POST /crm/v2/Accounts/{record_ID}/photo
     */
    async uploadRecordImage(recordId, file) {
        const headers = await this.#headers();

        logger.info('ZohoAccountService: uploadRecordImage', { recordId, name: file.originalname, size: file.size });

        const form = new FormData();
        form.append('file', file.buffer, {
            filename:    file.originalname,
            contentType: file.mimetype,
        });

        try {
            const { data: res } = await axios.post(
                `${BASE}/${MODULE}/${recordId}/photo`,
                form,
                {
                    headers:    { ...headers, ...form.getHeaders() },
                    httpsAgent: zohoHttpsAgent,
                    timeout:    60_000,
                }
            );

            return {
                status_api_check: true,
                zohoResponse:     res,
                fileName:         file.originalname,
                size:             file.size,
                recordId,
            };
        } catch (err) {
            if (err.response?.status === 401) auth.clearToken();
            logger.error('ZohoAccountService: uploadRecordImage failed', { recordId, message: err.message, zoho: err.response?.data });
            throw err;
        }
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    #buildUrl(relativePath) {
        const base = env.PUBLIC_BASE_URL || 'https://zoho.gharda.com:14443/production';
        return `${base}/storage/${relativePath}`;
    }

    #extractFileName(disposition, fallback) {
        if (!disposition) return fallback;

        const rfc5987 = disposition.match(/filename\*\s*=\s*UTF-8''(.+?)(?:;|$)/i);
        if (rfc5987?.[1]) {
            try { return decodeURIComponent(rfc5987[1].trim()); } catch { return rfc5987[1].trim(); }
        }

        const std = disposition.match(/filename\s*=\s*"?([^";\\n]+)"?/i);
        if (std?.[1] && !std[1].startsWith('UTF-8')) return std[1].trim();

        return fallback;
    }
}

export default new ZohoAccountService();
