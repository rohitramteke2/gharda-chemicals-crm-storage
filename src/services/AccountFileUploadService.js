import axios from 'axios';
import fse from 'fs-extra';
import path from 'path';
import { env, zohoHttpsAgent } from '../config/env.js';
import logger from '../utils/logger.js';
import auth from './ZohoAuthService.js';

const BASE    = `${env.ZOHO_API_DOMAIN}/crm/v2`;
const BASE_V3 = `${env.ZOHO_API_DOMAIN}/crm/v3`;

// ── Max parallel downloads at once (safe for Zoho rate limits) ──────────────
const PARALLEL_LIMIT = 4;

// ── All 22 File Upload + Image Upload fields in Distributor layout ──────────
const FILE_UPLOAD_FIELDS = [
    { apiName: 'Official_E_Mail_ID_Contact_No_On_Letter_Head',       label: 'Official Email & Contact on Letterhead', type: 'file_upload'  },
    { apiName: 'Pesticide_Liscense',                                  label: 'Pesticide License',                      type: 'file_upload'  },
    { apiName: 'Upload_Account_Verification_Cheque_Rs_100',           label: 'Account Verification Cheque',            type: 'file_upload'  },
    { apiName: 'Upload_Address_Proof',                                 label: 'Address Proof',                          type: 'file_upload'  },
    { apiName: 'Upload_appraisal_Form',                                label: 'Appraisal Form',                         type: 'file_upload'  },
    { apiName: 'Upload_Bank_Certificate_for_Bank_Account_Confirmat',   label: 'Bank Certificate',                       type: 'file_upload'  },
    { apiName: 'Upload_Bank_Cheque',                                   label: 'Bank Cheque',                            type: 'file_upload'  },
    { apiName: 'Business_Report',                                      label: 'Business Planning Sheet',                type: 'file_upload'  },
    { apiName: 'Upload_declaration_of_detail_Information',             label: 'Declaration of Detail Information',      type: 'file_upload'  },
    { apiName: 'Distributor_Agreement',                                label: 'Distributor Agreement Form',             type: 'file_upload'  },
    { apiName: 'Upload_distributor_Strength_Analysis_Report',          label: 'Distributor Strength Analysis Report',   type: 'file_upload'  },
    { apiName: 'Upload_Fertilizer_License',                            label: 'Fertilizer License',                     type: 'file_upload'  },
    { apiName: 'Upload_GSTIN_Certificate',                             label: 'GSTIN Certificate',                      type: 'file_upload'  },
    { apiName: 'Upload_last_Two_Year_Balance_Sheet_Net_Worth',         label: 'Balance Sheet / Net Worth',              type: 'file_upload'  },
    { apiName: 'Upload_Last_Two_Year_ITR_Net_Worth_Certificate',       label: 'ITR / Net Worth Certificate',            type: 'file_upload'  },
    { apiName: 'Upload_Last_Two_Year_Profit_Loss_Account_Net_W',       label: 'Profit & Loss Account',                  type: 'file_upload'  },
    { apiName: 'Upload_Partnership_Agreement_Proprietorship_Deed',     label: 'Partnership Agreement / Deed',           type: 'file_upload'  },
    { apiName: 'Upload_proof_of_security_Deposit',                     label: 'Proof of Security Deposit',              type: 'file_upload'  },
    { apiName: 'Upload_two_Blank_Letterhead_Signed',                   label: 'Two Blank Letterhead Signed',            type: 'file_upload'  },
    { apiName: 'Upload_Aadhar_Card_File',                              label: 'Aadhar Card',                            type: 'image_upload' },
    { apiName: 'Upload_GPS_Photo',                                     label: 'GPS Photo',                              type: 'image_upload' },
    { apiName: 'Upload_Pan_Card_File',                                 label: 'Pan Card',                               type: 'image_upload' },
];

const MIME_TO_EXT = {
    'application/pdf':    '.pdf',
    'image/jpeg':         '.jpg',
    'image/png':          '.png',
    'image/gif':          '.gif',
    'image/bmp':          '.bmp',
    'image/webp':         '.webp',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':      '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'text/plain':         '.txt',
    'text/csv':           '.csv',
    'application/zip':    '.zip',
    'application/x-rar-compressed': '.rar',
    'application/octet-stream':     '.bin',
};

function buildFileUrl(storageRoot, filePath) {
    const baseUrl  = env.PUBLIC_BASE_URL || 'https://zoho.gharda.com:14443/production';
    const relative = path.relative(storageRoot, filePath).replace(/\\/g, '/');
    return `${baseUrl}/storage/${relative}`;
}

