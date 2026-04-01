import accountService from '../services/AccountFileUploadService.js';
import { env } from '../config/env.js';
import zohoService from '../services/ZohoAccountService.js';
import logger from '../utils/logger.js';

class AccountController {

    // ════════════════════════════════════════════════════════════════════════
    //  READ — Fetch records
    // ════════════════════════════════════════════════════════════════════════

    /**
     * GET /accounts
     * List all accounts (paginated).
     */
    async listAll(req, res, next) {
        try {
            const page     = parseInt(req.query.page, 10)     || 1;
            const per_page = Math.min(parseInt(req.query.per_page, 10) || 50, 200);

            logger.info('AccountController: listAll', { page, per_page });

            const result = await zohoService.fetchRecords({ page, per_page });

            res.json({
                success: true,
                data:    result.data,
                info:    result.info,
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * GET /accounts/approved
     * List only approved accounts (metadata summary).
     */
    async listApproved(req, res, next) {
        try {
            logger.info('AccountController: listApproved');

            const accounts = await accountService.fetchApprovedAccounts();

            const summary = accounts.map(a => ({
                id:          a.id,
                accountName: a.Account_Name,
                sapId:       a.SAP_ID || null,
                folderName:  a.SAP_ID || `Account-${a.id}`,
                status:      a.Status,
                layout:      a.Layout?.name || null,
            }));

            res.json({
                success: true,
                data: {
                    total:    summary.length,
                    accounts: summary,
                },
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * GET /accounts/:recordId
     * Get a single account record (full, all fields).
     */
    async getOne(req, res, next) {
        try {
            const { recordId } = req.params;

            logger.info('AccountController: getOne', { recordId });

            const record = await zohoService.fetchRecordById(recordId);

            if (!record) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: `Account ${recordId} not found.` },
                });
            }

            res.json({ success: true, data: record });
        } catch (err) {
            next(err);
        }
    }

    /**
     * GET /accounts/:recordId/fields
     * Show File Upload field metadata for a single account (no download).
     */
    async listFields(req, res, next) {
        try {
            const { recordId } = req.params;

            logger.info('AccountController: listFields', { recordId });

            const record = await accountService.fetchAccountById(recordId);

            if (!record) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: `Account ${recordId} not found.` },
                });
            }

            const FILE_UPLOAD_FIELDS = [
                'Official_E_Mail_ID_Contact_No_On_Letter_Head',
                'Pesticide_Liscense',
                'Upload_Account_Verification_Cheque_Rs_100',
                'Upload_Address_Proof',
                'Upload_appraisal_Form',
                'Upload_Bank_Certificate_for_Bank_Account_Confirmat',
                'Upload_Bank_Cheque',
                'Business_Report',
                'Upload_declaration_of_detail_Information',
                'Distributor_Agreement',
                'Upload_distributor_Strength_Analysis_Report',
                'Upload_Fertilizer_License',
                'Upload_GSTIN_Certificate',
                'Upload_last_Two_Year_Balance_Sheet_Net_Worth',
                'Upload_Last_Two_Year_ITR_Net_Worth_Certificate',
                'Upload_Last_Two_Year_Profit_Loss_Account_Net_W',
                'Upload_Partnership_Agreement_Proprietorship_Deed',
                'Upload_proof_of_security_Deposit',
                'Upload_two_Blank_Letterhead_Signed',
                'Upload_Aadhar_Card_File',
                'Upload_GPS_Photo',
                'Upload_Pan_Card_File',
            ];

            const fields = {};
            let fieldsWithFiles = 0;
            let totalFiles = 0;

            for (const fieldName of FILE_UPLOAD_FIELDS) {
                const value   = record[fieldName];
                const hasFile = value && (!Array.isArray(value) || value.length > 0);

                fields[fieldName] = {
                    hasFile,
                    value: hasFile ? value : null,
                };

                if (hasFile) {
                    fieldsWithFiles++;
                    totalFiles += Array.isArray(value) ? value.length : 1;
                }
            }

            res.json({
                success: true,
                data: {
                    recordId,
                    accountName: record.Account_Name,
                    sapId:       record.SAP_ID || `Account-${record.id}`,
                    status:      record.Status,
                    summary: {
                        total_fields:      FILE_UPLOAD_FIELDS.length,
                        fields_with_files: fieldsWithFiles,
                        fields_empty:      FILE_UPLOAD_FIELDS.length - fieldsWithFiles,
                        total_files:       totalFiles,
                    },
                    fields,
                },
            });
        } catch (err) {
            next(err);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  WRITE — Create / update records
    // ════════════════════════════════════════════════════════════════════════

    /**
     * POST /accounts
     * Create a new account in Zoho CRM.
     */
    async createOne(req, res, next) {
        try {
            const data = req.body;

            if (!data || Object.keys(data).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'MISSING_BODY', message: 'Request body is required with at least one field.' },
                });
            }

            logger.info('AccountController: createOne', { fields: Object.keys(data) });

            const result = await zohoService.createRecord(data);

            res.status(201).json({
                success: true,
                data:    result,
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * POST /accounts/:recordId
     * Update an existing account in Zoho CRM.
     */
    async updateOne(req, res, next) {
        try {
            const { recordId } = req.params;
            const data         = req.body;

            if (!data || Object.keys(data).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'MISSING_BODY', message: 'Request body is required with at least one field to update.' },
                });
            }

            logger.info('AccountController: updateOne', { recordId, fields: Object.keys(data) });

            const result = await zohoService.updateRecord(recordId, data);

            res.json({
                success: true,
                data:    result,
            });
        } catch (err) {
            next(err);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  FILE UPLOAD FIELDS — Upload to one of the 22 fields
    // ════════════════════════════════════════════════════════════════════════

    /**
     * POST /accounts/:recordId/fields/:fieldName/upload
     * Upload a file into a specific File Upload or Image Upload field.
     */
    async uploadField(req, res, next) {
        try {
            const { recordId, fieldName } = req.params;

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'NO_FILE', message: 'No file provided. Send a file with field name "file".' },
                });
            }

