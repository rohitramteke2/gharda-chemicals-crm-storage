import axios from 'axios';
import fse from 'fs-extra';
import path from 'path';
import FormData from 'form-data';
import { env, zohoHttpsAgent } from '../config/env.js';
import logger from '../utils/logger.js';
import auth from './ZohoAuthService.js';

const BASE = `${env.ZOHO_API_DOMAIN}/crm/v2`;

class ZohoAttachmentService {

    constructor() {
        this.storageRoot = path.resolve(env.ATTACHMENT_DIR);
    }

    // ── 1. List attachments for a record ───────────────────────────────────
    async listAttachments(module, recordId) {
        const token = await auth.getToken();

        logger.info('Attachments: listing', { module, recordId });

        try {
            const { data: res } = await axios.get(
                `${BASE}/${module}/${recordId}/Attachments`,
                {
                    headers:    { Authorization: `Zoho-oauthtoken ${token}` },
                    httpsAgent: zohoHttpsAgent,
                    timeout:    15_000,
                },
            );

            const list = (res.data || []).map(a => ({
                id:        a.id,
                fileName:  a.File_Name,
                size:      a.Size,
                createdBy: a.Created_By?.name || null,
                createdAt: a.Created_Time || null,
            }));

            logger.info('Attachments: found', { module, recordId, count: list.length });
            return list;

        } catch (err) {
            // 204 = no attachments — perfectly normal
            if (err.response?.status === 204) {
                logger.info('Attachments: none found (204)', { module, recordId });
                return [];
            }
            if (err.response?.status === 401) auth.clearToken();
            logger.error('Attachments: list failed', {
                module, recordId,
                status:  err.response?.status,
                message: err.message,
                code:    err.code,
            });
            throw err;
        }
    }

    // ── 2. Download a single attachment to disk ────────────────────────────
    async downloadOne(module, recordId, attachmentId, fileName) {
        const token = await auth.getToken();
        const dir   = path.join(this.storageRoot, module, recordId);
        const dest  = path.join(dir, fileName);

        await fse.ensureDir(dir);

        logger.info('Attachments: downloading', { module, recordId, attachmentId, fileName });

        try {
            const response = await axios.get(
                `${BASE}/${module}/${recordId}/Attachments/${attachmentId}`,
                {
                    headers:      { Authorization: `Zoho-oauthtoken ${token}` },
                    httpsAgent:   zohoHttpsAgent,
                    responseType: 'stream',
                    timeout:      120_000,   // large files need more time
                },
            );

            // Pipe stream → file
            await new Promise((resolve, reject) => {
                const writer = fse.createWriteStream(dest);
                response.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const stat = await fse.stat(dest);

            logger.info('Attachments: saved', { module, recordId, fileName, size: stat.size });

            return {
                attachmentId,
                fileName,
                filePath: dest,
                size:     stat.size,
            };

        } catch (err) {
            if (err.response?.status === 401) auth.clearToken();
            logger.error('Attachments: download failed', {
                module, recordId, attachmentId, fileName,
                status:  err.response?.status,
                message: err.message,
                code:    err.code,
            });
            throw err;
        }
    }

    // ── 3. Download ALL attachments for a record ───────────────────────────
    async downloadAll(module, recordId) {
        const list = await this.listAttachments(module, recordId);

        if (!list.length) {
            return { module, recordId, total: 0, downloaded: 0, attachments: [] };
        }

        const results = [];

        for (const att of list) {
            try {
                const result = await this.downloadOne(module, recordId, att.id, att.fileName);
                results.push({ ...result, status: 'ok' });
            } catch (err) {
                // Don't let one failed download abort the rest
                results.push({
                    attachmentId: att.id,
                    fileName:     att.fileName,
                    status:       'failed',
                    error:        err.message,
                });
            }
        }

        return {
            module,
            recordId,
            total:      list.length,
            downloaded: results.filter(r => r.status === 'ok').length,
            failed:     results.filter(r => r.status === 'failed').length,
            attachments: results,
        };
    }

    // ── 4. Upload a file to Zoho CRM + save to RDP disk ───────────────────
    async uploadAttachment(module, recordId, file) {
        const token    = await auth.getToken();
        const fileName = file.originalname;

        logger.info('Attachments: uploading to Zoho', { module, recordId, fileName, size: file.size });

        // ── Upload to Zoho CRM ─────────────────────────────────────────
        const form = new FormData();
        form.append('file', file.buffer, {
            filename:    fileName,
            contentType: file.mimetype,
        });

        let zohoResponse;
        try {
            const { data } = await axios.post(
                `${BASE}/${module}/${recordId}/Attachments`,
                form,
                {
                    headers: {
                        Authorization: `Zoho-oauthtoken ${token}`,
                        ...form.getHeaders(),
                    },
                    httpsAgent: zohoHttpsAgent,
                    timeout:    120_000,
                    maxContentLength: Infinity,
                    maxBodyLength:    Infinity,
                },
            );

            zohoResponse = data;
            logger.info('Attachments: uploaded to Zoho', { module, recordId, zohoResponse });

        } catch (err) {
            if (err.response?.status === 401) auth.clearToken();
            logger.error('Attachments: upload to Zoho failed', {
                module, recordId, fileName,
                status:  err.response?.status,
                message: err.message,
                zoho:    err.response?.data,
            });
            throw err;
        }

        // ── Save to RDP disk ───────────────────────────────────────────
        const dir      = path.join(this.storageRoot, module, recordId);
        const filePath = path.join(dir, fileName);

        await fse.ensureDir(dir);
        await fse.writeFile(filePath, file.buffer);

        const attachmentId = zohoResponse?.data?.[0]?.details?.id || null;

        logger.info('Attachments: saved to disk', { module, recordId, fileName, filePath });

        return {
            module,
            recordId,
            attachmentId,
            fileName,
            filePath,
            size:       file.size,
            zohoStatus: zohoResponse?.data?.[0]?.status || 'unknown',
            message:    zohoResponse?.data?.[0]?.message || null,
        };
    }
}

export default new ZohoAttachmentService();