function extractFileName(disposition, fallback) {
    if (!disposition) return fallback;
    const rfc5987 = disposition.match(/filename\*\s*=\s*UTF-8''(.+?)(?:;|$)/i);
    if (rfc5987?.[1]) {
        try { return decodeURIComponent(rfc5987[1].trim()); } catch { return rfc5987[1].trim(); }
    }
    const std = disposition.match(/filename\s*=\s*"?([^";\n]+)"?/i);
    if (std?.[1] && !std[1].startsWith('UTF-8')) return std[1].trim();
    return fallback;
}

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

async function parseZohoError(responseData) {
    if (!responseData) return null;
    if (typeof responseData.read === 'function') {
        try {
            const buf  = await streamToBuffer(responseData);
            const text = buf.toString('utf-8');
            try { return JSON.parse(text); } catch { return text; }
        } catch { return 'Could not read error stream'; }
    }
    return responseData;
}

// ── Run async tasks with a concurrency limit ─────────────────────────────────
async function runWithConcurrency(tasks, limit) {
    const results = new Array(tasks.length);
    let index = 0;

    async function worker() {
        while (index < tasks.length) {
            const i = index++;
            results[i] = await tasks[i]();
        }
    }

    const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
    await Promise.all(workers);
    return results;
}


class AccountFileUploadService {