            logger.info('AccountController: uploadField', { recordId, fieldName, size: req.file.size });

            const result = await accountService.uploadFieldFile(recordId, fieldName, req.file);

            res.json({
                success:          true,
                status_api_check: result.status_api_check,
                data:             result,
            });
        } catch (err) {
            next(err);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  SYNC / DOWNLOAD — Download files from fields
    // ════════════════════════════════════════════════════════════════════════

    /**
     * POST /accounts/sync
     * Sync ALL approved accounts — download all 22 fields for each.
     */
    async syncAll(req, res, next) {
        try {
            logger.info('AccountController: syncAll triggered');

            const result = await accountService.processAllApproved();
            const status = result.status_api_check ? 200 : 207;

            res.status(status).json({
                success:          true,
                status_api_check: result.status_api_check,
                data:             result,
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * POST /accounts/:recordId/sync
     * Sync a single account — download all 22 fields.
     */
    async syncOne(req, res, next) {
        try {
            const { recordId } = req.params;

            logger.info('AccountController: syncOne triggered', { recordId });

            const result = await accountService.processSingleAccount(recordId);

            if (result.error) {
                const statusCode = result.error.code === 'NOT_FOUND'    ? 404
                                 : result.error.code === 'NOT_APPROVED' ? 422
                                 : 400;

                return res.status(statusCode).json({
                    success:          false,
                    status_api_check: false,
                    error:            result.error,
                    data:             result,
                });
            }

            const status = result.status_api_check ? 200 : 207;

            res.status(status).json({
                success:          true,
                status_api_check: result.status_api_check,
                data:             result,
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * POST /accounts/:recordId/fields/:fieldName/download
     * Download a single field's file for one account.
     */
    async downloadField(req, res, next) {
        try {
            const { recordId, fieldName } = req.params;

            logger.info('AccountController: downloadField', { recordId, fieldName });

            const result = await accountService.downloadSingleField(recordId, fieldName);

            if (result.error) {
                const statusCode = result.error.code === 'NOT_FOUND'       ? 404
                                 : result.error.code === 'INVALID_FIELD'   ? 400
                                 : 400;

                return res.status(statusCode).json({
                    success:          false,
                    status_api_check: false,
                    error:            result.error,
                });
            }

            res.json({
                success:          true,
                status_api_check: result.status_api_check,
                data:             result,
            });
        } catch (err) {
            next(err);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  STANDARD ATTACHMENTS
    // ════════════════════════════════════════════════════════════════════════

    /**
     * GET /accounts/:recordId/attachments
     * List all standard attachments (metadata only).
     */
    async listAttachments(req, res, next) {
        try {
            const { recordId } = req.params;

            logger.info('AccountController: listAttachments', { recordId });

            const attachments = await zohoService.listAttachments(recordId);

            res.json({
                success: true,
                data: {
                    recordId,
                    count:       attachments.length,
                    attachments,
                },
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * POST /accounts/:recordId/attachments/download
     * Download ALL standard attachments → save to disk → return paths.
     */
    async downloadAllAttachments(req, res, next) {
        try {
            const { recordId } = req.params;

            logger.info('AccountController: downloadAllAttachments', { recordId });

            const result = await zohoService.downloadAllAttachments(recordId);

            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    }

    /**
     * POST /accounts/:recordId/attachments/:attachmentId/download
     * Download a single standard attachment.
     */
    async downloadOneAttachment(req, res, next) {
        try {
            const { recordId, attachmentId } = req.params;
            let { fileName } = req.body || {};

            logger.info('AccountController: downloadOneAttachment', { recordId, attachmentId });

            // Auto-resolve fileName from Zoho if not provided
            if (!fileName) {
                const list  = await zohoService.listAttachments(recordId);
                const match = list.find(a => a.id === attachmentId);

                if (!match) {
                    return res.status(404).json({
                        success: false,
                        error: {
                            code:    'ATTACHMENT_NOT_FOUND',
                            message: `Attachment ${attachmentId} not found on record ${recordId}.`,
                        },
                    });
                }
                fileName = match.fileName;
            }

            const result = await zohoService.downloadOneAttachment(recordId, attachmentId, fileName);

            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    }

    /**
     * POST /accounts/:recordId/attachments/upload
     * Upload a standard attachment to the account.
     */
    async uploadAttachment(req, res, next) {
        try {
            const { recordId } = req.params;

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'NO_FILE', message: 'No file provided. Send a file with field name "file".' },
                });
            }

            logger.info('AccountController: uploadAttachment', { recordId, size: req.file.size });

            const result = await zohoService.uploadAttachment(recordId, req.file);

            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  RECORD IMAGE — Photo field on the account record
    // ════════════════════════════════════════════════════════════════════════

    /**
     * GET /accounts/:recordId/image
     * Download the record image (photo) — streams image directly.
     */
    async getRecordImage(req, res, next) {
        try {
            const { recordId } = req.params;

            logger.info('AccountController: getRecordImage', { recordId });

            const { stream, contentType, fileName } = await zohoService.downloadRecordImage(recordId);

            res.setHeader('Content-Type', contentType || 'image/jpeg');
            res.setHeader('Content-Disposition', `inline; filename="${fileName || 'photo'}"`);
            stream.pipe(res);

        } catch (err) {
            if (err.code === 'NO_IMAGE') {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NO_IMAGE', message: `No record image found for account ${req.params.recordId}.` },
                });
            }
            next(err);
        }
    }

    /**
     * POST /accounts/:recordId/image/upload
     * Upload / replace the record image (photo).
     */
    async uploadRecordImage(req, res, next) {
        try {
            const { recordId } = req.params;

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'NO_FILE', message: 'No file provided. Send an image with field name "file".' },
                });
            }

            logger.info('AccountController: uploadRecordImage', { recordId, size: req.file.size });

            const result = await zohoService.uploadRecordImage(recordId, req.file);

            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    }
    

    // ════════════════════════════════════════════════════════════════════════
    //  WEBHOOK — Sync (download all) + Storage (return URLs)
    // ════════════════════════════════════════════════════════════════════════

    /**
     * POST /accounts/webhook/sync/:recordId
     * Downloads all 22 fields (file_upload + image_upload) to VM.
     * Wraps processSingleAccount — same logic as /sync endpoint.
     */
    async webhookSync(req, res, next) {
        try {
            const recordId = req.params.recordId || req.body?.id || req.query?.id;

            if (!recordId) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'MISSING_ID', message: 'Record ID is required — pass as URL param or body field "id".' },
                });
            }

            logger.info('AccountController: webhookSync', { recordId, source: req.params.recordId ? 'url' : 'body' });

            // ── Respond immediately so Zoho webhook doesn't time out ─────
            // Processing 21 files takes ~75s — we return 202 instantly and
            // process in the background. Check /webhook/storage/:recordId for results.
            res.status(202).json({
                success:          true,
                status_api_check: true,
                message:          'Sync started — processing in background. Check /webhook/storage/:recordId for results.',
                data: { recordId, status: 'processing' },
            });

            // ── Background processing (non-blocking) ────────────────────
            accountService.processSingleAccount(recordId)
                .then(result => {
                    if (result.error) {
                        logger.warn('AccountController: webhookSync background error', { recordId, error: result.error });
                    } else {
                        logger.info('AccountController: webhookSync background complete', {
                            recordId,
                            accountName:     result.accountName,
                            sapId:           result.sapId,
                            filesDownloaded: result.summary?.downloaded || 0,
                            filesFailed:     result.summary?.failed     || 0,
                        });
                    }
                })
                .catch(err => {
                    logger.error('AccountController: webhookSync background failed', { recordId, error: err.message });
                });

        } catch (err) {
            next(err);
        }
    }

    /**
     * GET /accounts/webhook/storage/:recordId
     * Scans VM disk and returns all stored file URLs — no downloading.
     */
    async webhookStorage(req, res, next) {
        try {
            const { recordId } = req.params;

            logger.info('AccountController: webhookStorage', { recordId });

            // Step 1: resolve account to get SAP_ID / folder name
            const record = await zohoService.fetchRecordById(recordId);
            if (!record) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: `Account "${recordId}" not found in Zoho CRM.` },
                });
            }

            const sapId      = record.SAP_ID || null;
            const folderName = sapId || `crm-${recordId}`;

            // Step 2: scan VM storage
            const storageData = await accountService.listDownloadedFiles(folderName);

            if (!storageData) {
                return res.status(200).json({
                    success:       true,
                    status_synced: false,
                    data: {
                        recordId,
                        accountName: record.Account_Name,
                        sapId:       sapId || null,
                        folderName,
                        message:     'No files found on VM. Run POST /webhook/sync/:recordId first.',
                        totalFiles:  0,
                        totalSize:   0,
                        fields:      [],
                    },
                });
            }

            // Step 3: build full public URLs
            const baseUrl        = env.PUBLIC_BASE_URL || 'http://localhost:3000';
            const fieldsWithUrls = storageData.fields.map(field => ({
                fieldApiName: field.fieldApiName,
                fieldLabel:   field.fieldLabel,
                fieldType:    field.fieldType,
                fileCount:    field.fileCount,
                files: field.files.map(f => ({
                    name:      f.name,
                    size:      f.size,
                    sizeKb:    (f.size / 1024).toFixed(2) + ' KB',
                    modified:  f.modified,
                    url:       `${baseUrl}${f.url}`,
                    localPath: f.url,
                })),
            }));

            res.json({
                success:       true,
                status_synced: true,
                data: {
                    recordId,
                    accountName:  record.Account_Name,
                    sapId:        sapId || null,
                    folderName,
                    status:       record.Status      || null,
                    layout:       record.Layout?.name || null,
                    totalFields:  fieldsWithUrls.length,
                    totalFiles:   storageData.totalFiles,
                    totalSize:    storageData.totalSize,
                    totalSizeKb:  (storageData.totalSize / 1024).toFixed(2) + ' KB',
                    storageRoot:  `${baseUrl}/storage/Accounts/${folderName}`,
                    fields:       fieldsWithUrls,
                },
            });

        } catch (err) {
            next(err);
        }
    }

}

export default new AccountController();