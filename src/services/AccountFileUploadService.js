import axios from 'axios';
import fse from 'fs-extra';
import path from 'path';
import { env, zohoHttpsAgent } from '../config/env.js';
import logger from '../utils/logger.js';
import auth from './ZohoAuthService.js';

const BASE = `${env.ZOHO_API_DOMAIN}/crm/v2`;

// ── All 22 File Upload + Image Upload fields in Distributor layout ──────────
const FILE_UPLOAD_FIELDS = [
    { apiName: 'Official_E_Mail_ID_Contact_No_On_Letter_Head', label: 'Official Email & Contact on Letterhead', type: 'file_upload' },
    { apiName: 'Pesticide_Liscense',                           label: 'Pesticide License',                      type: 'file_upload' },
    { apiName: 'Upload_Account_Verification_Cheque_Rs_100',    label: 'Account Verification Cheque',            type: 'file_upload' },
    { apiName: 'Upload_Address_Proof',                         label: 'Address Proof',                          type: 'file_upload' },
    { apiName: 'Upload_appraisal_Form',                        label: 'Appraisal Form',                         type: 'file_upload' },
    { apiName: 'Upload_Bank_Certificate_for_Bank_Account_Confirmat', label: 'Bank Certificate',                 type: 'file_upload' },
    { apiName: 'Upload_Bank_Cheque',                           label: 'Bank Cheque',                            type: 'file_upload' },
    { apiName: 'Business_Report',                              label: 'Business Planning Sheet',                type: 'file_upload' },
    { apiName: 'Upload_declaration_of_detail_Information',     label: 'Declaration of Detail Information',      type: 'file_upload' },
    { apiName: 'Distributor_Agreement',                        label: 'Distributor Agreement Form',             type: 'file_upload' },
    { apiName: 'Upload_distributor_Strength_Analysis_Report',  label: 'Distributor Strength Analysis Report',   type: 'file_upload' },
    { apiName: 'Upload_Fertilizer_License',                    label: 'Fertilizer License',                     type: 'file_upload' },
    { apiName: 'Upload_GSTIN_Certificate',                     label: 'GSTIN Certificate',                      type: 'file_upload' },
    { apiName: 'Upload_last_Two_Year_Balance_Sheet_Net_Worth', label: 'Balance Sheet / Net Worth',              type: 'file_upload' },
    { apiName: 'Upload_Last_Two_Year_ITR_Net_Worth_Certificate', label: 'ITR / Net Worth Certificate',          type: 'file_upload' },
    { apiName: 'Upload_Last_Two_Year_Profit_Loss_Account_Net_W', label: 'Profit & Loss Account',               type: 'file_upload' },
    { apiName: 'Upload_Partnership_Agreement_Proprietorship_Deed', label: 'Partnership Agreement / Deed',       type: 'file_upload' },
    { apiName: 'Upload_proof_of_security_Deposit',             label: 'Proof of Security Deposit',              type: 'file_upload' },
    { apiName: 'Upload_two_Blank_Letterhead_Signed',           label: 'Two Blank Letterhead Signed',            type: 'file_upload' },
    // Image Upload fields
    { apiName: 'Upload_Aadhar_Card_File',                      label: 'Aadhar Card',                            type: 'image_upload' },
    { apiName: 'Upload_GPS_Photo',                             label: 'GPS Photo',                              type: 'image_upload' },
    { apiName: 'Upload_Pan_Card_File',                         label: 'Pan Card',                               type: 'image_upload' },
];

// ── MIME type → extension mapping for files that arrive without a good name ─
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

