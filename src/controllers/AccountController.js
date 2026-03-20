import accountService from '../services/AccountFileUploadService.js';
import logger from '../utils/logger.js';

class AccountController {

    /**
     * POST /accounts/sync
     * Fetch ALL approved accounts → download all File Upload fields → save to /storage/{SAP_ID}/
     *
     * Response includes status_api_check (true if every file downloaded OK).
     */
    async syncAll(req, res, next) {
        try {
            logger.info('AccountController: syncAll triggered');

            const result = await accountService.processAllApproved();

            const status = result.status_api_check ? 200 : 207;  // 207 = Multi-Status (partial success)

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
     * Fetch a single account by ID → validate Status = Approved → download all files.
     *
     * Returns status_api_check and storage_url.
     */
    async syncOne(req, res, next) {
        try {
            const { recordId } = req.params;

            if (!recordId) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'MISSING_RECORD_ID', message: 'Record ID is required.' },
                });
            }

            logger.info('AccountController: syncOne triggered', { recordId });

            const result = await accountService.processSingleAccount(recordId);

            // If there's an error property, it means validation failed
            if (result.error) {
                const statusCode = result.error.code === 'NOT_FOUND' ? 404
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
     * GET /accounts/approved
     * List all approved accounts (metadata only, no file download).
     * Useful for previewing which records will be synced.
     */
    async listApproved(req, res, next) {
        try {
            logger.info('AccountController: listApproved triggered');

            const accounts = await accountService.fetchApprovedAccounts();

            const summary = accounts.map(a => ({
                id:          a.id,
                accountName: a.Account_Name,
                sapId:       a.SAP_ID || null,
                folderName:  a.SAP_ID || `crm-${a.id}`,
                status:      a.Status,
                layout:      a.Layout?.name || null,
            }));

            res.json({
                success: true,
                data: {
                    total: summary.length,
                    accounts: summary,
                },
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * GET /accounts/:recordId/fields
     * Show File Upload field values for a single account (metadata only, no download).
     * Useful for checking what files are present before syncing.
     */
    async listFields(req, res, next) {
        try {
            const { recordId } = req.params;

            if (!recordId) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'MISSING_RECORD_ID', message: 'Record ID is required.' },
                });
            }

            const record = await accountService.fetchAccountById(recordId);

            if (!record) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: `Account ${recordId} not found.` },
                });
            }

            // Extract just the file upload field values
            const FILE_UPLOAD_FIELDS = [
                'Official_E_Mail_ID_Contact_No_On_Letter_Head', 'Pesticide_Liscense',
                'Upload_Account_Verification_Cheque_Rs_100', 'Upload_Address_Proof',
                'Upload_appraisal_Form', 'Upload_Bank_Certificate_for_Bank_Account_Confirmat',
                'Upload_Bank_Cheque', 'Business_Report', 'Upload_declaration_of_detail_Information',
                'Distributor_Agreement', 'Upload_distributor_Strength_Analysis_Report',
                'Upload_Fertilizer_License', 'Upload_GSTIN_Certificate',
                'Upload_last_Two_Year_Balance_Sheet_Net_Worth',
                'Upload_Last_Two_Year_ITR_Net_Worth_Certificate',
                'Upload_Last_Two_Year_Profit_Loss_Account_Net_W',
                'Upload_Partnership_Agreement_Proprietorship_Deed',
                'Upload_proof_of_security_Deposit', 'Upload_two_Blank_Letterhead_Signed',
                'Upload_Aadhar_Card_File', 'Upload_GPS_Photo', 'Upload_Pan_Card_File',
            ];

            const fields = {};
            let fieldsWithFiles = 0;
            let totalFiles = 0;

            for (const fieldName of FILE_UPLOAD_FIELDS) {
                const value = record[fieldName];
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
                    sapId:       record.SAP_ID || `crm-${record.id}`,
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
}

export default new AccountController();
