import axios from 'axios';
import https from 'https';
import fse from 'fs-extra';
import path from 'path';
import { IAttachmentService } from '../interfaces/IAttachmentService.js';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';
import zohoService from './ZohoService.js';

const ZOHO_BASE_URL = `${env.ZOHO_API_DOMAIN}/crm/v2`;

// Production: skip SSL verification (RDP has no internet for CRL checks)
// Development: normal SSL verification
const httpsAgent = env.isProd()
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

// Production: longer timeout (RDP network is slower)
// Development: normal timeout
const LIST_TIMEOUT     = env.isProd() ? 60_000 : 15_000;
const DOWNLOAD_TIMEOUT = env.isProd() ? 120_000 : 60_000;

/**
 * AttachmentService — fetches and downloads Zoho CRM attachments to RDP disk.
 *
 * S  — Only responsibility: handle attachment fetch + download + storage.
 * L  — Extends IAttachmentService; fully substitutable.
 */
class AttachmentService extends IAttachmentService {
    constructor() {
        super();
        this._base = path.resolve(env.ATTACHMENT_STORAGE_PATH);
    }

    _attachmentDir(module, recordId) {
        return path.join(this._base, module, recordId);
    }

    /**
     * Fetch list of attachments for a record from Zoho CRM.
     *
     * @param {string} module   e.g. 'Leads'
     * @param {string} recordId Zoho record ID
     * @returns {Promise<object[]>}
     */
    async fetchAttachmentList(module, recordId) {
        const token = await zohoService.getAccessToken();

        logger.info('AttachmentService: fetching attachment list', { module, recordId });

        try {
            const { data: response } = await axios.get(
                `${ZOHO_BASE_URL}/${module}/${recordId}/Attachments`,
                {
                    headers:    { Authorization: `Zoho-oauthtoken ${token}` },
                    httpsAgent,
                    timeout:    LIST_TIMEOUT,
                }
            );

            const attachments = response.data || [];
            logger.info('AttachmentService: found attachments', {
                module,
                recordId,
                count: attachments.length,
            });

            return attachments;

        } catch (err) {
            // 204 means no attachments — not an error
            if (err.response?.status === 204) {
                logger.info('AttachmentService: no attachments found', { module, recordId });
                return [];
            }
            logger.error('AttachmentService: fetchAttachmentList error', {
                module,
                recordId,
                status:  err.response?.status,
                message: err.message,
            });
            throw err;
        }
    }

    /**
     * Download a single attachment and save it to RDP disk.
     *
     * @param {string} module
     * @param {string} recordId
     * @param {string} attachmentId
     * @param {string} fileName
     * @returns {Promise<{ attachmentId, fileName, filePath, size }>}
     */
    async downloadAttachment(module, recordId, attachmentId, fileName) {
        const token    = await zohoService.getAccessToken();
        const dir      = this._attachmentDir(module, recordId);
        const filePath = path.join(dir, fileName);

        await fse.ensureDir(dir);

        logger.info('AttachmentService: downloading attachment', {
            module,
            recordId,
            attachmentId,
            fileName,
        });

        try {
            const response = await axios.get(
                `${ZOHO_BASE_URL}/${module}/${recordId}/Attachments/${attachmentId}`,
                {
                    headers:      { Authorization: `Zoho-oauthtoken ${token}` },
                    httpsAgent,
                    responseType: 'stream',
                    timeout:      DOWNLOAD_TIMEOUT,
                }
            );

            await new Promise((resolve, reject) => {
                const writer = fse.createWriteStream(filePath);
                response.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const stat = await fse.stat(filePath);

            logger.info('AttachmentService: attachment saved', {
                module,
                recordId,
                fileName,
                filePath,
                size: stat.size,
            });

            return {
                attachmentId,
                fileName,
                filePath,
                size: stat.size,
            };

        } catch (err) {
            logger.error('AttachmentService: downloadAttachment error', {
                module,
                recordId,
                attachmentId,
                message: err.message,
            });
            throw err;
        }
    }

    /**
     * Fetch attachment list + download all attachments for a record.
     *
     * @param {string} module
     * @param {string} recordId
     * @returns {Promise<{ recordId, module, total, downloaded, attachments }>}
     */
    async downloadAllAttachments(module, recordId) {
        const list = await this.fetchAttachmentList(module, recordId);

        if (!list.length) {
            return {
                recordId,
                module,
                total:       0,
                downloaded:  0,
                attachments: [],
            };
        }

        const results = [];

        for (const attachment of list) {
            const result = await this.downloadAttachment(
                module,
                recordId,
                attachment.id,
                attachment.File_Name,
            );
            results.push(result);
        }

        return {
            recordId,
            module,
            total:       list.length,
            downloaded:  results.length,
            attachments: results,
        };
    }
}

export default new AttachmentService();