    constructor() {
        this.storageRoot = path.resolve(env.ATTACHMENT_DIR);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  1. Fetch all Approved accounts (auto-paginate)
    // ═══════════════════════════════════════════════════════════════════════

    async fetchApprovedAccounts() {
        const token = await auth.getToken();
        let page    = 1;
        let hasMore = true;
        const all   = [];

        logger.info('Accounts: fetching approved records (Status=Approved)');

        while (hasMore) {
            try {
                const { data: res } = await axios.get(`${BASE}/Accounts/search`, {
                    headers:    { Authorization: `Zoho-oauthtoken ${token}` },
                    httpsAgent: zohoHttpsAgent,
                    params:     { criteria: '(Status:equals:Approved)', page, per_page: 200 },
                    timeout:    60_000,
                });

                const records = res.data || [];
                all.push(...records);
                hasMore = res.info?.more_records === true;
                page++;

                logger.info('Accounts: fetched page', { page: page - 1, count: records.length, total: all.length });

            } catch (err) {
                if (err.response?.status === 204) { logger.info('Accounts: no approved records found'); return []; }
                if (err.response?.status === 401) auth.clearToken();
                logger.error('Accounts: fetch failed', { page, status: err.response?.status, message: err.message });
                throw err;
            }
        }

        logger.info('Accounts: total approved records', { count: all.length });
        return all;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  2. Fetch a single account by CRM record ID
    // ═══════════════════════════════════════════════════════════════════════

    async fetchAccountById(recordId) {
        const token = await auth.getToken();
        logger.info('Accounts: fetching single record (v3)', { recordId });

        try {
            const { data: res } = await axios.get(`${BASE_V3}/Accounts/${recordId}`, {
                headers:    { Authorization: `Zoho-oauthtoken ${token}` },
                httpsAgent: zohoHttpsAgent,
                timeout:    15_000,
            });
            return res.data?.[0] || null;
        } catch (err) {
            if (err.response?.status === 401) auth.clearToken();
            logger.error('Accounts: fetchById failed', { recordId, message: err.message });
            throw err;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  2b. Fetch all attachments for a record
    // ═══════════════════════════════════════════════════════════════════════

    async fetchRecordAttachments(recordId) {
        const token = await auth.getToken();
        try {
            const { data: res } = await axios.get(`${BASE}/Accounts/${recordId}/Attachments`, {
                headers:    { Authorization: `Zoho-oauthtoken ${token}` },
                httpsAgent: zohoHttpsAgent,
                timeout:    15_000,
            });
            logger.info('Accounts: record attachments fetched', { recordId, count: res.data?.length || 0 });
            return res.data || [];
        } catch (err) {
            if (err.response?.status === 204) return [];
            if (err.response?.status === 401) auth.clearToken();
            logger.warn('Accounts: fetchRecordAttachments failed', { recordId, message: err.message });
            return [];
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  2c. Fetch image field attachment IDs
    // ═══════════════════════════════════════════════════════════════════════

    async fetchImageFieldAttachmentIds(recordId) {
        const token = await auth.getToken();

        const IMAGE_FIELDS = ['Upload_Aadhar_Card_File', 'Upload_GPS_Photo', 'Upload_Pan_Card_File'];

        try {
            const { data: res } = await axios.get(`${BASE_V3}/Accounts/${recordId}`, {
                headers:    { Authorization: `Zoho-oauthtoken ${token}` },
                httpsAgent: zohoHttpsAgent,
                timeout:    15_000,
            });

            const record = res.data?.[0] || {};
            const result = {};

            for (const fieldName of IMAGE_FIELDS) {
                const value = record[fieldName];
                if (value && Array.isArray(value) && value.length > 0) {
                    result[fieldName] = value.map(f => ({
                        attachment_Id: f.attachment_Id || f.id,
                        file_Name:     f.File_Name || f.file_Name || `${fieldName}.jpg`,
                        file_Id:       f.File_Id  || f.file_Id,
                    }));
                } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                    result[fieldName] = [{
                        attachment_Id: value.attachment_Id || value.id,
                        file_Name:     value.File_Name || value.file_Name || `${fieldName}.jpg`,
                        file_Id:       value.File_Id  || value.file_Id,
                    }];
                } else {
                    result[fieldName] = null;
                }
            }

            logger.info('Accounts: image field attachment IDs fetched', {
                recordId,
                fields: Object.entries(result).map(([k, v]) => ({
                    field: k, hasData: !!v, attachmentId: v?.[0]?.attachment_Id || null,
                })),
            });

            return result;

        } catch (err) {
            if (err.response?.status === 401) auth.clearToken();
            logger.warn('Accounts: fetchImageFieldAttachmentIds failed', { recordId, message: err.message });
            return {};
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  3. Download a FILE UPLOAD field file
    //     ✅ Skips download if file already exists on disk
    // ═══════════════════════════════════════════════════════════════════════

    async downloadFieldFile(recordId, fileId, fileName, destDir, retries = 3) {
        const token = await auth.getToken();
        await fse.ensureDir(destDir);

        // ── Skip if already exists ──────────────────────────────────────
        const existingFiles = await fse.readdir(destDir).catch(() => []);
        const baseName      = path.parse(fileName).name;
        const alreadyExists = existingFiles.find(f => path.parse(f).name === baseName);

        if (alreadyExists) {
            const existingPath = path.join(destDir, alreadyExists);
            const stat         = await fse.stat(existingPath);
            logger.info('Accounts: file already exists — skipping', { recordId, fileName: alreadyExists });
            return {
                fileId, fileName: alreadyExists,
                filePath: existingPath,
                fileUrl:  buildFileUrl(this.storageRoot, existingPath),
                size:     stat.size,
                status:   'skipped',
            };
        }

        logger.info('Accounts: downloading file_upload field file', { recordId, fileId, fileName });

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await axios.get(`${BASE}/files`, {
                    headers:      { Authorization: `Zoho-oauthtoken ${token}` },
                    httpsAgent:   zohoHttpsAgent,
                    params:       { id: fileId },
                    responseType: 'stream',
                    timeout:      120_000,
                });

                let finalFileName = extractFileName(response.headers['content-disposition'], fileName);
                if (!path.extname(finalFileName)) {
                    const contentType = response.headers['content-type'] || '';
                    const ext = MIME_TO_EXT[contentType.split(';')[0].trim()] || '';
                    if (ext) finalFileName += ext;
                }

                const finalDest = path.join(destDir, finalFileName);

                await new Promise((resolve, reject) => {
                    const writer = fse.createWriteStream(finalDest);
                    response.data.pipe(writer);
                    writer.on('close', resolve);
                    writer.on('error', reject);
                });

                const stat = await fse.stat(finalDest);
                logger.info('Accounts: file_upload field saved', { recordId, fileId, finalFileName, size: stat.size });

                return {
                    fileId, fileName: finalFileName, filePath: finalDest,
                    fileUrl: buildFileUrl(this.storageRoot, finalDest),
                    size: stat.size, status: 'ok',
                };

            } catch (err) {
                if (err.response?.status === 401) auth.clearToken();

                const zohoError   = await parseZohoError(err.response?.data);
                const isRateLimit = err.response?.status === 429 ||
                    (err.response?.status === 400 && JSON.stringify(zohoError).includes('too many requests'));

                if (isRateLimit && attempt < retries) {
                    const wait = attempt * 2000;
                    logger.warn(`Accounts: rate limited, retrying in ${wait}ms`, { recordId, fileId, attempt });
                    await new Promise(r => setTimeout(r, wait));
                    continue;
                }

                const errMsg = err.response?.status === 204 ? 'File not found or empty (204)' : err.message;
                logger.error('Accounts: file_upload download failed', {
                    recordId, fileId, fileName, status: err.response?.status, message: errMsg, attempt, zohoError,
                });

                return { fileId, fileName, filePath: null, fileUrl: null, size: 0, status: 'failed', error: errMsg, zohoError };
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  4. Download an IMAGE UPLOAD field file
    //     ✅ Skips download if file already exists on disk
    // ═══════════════════════════════════════════════════════════════════════

    async downloadImageField(recordId, fieldApiName, attachmentData, destDir, retries = 3) {
        const token = await auth.getToken();
        await fse.ensureDir(destDir);

        if (!attachmentData || (!attachmentData.file_Id && !attachmentData.attachment_Id)) {
            logger.info('Accounts: no file data for image_upload field — empty', { recordId, fieldApiName });
            return [{
                fileId: null, fileName: fieldApiName,
                filePath: null, fileUrl: null, size: 0,
                status: 'no_image', error: 'No image uploaded in this field',
            }];
        }

        const fileId             = attachmentData.file_Id;
        const attachmentId       = attachmentData.attachment_Id;
        const attachmentFileName = attachmentData.file_Name || `${fieldApiName}.jpg`;

        // ── Skip if already exists ──────────────────────────────────────
        const existingFiles = await fse.readdir(destDir).catch(() => []);
        const baseName      = path.parse(attachmentFileName).name;
        const alreadyExists = existingFiles.find(f => path.parse(f).name === baseName);

        if (alreadyExists) {
            const existingPath = path.join(destDir, alreadyExists);
            const stat         = await fse.stat(existingPath);
            logger.info('Accounts: image already exists — skipping', { recordId, fieldApiName, fileName: alreadyExists });
            return [{
                fileId: fileId || attachmentId, fileName: alreadyExists,
                filePath: existingPath,
                fileUrl:  buildFileUrl(this.storageRoot, existingPath),
                size: stat.size, status: 'skipped',
            }];
        }

        logger.info('Accounts: downloading image field', { recordId, fieldApiName, fileId, attachmentId, attachmentFileName });

        // Strategy 1: use File_Id (v3 API provides this)
        if (fileId) {
            return [await this.downloadFieldFile(recordId, fileId, attachmentFileName, destDir, retries)];
        }

        // Strategy 2: fallback to download_fields_attachment
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await axios.get(
                    `${BASE}/Accounts/${recordId}/actions/download_fields_attachment`,
                    {
                        headers:      { Authorization: `Zoho-oauthtoken ${token}` },
                        httpsAgent:   zohoHttpsAgent,
                        params:       { fields_attachment_id: attachmentId },
                        responseType: 'stream',
                        timeout:      120_000,
                    }
                );

                let fileName = extractFileName(response.headers['content-disposition'], attachmentFileName);
                if (!path.extname(fileName)) {
                    const contentType = response.headers['content-type'] || '';
                    const ext = MIME_TO_EXT[contentType.split(';')[0].trim()] || '.jpg';
                    fileName += ext;
                }

                const finalDest = path.join(destDir, fileName);
                await new Promise((resolve, reject) => {
                    const writer = fse.createWriteStream(finalDest);
                    response.data.pipe(writer);
                    writer.on('close', resolve);
                    writer.on('error', reject);
                });

                const stat = await fse.stat(finalDest);
                logger.info('Accounts: image_upload field saved', { recordId, fieldApiName, fileName, size: stat.size });

                return [{
                    fileId: attachmentId, fileName, filePath: finalDest,
                    fileUrl: buildFileUrl(this.storageRoot, finalDest),
                    size: stat.size, status: 'ok',
                }];

            } catch (err) {
                if (err.response?.status === 401) auth.clearToken();

                const zohoError = await parseZohoError(err.response?.data);

                if (err.response?.status === 204) {
                    logger.info('Accounts: image_upload field is empty (204)', { recordId, fieldApiName });
                    return [{
                        fileId: attachmentId, fileName: fieldApiName,
                        filePath: null, fileUrl: null, size: 0,
                        status: 'no_image', error: 'No image uploaded in this field (204)',
                    }];
                }

                const isRateLimit = err.response?.status === 429 ||
                    (err.response?.status === 400 && JSON.stringify(zohoError).includes('too many requests'));

                if (isRateLimit && attempt < retries) {
                    const wait = attempt * 2000;
                    logger.warn(`Accounts: rate limited on image_upload, retrying in ${wait}ms`, { recordId, fieldApiName, attempt });
                    await new Promise(r => setTimeout(r, wait));
                    continue;
                }

                logger.error('Accounts: image_upload download failed', {
                    recordId, fieldApiName, attachmentId,
                    status: err.response?.status, message: err.message, attempt, zohoError,
                });

                return [{
                    fileId: attachmentId, fileName: fieldApiName,
                    filePath: null, fileUrl: null, size: 0,
                    status: 'failed', error: err.message, zohoError,
                }];
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  5. Process all 22 fields for a single record
    //     ✅ PARALLEL downloads (PARALLEL_LIMIT concurrent)
    //     ✅ Skip already-downloaded files
    //     ✅ Files saved flat in account folder (no subfolders)
    // ═══════════════════════════════════════════════════════════════════════

    async processRecordFiles(record) {
        const recordId    = record.id;
        const accountName = record.Account_Name || 'Unknown';
        const sapId       = record.SAP_ID || null;
        const folderName  = sapId || `crm-${recordId}`;

        if (!sapId) logger.warn('Accounts: no SAP_ID, using crm- prefix', { recordId, folderName });

        const destDir = path.join(this.storageRoot, 'Accounts', folderName);
        await fse.ensureDir(destDir);

        logger.info('Accounts: processing all 22 fields (parallel)', { recordId, sapId, accountName, parallelLimit: PARALLEL_LIMIT });

        // Pre-fetch image field IDs (single API call, done once)
        const imageFieldData = await this.fetchImageFieldAttachmentIds(recordId);

        // Build task list — one task per file download
        const tasks = [];

        for (const field of FILE_UPLOAD_FIELDS) {

            if (field.type === 'image_upload') {
                // ── Images saved flat in destDir (no subfolder) ──────────
                const fieldImages = imageFieldData[field.apiName] || null;

                if (fieldImages && fieldImages.length > 0) {
                    for (const imgAttachment of fieldImages) {
                        tasks.push(async () => ({
                            fieldApiName: field.apiName,
                            results: await this.downloadImageField(recordId, field.apiName, imgAttachment, destDir),
                        }));
                    }
                } else {
                    tasks.push(async () => ({
                        fieldApiName: field.apiName,
                        results: [{ fileId: null, fileName: field.apiName, filePath: null, fileUrl: null, size: 0, status: 'no_image', error: 'No image uploaded in this field' }],
                    }));
                }
                continue;
            }

            // FILE UPLOAD — saved flat in destDir (no subfolder)
            const fieldValue = record[field.apiName];

            logger.info('Accounts: field value', {
                recordId, field: field.apiName,
                valueType: fieldValue === null ? 'null' : typeof fieldValue,
                isArray:   Array.isArray(fieldValue),
                value:     fieldValue ? JSON.stringify(fieldValue).slice(0, 200) : null,
            });

            if (!fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0)) {
                tasks.push(async () => ({ fieldApiName: field.apiName, results: [], empty: true }));
                continue;
            }

            const files = Array.isArray(fieldValue) ? fieldValue
                        : typeof fieldValue === 'object' ? [fieldValue]
                        : [{ file_Id: String(fieldValue), file_Name: `${field.apiName}` }];

            for (const file of files) {
                const fileId   = file.file_Id || file.id || file.attachment_Id || file.encrypted_id;
                const fileName = file.file_Name || file.File_Name || file.name || `${field.apiName}_${fileId}`;

                if (!fileId) {
                    tasks.push(async () => ({
                        fieldApiName: field.apiName,
                        results: [{ fileId: null, fileName, filePath: null, fileUrl: null, status: 'failed', error: 'File entry has no ID — cannot download' }],
                    }));
                    continue;
                }

                tasks.push(async () => ({
                    fieldApiName: field.apiName,
                    results: [await this.downloadFieldFile(recordId, fileId, fileName, destDir)],
                }));
            }
        }

        // Run all tasks in parallel with concurrency limit
        logger.info('Accounts: starting parallel downloads', { recordId, taskCount: tasks.length, parallelLimit: PARALLEL_LIMIT });
        const taskOutputs = await runWithConcurrency(tasks, PARALLEL_LIMIT);

        // Aggregate results per field
        const fieldMap = new Map();
        for (const field of FILE_UPLOAD_FIELDS) {
            fieldMap.set(field.apiName, { field, allResults: [], empty: false });
        }

        for (const output of taskOutputs) {
            const entry = fieldMap.get(output.fieldApiName);
            if (!entry) continue;
            if (output.empty) { entry.empty = true; }
            else { entry.allResults.push(...output.results); }
        }

        const fieldResults = [];
        let totalFiles = 0, successCount = 0, failCount = 0, emptyCount = 0;

        for (const field of FILE_UPLOAD_FIELDS) {
            const entry   = fieldMap.get(field.apiName);
            const results = entry.allResults;

            if (entry.empty || results.length === 0 || results.every(r => r.status === 'no_image')) {
                emptyCount++;
                fieldResults.push({
                    fieldApiName: field.apiName, fieldLabel: field.label, fieldType: field.type,
                    status: 'empty',
                    message: field.type === 'image_upload' ? 'No image uploaded in this field' : 'No file uploaded in this field',
                    files: [],
                });
                continue;
            }

            const okCount     = results.filter(r => r.status === 'ok' || r.status === 'skipped').length;
            const failedCount = results.filter(r => r.status === 'failed').length;

            totalFiles   += results.length;
            successCount += okCount;
            failCount    += failedCount;

            fieldResults.push({
                fieldApiName: field.apiName, fieldLabel: field.label, fieldType: field.type,
                status:    failedCount === 0 ? 'ok' : 'partial',
                fileCount: results.length,
                files:     results,
            });
        }

        const baseUrl        = env.PUBLIC_BASE_URL || 'https://zoho.gharda.com:14443/production';
        const publicUrl      = `${baseUrl}/storage/Accounts/${folderName}`;
        const statusApiCheck = totalFiles > 0 && failCount === 0;

        return {
            recordId, sapId: folderName, accountName,
            status_api_check: statusApiCheck,
            storage_url:      publicUrl,
            summary: {
                total_fields:      FILE_UPLOAD_FIELDS.length,
                fields_with_files: FILE_UPLOAD_FIELDS.length - emptyCount,
                fields_empty:      emptyCount,
                total_files:       totalFiles,
                downloaded:        successCount,
                failed:            failCount,
            },
            fields: fieldResults,
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  6. Process ALL approved accounts (bulk sync)
    // ═══════════════════════════════════════════════════════════════════════

    async processAllApproved() {
        const accounts = await this.fetchApprovedAccounts();

        if (!accounts.length) {
            return { status_api_check: false, message: 'No approved accounts found', total_accounts: 0, results: [] };
        }

        logger.info('Accounts: bulk sync started', { count: accounts.length });

        const results  = [];
        let allSuccess = true;

        for (const account of accounts) {
            try {
                const result = await this.processRecordFiles(account);
                results.push(result);
                if (!result.status_api_check) allSuccess = false;
            } catch (err) {
                logger.error('Accounts: failed to process record', { recordId: account.id, error: err.message });
                results.push({
                    recordId: account.id, sapId: account.SAP_ID || `crm-${account.id}`,
                    accountName: account.Account_Name || 'Unknown',
                    status_api_check: false, error: err.message,
                });
                allSuccess = false;
            }
        }

        return {
            status_api_check:    allSuccess,
            total_accounts:      accounts.length,
            successful_accounts: results.filter(r => r.status_api_check).length,
            failed_accounts:     results.filter(r => !r.status_api_check).length,
            results,
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  7. Process a single account by record ID
    // ═══════════════════════════════════════════════════════════════════════

    async processSingleAccount(recordId) {
        const record = await this.fetchAccountById(recordId);

        if (!record) {
            return { status_api_check: false, error: { code: 'NOT_FOUND', message: `Account ${recordId} not found.` } };
        }

        if (record.Status !== 'Approved') {
            return {
                status_api_check: false, recordId,
                sapId: record.SAP_ID || `crm-${record.id}`,
                accountName: record.Account_Name || 'Unknown',
                error: { code: 'NOT_APPROVED', message: `Account status is "${record.Status || 'null'}", expected "Approved".` },
            };
        }

        return this.processRecordFiles(record);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  8. Download a single specific field for one account
    //     ✅ Files saved flat in account folder (no subfolders)
    // ═══════════════════════════════════════════════════════════════════════

    async downloadSingleField(recordId, fieldName) {
        const fieldDef = FILE_UPLOAD_FIELDS.find(f => f.apiName === fieldName);
        if (!fieldDef) {
            return { error: { code: 'INVALID_FIELD', message: `"${fieldName}" is not a valid File Upload field.` } };
        }

        const record = await this.fetchAccountById(recordId);
        if (!record) {
            return { error: { code: 'NOT_FOUND', message: `Account ${recordId} not found.` } };
        }

        const folderName = record.SAP_ID || `crm-${record.id}`;
        // ── Save flat in account folder, no fieldName subfolder ──────────
        const destDir = path.join(this.storageRoot, 'Accounts', folderName);

        logger.info('AccountFileUploadService: downloadSingleField', { recordId, fieldName, type: fieldDef.type });

        let results;

        if (fieldDef.type === 'image_upload') {
            const imageFieldData = await this.fetchImageFieldAttachmentIds(recordId);
            const fieldImages    = imageFieldData[fieldName] || null;

            results = [];
            if (fieldImages && fieldImages.length > 0) {
                for (const imgAttachment of fieldImages) {
                    const res = await this.downloadImageField(recordId, fieldName, imgAttachment, destDir);
                    results.push(...res);
                }
            } else {
                results = [{ fileId: null, fileName: fieldName, filePath: null, fileUrl: null, size: 0, status: 'no_image', error: 'No image uploaded in this field' }];
            }
        } else {
            const value = record[fieldName];

            if (!value || (Array.isArray(value) && value.length === 0)) {
                return { status_api_check: true, recordId, fieldName, message: `Field "${fieldName}" has no file — nothing to download.` };
            }

            const files = Array.isArray(value) ? value : [value];
            results     = [];

            for (const file of files) {
                const fileId   = file.file_Id || file.id || file.attachment_Id || file.encrypted_id;
                const fileName = file.file_Name || file.File_Name || file.name || `${fieldName}_${fileId}`;
                const result   = await this.downloadFieldFile(recordId, fileId, fileName, destDir);
                results.push(result);
            }
        }

        const allOk = results.every(r => r.status === 'ok' || r.status === 'skipped');

        return {
            status_api_check: allOk,
            recordId, accountName: record.Account_Name, sapId: folderName,
            fieldName, fieldLabel: fieldDef.label, fieldType: fieldDef.type,
            fileCount: results.filter(r => r.status === 'ok' || r.status === 'skipped').length,
            files: results,
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  9. Upload a file into a specific field
    //     ✅ Saved flat in account folder (no subfolder)
    // ═══════════════════════════════════════════════════════════════════════

    async uploadFieldFile(recordId, fieldName, file) {
        const fieldDef = FILE_UPLOAD_FIELDS.find(f => f.apiName === fieldName);
        if (!fieldDef) {
            return { status_api_check: false, error: { code: 'INVALID_FIELD', message: `"${fieldName}" is not a valid File Upload field.` } };
        }

        const record = await this.fetchAccountById(recordId);
        if (!record) {
            return { status_api_check: false, error: { code: 'NOT_FOUND', message: `Account ${recordId} not found.` } };
        }

        const token      = await auth.getToken();
        const folderName = record.SAP_ID || `crm-${record.id}`;

        logger.info('AccountFileUploadService: uploadFieldFile', { recordId, fieldName, fileName: file.originalname });

        const FormData = (await import('form-data')).default;
        const form = new FormData();
        form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });

        let zohoResp;
        try {
            const { data } = await axios.post(
                `${BASE}/Accounts/${recordId}/actions/upload_fields_attachment?fields_attachment_id=${fieldName}`,
                form,
                { headers: { Authorization: `Zoho-oauthtoken ${token}`, ...form.getHeaders() }, httpsAgent: zohoHttpsAgent, timeout: 60_000 }
            );
            zohoResp = data;
        } catch (err) {
            if (err.response?.status === 401) auth.clearToken();
            logger.error('AccountFileUploadService: Zoho upload failed', { recordId, fieldName, message: err.message });
            return { status_api_check: false, error: { code: 'ZOHO_UPLOAD_FAILED', message: err.message, zoho: err.response?.data } };
        }

        // ── Save flat in account folder (no subfolder) ────────────────────
        const dir  = path.join(this.storageRoot, 'Accounts', folderName);
        const dest = path.join(dir, file.originalname);
        await fse.ensureDir(dir);
        await fse.writeFile(dest, file.buffer);

        const baseUrl    = env.PUBLIC_BASE_URL || 'https://zoho.gharda.com:14443/production';
        const storageUrl = `${baseUrl}/storage/Accounts/${folderName}/${encodeURIComponent(file.originalname)}`;

        return {
            status_api_check: true, recordId,
            accountName: record.Account_Name, sapId: folderName,
            fieldName, fieldLabel: fieldDef.label,
            fileName: file.originalname, size: file.size,
            localPath: dest, storageUrl, zohoResponse: zohoResp,
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  10. Scan local storage — list all downloaded account folders
    // ═══════════════════════════════════════════════════════════════════════

    async listDownloadedAccounts() {
        const accountsDir = path.join(this.storageRoot, 'Accounts');
        if (!await fse.pathExists(accountsDir)) return [];

        const entries = await fse.readdir(accountsDir, { withFileTypes: true });
        const results = [];

        for (const folder of entries.filter(e => e.isDirectory())) {
            const folderPath = path.join(accountsDir, folder.name);
            const stats      = await this._scanFolder(folderPath);
            results.push({ sapId: folder.name, path: `/storage/Accounts/${folder.name}`, ...stats });
        }

        return results;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  11. Scan local storage — list all files for a specific account
    //      ✅ Supports both flat files and legacy subfolders
    // ═══════════════════════════════════════════════════════════════════════

    async listDownloadedFiles(sapId) {
        const accountDir = path.join(this.storageRoot, 'Accounts', sapId);
        if (!await fse.pathExists(accountDir)) return null;

        const entries  = await fse.readdir(accountDir, { withFileTypes: true });
        const fields   = [];
        let totalFiles = 0, totalSize = 0;

        for (const entry of entries) {
            if (entry.isFile()) {
                // ── Flat file (new structure) ─────────────────────────────
                const stat     = await fse.stat(path.join(accountDir, entry.name));
                const fieldDef = FILE_UPLOAD_FIELDS.find(f => f.apiName === entry.name);

                totalFiles++;
                totalSize += stat.size;

                fields.push({
                    fieldApiName: entry.name,
                    fieldLabel:   fieldDef?.label || entry.name,
                    fieldType:    fieldDef?.type  || 'unknown',
                    fileCount:    1,
                    files: [{
                        name:     entry.name,
                        size:     stat.size,
                        modified: stat.mtime,
                        url:      `/storage/Accounts/${sapId}/${encodeURIComponent(entry.name)}`,
                    }],
                });

            } else if (entry.isDirectory()) {
                // ── Legacy subfolder (old structure — backwards compat) ────
                const fieldPath = path.join(accountDir, entry.name);
                const files     = await fse.readdir(fieldPath, { withFileTypes: true });
                const fileList  = [];

                for (const f of files.filter(e => e.isFile())) {
                    const stat = await fse.stat(path.join(fieldPath, f.name));
                    fileList.push({
                        name:     f.name,
                        size:     stat.size,
                        modified: stat.mtime,
                        url:      `/storage/Accounts/${sapId}/${entry.name}/${encodeURIComponent(f.name)}`,
                    });
                    totalFiles++;
                    totalSize += stat.size;
                }

                const fieldDef = FILE_UPLOAD_FIELDS.find(f => f.apiName === entry.name);
                fields.push({
                    fieldApiName: entry.name,
                    fieldLabel:   fieldDef?.label || entry.name,
                    fieldType:    fieldDef?.type  || 'unknown',
                    fileCount:    fileList.length,
                    files:        fileList,
                });
            }
        }

        return { sapId, totalFiles, totalSize, fields };
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  12. Scan a folder — supports both flat files and legacy subfolders
    // ═══════════════════════════════════════════════════════════════════════

    async _scanFolder(folderPath) {
        let fileCount = 0, totalSize = 0;
        const entries = await fse.readdir(folderPath, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isFile()) {
                // Flat file (new structure)
                const stat = await fse.stat(path.join(folderPath, entry.name));
                fileCount++;
                totalSize += stat.size;
            } else if (entry.isDirectory()) {
                // Subfolder (old structure — backwards compat)
                const files = await fse.readdir(path.join(folderPath, entry.name), { withFileTypes: true });
                for (const f of files.filter(e => e.isFile())) {
                    const stat = await fse.stat(path.join(folderPath, entry.name, f.name));
                    fileCount++;
                    totalSize += stat.size;
                }
            }
        }

        return { fileCount, totalSize };
    }

    getFieldDefinitions() {
        return FILE_UPLOAD_FIELDS;
    }
}

export default new AccountFileUploadService();