// ── Helper: convert local file path → public HTTPS URL ──────────────────────
function buildFileUrl(storageRoot, filePath) {
    const baseUrl  = env.PUBLIC_BASE_URL || `https://zoho.gharda.com:14443/production`;
    const relative = path.relative(storageRoot, filePath).replace(/\\/g, '/');
    return `${baseUrl}/storage/${relative}`;
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
                // Use search API with criteria for Status = Approved
                const { data: res } = await axios.get(`${BASE}/Accounts/search`, {
                    headers:    { Authorization: `Zoho-oauthtoken ${token}` },
                    httpsAgent: zohoHttpsAgent,
                    params:     {
                        criteria: '(Status:equals:Approved)',
                        page,
                        per_page: 200,
                    },
                    timeout: 60_000,
                });

                const records = res.data || [];
                all.push(...records);
                hasMore = res.info?.more_records === true;
                page++;

                logger.info('Accounts: fetched page', { page: page - 1, count: records.length, total: all.length });

            } catch (err) {
                // 204 = no records found
                if (err.response?.status === 204) {
                    logger.info('Accounts: no approved records found');
                    return [];
                }
                if (err.response?.status === 401) auth.clearToken();
                logger.error('Accounts: fetch failed', {
                    page, status: err.response?.status,
                    message: err.message, code: err.code,
                });
                throw err;
            }
        }

        logger.info('Accounts: total approved records', { count: all.length });
        return all;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  2. Fetch a single account by ID
    // ═══════════════════════════════════════════════════════════════════════

    async fetchAccountById(recordId) {
        const token = await auth.getToken();

        logger.info('Accounts: fetching single record', { recordId });

        try {
            const { data: res } = await axios.get(`${BASE}/Accounts/${recordId}`, {
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
    //  3. Download a single file from a File Upload field
    // ═══════════════════════════════════════════════════════════════════════

    async downloadFieldFile(recordId, fileId, fileName, destDir, retries = 3) {
        const token = await auth.getToken();

        await fse.ensureDir(destDir);

        logger.info('Accounts: downloading field file', { recordId, fileId, fileName });

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await axios.get(
                    `${BASE}/files`,
                    {
                        headers:      { Authorization: `Zoho-oauthtoken ${token}` },
                        httpsAgent:   zohoHttpsAgent,
                        params:       { id: fileId },
                        responseType: 'stream',
                        timeout:      120_000,
                    },
                );

            // Try to get a better filename from content-disposition header
            let finalFileName = fileName;
            const disposition = response.headers['content-disposition'];
            if (disposition) {
                // Handle RFC 5987 format: filename*=UTF-8''encoded_name
                const rfc5987Match = disposition.match(/filename\*\s*=\s*UTF-8''(.+?)(?:;|$)/i);
                if (rfc5987Match?.[1]) {
                    try {
                        finalFileName = decodeURIComponent(rfc5987Match[1].trim());
                    } catch {
                        finalFileName = rfc5987Match[1].trim();
                    }
                } else {
                    // Fallback: standard filename="name" or filename=name
                    const stdMatch = disposition.match(/filename\s*=\s*"?([^";\n]+)"?/i);
                    if (stdMatch?.[1] && !stdMatch[1].startsWith("UTF-8")) {
                        finalFileName = stdMatch[1].trim();
                    }
                }
            }

            // If filename has no extension, try to infer from content-type
            if (!path.extname(finalFileName)) {
                const contentType = response.headers['content-type'] || '';
                const ext = MIME_TO_EXT[contentType.split(';')[0].trim()] || '';
                if (ext) finalFileName += ext;
            }

            const finalDest = path.join(destDir, finalFileName);

            // Pipe stream → file
            await new Promise((resolve, reject) => {
                const writer = fse.createWriteStream(finalDest);
                response.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const stat = await fse.stat(finalDest);

            logger.info('Accounts: field file saved', { recordId, fileId, finalFileName, size: stat.size });

            return {
                fileId,
                fileName: finalFileName,
                filePath: finalDest,
                fileUrl:  buildFileUrl(this.storageRoot, finalDest),  // ← public URL
                size:     stat.size,
                status:   'ok',
            };

        } catch (err) {
            if (err.response?.status === 401) auth.clearToken();

            // Capture Zoho's actual error response for debugging
            let zohoError = null;
            if (err.response?.data) {
                if (typeof err.response.data.read === 'function') {
                    try {
                        const chunks = [];
                        for await (const chunk of err.response.data) {
                            chunks.push(chunk);
                        }
                        const body = Buffer.concat(chunks).toString('utf-8');
                        try { zohoError = JSON.parse(body); } catch { zohoError = body; }
                    } catch { zohoError = 'Could not read stream'; }
                } else {
                    zohoError = err.response.data;
                }
            }

            // Retry on rate limit (400 with "too many requests" or 429)
            const isRateLimit = err.response?.status === 429 ||
                (err.response?.status === 400 && JSON.stringify(zohoError).includes('too many requests'));

            if (isRateLimit && attempt < retries) {
                const wait = attempt * 3000;  // 3s, 6s, 9s
                logger.warn(`Accounts: rate limited, retrying in ${wait}ms`, { recordId, fileId, attempt, retries });
                await new Promise(r => setTimeout(r, wait));
                continue;  // retry the for loop
            }

            const errMsg = err.response?.status === 204
                ? 'File not found or empty (204)'
                : err.message;

            logger.error('Accounts: field file download failed', {
                recordId, fileId, fileName,
                url:      `${BASE}/files?id=${fileId}`,
                status:   err.response?.status,
                message:  errMsg,
                code:     err.code,
                attempt,
                zohoError,
            });

            return {
                fileId,
                fileName,
                filePath:  null,
                fileUrl:   null,
                size:      0,
                status:    'failed',
                error:     errMsg,
                zohoError,
            };
        }
        }  // end retry loop
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  3b. Download an Image Upload field (different API than File Upload)
    //      Image Upload fields don't return file IDs in the record data.
    //      We use the photo download endpoint with the field API name.
    // ═══════════════════════════════════════════════════════════════════════

    async downloadImageField(recordId, fieldApiName, destDir, retries = 3) {
        const token = await auth.getToken();

        await fse.ensureDir(destDir);

        logger.info('Accounts: downloading image field', { recordId, fieldApiName });

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                // Try the photo endpoint with field_id parameter
                const response = await axios.get(
                    `${BASE}/Accounts/${recordId}/photo`,
                    {
                        headers:      { Authorization: `Zoho-oauthtoken ${token}` },
                        httpsAgent:   zohoHttpsAgent,
                        params:       { field_id: fieldApiName },
                        responseType: 'stream',
                        timeout:      120_000,
                    },
                );

                // Get filename from content-disposition or use field name
                let fileName = `${fieldApiName}`;
                const disposition = response.headers['content-disposition'];
                if (disposition) {
                    const rfc5987Match = disposition.match(/filename\*\s*=\s*UTF-8''(.+?)(?:;|$)/i);
                    if (rfc5987Match?.[1]) {
                        try { fileName = decodeURIComponent(rfc5987Match[1].trim()); } catch { }
                    } else {
                        const stdMatch = disposition.match(/filename\s*=\s*"?([^";\n]+)"?/i);
                        if (stdMatch?.[1] && !stdMatch[1].startsWith("UTF-8")) {
                            fileName = stdMatch[1].trim();
                        }
                    }
                }

                // If no extension, infer from content-type
                if (!path.extname(fileName)) {
                    const contentType = response.headers['content-type'] || '';
                    const ext = MIME_TO_EXT[contentType.split(';')[0].trim()] || '.jpg';
                    fileName += ext;
                }

                const finalDest = path.join(destDir, fileName);

                await new Promise((resolve, reject) => {
                    const writer = fse.createWriteStream(finalDest);
                    response.data.pipe(writer);
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                const stat = await fse.stat(finalDest);

                logger.info('Accounts: image field saved', { recordId, fieldApiName, fileName, size: stat.size });

                return {
                    fileId:   fieldApiName,
                    fileName,
                    filePath: finalDest,
                    fileUrl:  buildFileUrl(this.storageRoot, finalDest),  // ← public URL
                    size:     stat.size,
                    status:   'ok',
                };

            } catch (err) {
                if (err.response?.status === 401) auth.clearToken();

                let zohoError = null;
                if (err.response?.data) {
                    if (typeof err.response.data.read === 'function') {
                        try {
                            const chunks = [];
                            for await (const chunk of err.response.data) { chunks.push(chunk); }
                            const body = Buffer.concat(chunks).toString('utf-8');
                            try { zohoError = JSON.parse(body); } catch { zohoError = body; }
                        } catch { zohoError = 'Could not read stream'; }
                    } else {
                        zohoError = err.response.data;
                    }
                }

                // Retry on rate limit
                const isRateLimit = err.response?.status === 429 ||
                    (err.response?.status === 400 && JSON.stringify(zohoError).includes('too many requests'));

                if (isRateLimit && attempt < retries) {
                    const wait = attempt * 3000;
                    logger.warn(`Accounts: image rate limited, retrying in ${wait}ms`, { recordId, fieldApiName, attempt });
                    await new Promise(r => setTimeout(r, wait));
                    continue;
                }

                // 204 = no photo/image exists
                if (err.response?.status === 204) {
                    logger.info('Accounts: no image in field (204)', { recordId, fieldApiName });
                    return {
                        fileId:   fieldApiName,
                        fileName: fieldApiName,
                        filePath: null,
                        fileUrl:  null,
                        size:     0,
                        status:   'no_image',
                        error:    'No image uploaded in this field (204)',
                    };
                }

                logger.error('Accounts: image field download failed', {
                    recordId, fieldApiName,
                    url:     `${BASE}/Accounts/${recordId}/photo?field_id=${fieldApiName}`,
                    status:  err.response?.status,
                    message: err.message,
                    attempt,
                    zohoError,
                });

                return {
                    fileId:   fieldApiName,
                    fileName: fieldApiName,
                    filePath: null,
                    fileUrl:  null,
                    size:     0,
                    status:   'failed',
                    error:    err.message,
                    zohoError,
                };
            }
        }  // end retry loop
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  4. Process all File Upload fields for a single record
    // ═══════════════════════════════════════════════════════════════════════

    async processRecordFiles(record) {
        const recordId    = record.id;
        const accountName = record.Account_Name || 'Unknown';
        const sapId       = record.SAP_ID || null;

        // Folder name: SAP_ID if available, otherwise crm-{recordId}
        const folderName = sapId || `crm-${recordId}`;

        if (!sapId) {
            logger.warn('Accounts: no SAP_ID found, using crm- prefix', { recordId, folderName });
        }

        const destDir = path.join(this.storageRoot, 'Accounts', folderName);

        await fse.ensureDir(destDir);

        logger.info('Accounts: processing file uploads', { recordId, sapId, accountName, destDir });

        const fieldResults = [];
        let totalFiles     = 0;
        let successCount   = 0;
        let failCount      = 0;
        let emptyCount     = 0;

        for (const field of FILE_UPLOAD_FIELDS) {
            const fieldValue = record[field.apiName];

            // Debug: log what each field returns
            logger.info('Accounts: field value', {
                recordId,
                field: field.apiName,
                type: field.type,
                valueType: fieldValue === null ? 'null' : typeof fieldValue,
                isArray: Array.isArray(fieldValue),
                value: fieldValue ? JSON.stringify(fieldValue).slice(0, 200) : null,
            });

            // ── Image Upload fields: don't return data in record API ────────
            //    Try downloading via photo endpoint regardless of field value
            if (field.type === 'image_upload') {
                totalFiles++;

                if (totalFiles > 1) {
                    await new Promise(r => setTimeout(r, 2000));
                }

                const fieldDir = path.join(destDir, field.apiName);
                const result   = await this.downloadImageField(recordId, field.apiName, fieldDir);

                if (result.status === 'ok') {
                    successCount++;
                    fieldResults.push({
                        fieldApiName: field.apiName,
                        fieldLabel:   field.label,
                        fieldType:    field.type,
                        status:       'ok',
                        fileCount:    1,
                        files:        [result],
                    });
                } else if (result.status === 'no_image') {
                    emptyCount++;
                    fieldResults.push({
                        fieldApiName: field.apiName,
                        fieldLabel:   field.label,
                        fieldType:    field.type,
                        status:       'empty',
                        message:      'No image uploaded in this field',
                        files:        [],
                    });
                    totalFiles--; // don't count as a file
                } else {
                    failCount++;
                    fieldResults.push({
                        fieldApiName: field.apiName,
                        fieldLabel:   field.label,
                        fieldType:    field.type,
                        status:       'failed',
                        fileCount:    1,
                        files:        [result],
                    });
                }
                continue;
            }

            // ── Field is null/empty — no file uploaded ──────────────────
            if (!fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0)) {
                fieldResults.push({
                    fieldApiName: field.apiName,
                    fieldLabel:   field.label,
                    fieldType:    field.type,
                    status:       'empty',
                    message:      'No file uploaded in this field',
                    files:        [],
                });
                emptyCount++;
                continue;
            }

            // ── Normalize to array (some fields return object, some array, some string) ─
            let files;
            if (Array.isArray(fieldValue)) {
                files = fieldValue;
            } else if (typeof fieldValue === 'string') {
                files = [{ id: fieldValue, file_Name: `${field.apiName}` }];
            } else if (typeof fieldValue === 'object' && fieldValue !== null) {
                files = [fieldValue];
            } else {
                files = [{ id: String(fieldValue), file_Name: `${field.apiName}` }];
            }

            const fieldFiles = [];

            for (const file of files) {
                const fileId   = file.id || file.file_Id || file.attachment_Id || file.encrypted_id;
                const fileName = file.file_Name || file.File_Name || file.name || `${field.apiName}_${fileId}`;

                if (!fileId) {
                    logger.warn('Accounts: file entry has no ID', { recordId, field: field.apiName, file });
                    fieldFiles.push({
                        fileId:   null,
                        fileName: fileName,
                        filePath: null,
                        fileUrl:  null,
                        status:   'failed',
                        error:    'File entry has no ID — cannot download',
                    });
                    failCount++;
                    totalFiles++;
                    continue;
                }

                totalFiles++;

                // Rate limit protection — wait between downloads
                if (totalFiles > 1) {
                    await new Promise(r => setTimeout(r, 2000));
                }

                // Create subfolder per field for organization
                const fieldDir = path.join(destDir, field.apiName);
                const result   = await this.downloadFieldFile(recordId, fileId, fileName, fieldDir);

                if (result.status === 'ok') {
                    successCount++;
                } else {
                    failCount++;
                }

                fieldFiles.push(result);
            }

            fieldResults.push({
                fieldApiName: field.apiName,
                fieldLabel:   field.label,
                fieldType:    field.type,
                status:       fieldFiles.every(f => f.status === 'ok') ? 'ok' : 'partial',
                fileCount:    fieldFiles.length,
                files:        fieldFiles,
            });
        }

        // ── Build public storage URL ────────────────────────────────────
        const baseUrl   = env.PUBLIC_BASE_URL || `https://zoho.gharda.com:14443/production`;
        const publicUrl = `${baseUrl}/storage/Accounts/${folderName}`;

        // ── status_api_check: true only if ALL present files downloaded OK ─
        const statusApiCheck = totalFiles > 0 && failCount === 0;

        return {
            recordId,
            sapId:      folderName,
            accountName,
            status_api_check: statusApiCheck,
            storage_url:      publicUrl,
            summary: {
                total_fields:       FILE_UPLOAD_FIELDS.length,
                fields_with_files:  FILE_UPLOAD_FIELDS.length - emptyCount,
                fields_empty:       emptyCount,
                total_files:        totalFiles,
                downloaded:         successCount,
                failed:             failCount,
            },
            fields: fieldResults,
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  5. Process ALL approved accounts
    // ═══════════════════════════════════════════════════════════════════════

    async processAllApproved() {
        const accounts = await this.fetchApprovedAccounts();

        if (!accounts.length) {
            return {
                status_api_check: false,
                message:          'No approved accounts found',
                total_accounts:   0,
                results:          [],
            };
        }

        logger.info('Accounts: processing file uploads for all approved', { count: accounts.length });

        const results = [];
        let allSuccess = true;

        for (const account of accounts) {
            try {
                const result = await this.processRecordFiles(account);
                results.push(result);
                if (!result.status_api_check) allSuccess = false;
            } catch (err) {
                logger.error('Accounts: failed to process record', {
                    recordId:    account.id,
                    accountName: account.Account_Name,
                    error:       err.message,
                });
                results.push({
                    recordId:         account.id,
                    sapId:            account.SAP_ID || `crm-${account.id}`,
                    accountName:      account.Account_Name || 'Unknown',
                    status_api_check: false,
                    error:            err.message,
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
    //  6. Process a single account by record ID
    // ═══════════════════════════════════════════════════════════════════════

    async processSingleAccount(recordId) {
        const record = await this.fetchAccountById(recordId);

        if (!record) {
            return {
                status_api_check: false,
                error: { code: 'NOT_FOUND', message: `Account ${recordId} not found.` },
            };
        }

        // Check status
        if (record.Status !== 'Approved') {
            return {
                status_api_check: false,
                recordId,
                sapId:       record.SAP_ID || `crm-${record.id}`,
                accountName: record.Account_Name || 'Unknown',
                error: {
                    code:    'NOT_APPROVED',
                    message: `Account status is "${record.Status || 'null'}", expected "Approved".`,
                },
            };
        }

        return this.processRecordFiles(record);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  7. Scan local storage — list all downloaded account folders
    // ═══════════════════════════════════════════════════════════════════════

    async listDownloadedAccounts() {
        const accountsDir = path.join(this.storageRoot, 'Accounts');

        if (!await fse.pathExists(accountsDir)) return [];

        const entries = await fse.readdir(accountsDir, { withFileTypes: true });
        const folders = entries.filter(e => e.isDirectory());

        const results = [];

        for (const folder of folders) {
            const folderPath = path.join(accountsDir, folder.name);
            const stats      = await this._scanFolder(folderPath);

            results.push({
                sapId:     folder.name,
                path:      `/storage/Accounts/${folder.name}`,
                ...stats,
            });
        }

        return results;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  8. Scan local storage — list all files for a specific account
    // ═══════════════════════════════════════════════════════════════════════

    async listDownloadedFiles(sapId) {
        const accountDir = path.join(this.storageRoot, 'Accounts', sapId);

        if (!await fse.pathExists(accountDir)) return null;

        const fieldFolders = await fse.readdir(accountDir, { withFileTypes: true });
        const fields       = [];
        let totalFiles     = 0;
        let totalSize      = 0;

        for (const ff of fieldFolders.filter(e => e.isDirectory())) {
            const fieldPath = path.join(accountDir, ff.name);
            const files     = await fse.readdir(fieldPath, { withFileTypes: true });
            const fileList  = [];

            for (const f of files.filter(e => e.isFile())) {
                const stat = await fse.stat(path.join(fieldPath, f.name));
                fileList.push({
                    name:     f.name,
                    size:     stat.size,
                    modified: stat.mtime,
                    url:      `/storage/Accounts/${sapId}/${ff.name}/${encodeURIComponent(f.name)}`,
                });
                totalFiles++;
                totalSize += stat.size;
            }

            // Find the label from FILE_UPLOAD_FIELDS
            const fieldDef = FILE_UPLOAD_FIELDS.find(f => f.apiName === ff.name);

            fields.push({
                fieldApiName: ff.name,
                fieldLabel:   fieldDef?.label || ff.name,
                fieldType:    fieldDef?.type || 'unknown',
                fileCount:    fileList.length,
                files:        fileList,
            });
        }

        return { sapId, totalFiles, totalSize, fields };
    }

    // ── Private: count files and size in a folder tree ──────────────────
    async _scanFolder(folderPath) {
        let fileCount = 0;
        let totalSize = 0;

        const subfolders = await fse.readdir(folderPath, { withFileTypes: true });

        for (const sf of subfolders.filter(e => e.isDirectory())) {
            const files = await fse.readdir(path.join(folderPath, sf.name), { withFileTypes: true });
            for (const f of files.filter(e => e.isFile())) {
                const stat = await fse.stat(path.join(folderPath, sf.name, f.name));
                fileCount++;
                totalSize += stat.size;
            }
        }

        return { fileCount, totalSize };
    }

    // ── Expose fields list for pages ────────────────────────────────────
    getFieldDefinitions() {
        return FILE_UPLOAD_FIELDS;
    }
}

export default new AccountFileUploadService();