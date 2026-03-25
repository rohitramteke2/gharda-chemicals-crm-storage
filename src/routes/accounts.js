import { Router } from 'express';
import multer from 'multer';
import ctrl from '../controllers/AccountController.js';

const router = Router();

// ── Multer — memory storage for uploads (sent to Zoho + saved to disk) ──────
const upload = multer({
    storage: multer.memoryStorage(),
    limits:  { fileSize: 20 * 1024 * 1024 },  // 20 MB max per file
});

// ════════════════════════════════════════════════════════════════════════════
//  READ — Fetch account records
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /accounts
 * List all accounts (paginated).
 *
 * Query params:
 *   page      {number}  default: 1
 *   per_page  {number}  default: 50, max: 200
 *
 * Example: GET /api/v1/accounts?page=1&per_page=100
 */
router.get('/', (req, res, next) => ctrl.listAll(req, res, next));

/**
 * GET /accounts/approved
 * List only accounts where Status = "Approved" (metadata only, no file download).
 *
 * Example: GET /api/v1/accounts/approved
 */
router.get('/approved', (req, res, next) => ctrl.listApproved(req, res, next));

/**
 * GET /accounts/:recordId
 * Get a single account record by CRM record ID (full record, all fields).
 *
 * Example: GET /api/v1/accounts/1000823000013518007
 */
router.get('/:recordId', (req, res, next) => ctrl.getOne(req, res, next));

/**
 * GET /accounts/:recordId/fields
 * Show File Upload field values for a single account (metadata only, no download).
 * Use this to check which of the 22 fields have files before syncing.
 *
 * Example: GET /api/v1/accounts/1000823000013518007/fields
 */
router.get('/:recordId/fields', (req, res, next) => ctrl.listFields(req, res, next));

// ════════════════════════════════════════════════════════════════════════════
//  WRITE — Create / update account records in Zoho CRM
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /accounts
 * Create a new account record in Zoho CRM.
 *
 * Body: JSON object with Zoho CRM field API names.
 * Response: Same structure as Zoho CRM response (data[0] with id, status, etc.)
 *
 * Example:
 *   POST /api/v1/accounts
 *   { "Account_Name": "ABC Distributors", "SAP_ID": "1001", "Status": "Pending" }
 */
router.post('/', (req, res, next) => ctrl.createOne(req, res, next));

/**
 * POST /accounts/:recordId
 * Update an existing account record in Zoho CRM.
 *
 * Body: JSON object with only the fields you want to update.
 * Response: Same structure as Zoho CRM response.
 *
 * Example:
 *   POST /api/v1/accounts/1000823000013518007
 *   { "Status": "Approved", "SAP_ID": "2002" }
 */
router.post('/:recordId', (req, res, next) => ctrl.updateOne(req, res, next));

// ════════════════════════════════════════════════════════════════════════════
//  FILE UPLOAD — Upload files into the 22 File Upload / Image Upload fields
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /accounts/:recordId/fields/:fieldName/upload
 * Upload a file into a specific File Upload or Image Upload field on an account.
 *
 * - Uploads to Zoho CRM via the Download Field Attachments API
 * - Saves a local copy to /storage/{SAP_ID}/{fieldName}/
 * - Returns status_api_check + storage URL
 *
 * Multipart form-data, field name: "file"
 *
 * Example:
 *   POST /api/v1/accounts/1000823000013518007/fields/Upload_Pan_Card_File/upload
 *   Body: form-data  →  file: <your file>
 *
 * Valid fieldName values (all 22 fields):
 *   Official_E_Mail_ID_Contact_No_On_Letter_Head
 *   Pesticide_Liscense
 *   Upload_Account_Verification_Cheque_Rs_100
 *   Upload_Address_Proof
 *   Upload_appraisal_Form
 *   Upload_Bank_Certificate_for_Bank_Account_Confirmat
 *   Upload_Bank_Cheque
 *   Business_Report
 *   Upload_declaration_of_detail_Information
 *   Distributor_Agreement
 *   Upload_distributor_Strength_Analysis_Report
 *   Upload_Fertilizer_License
 *   Upload_GSTIN_Certificate
 *   Upload_last_Two_Year_Balance_Sheet_Net_Worth
 *   Upload_Last_Two_Year_ITR_Net_Worth_Certificate
 *   Upload_Last_Two_Year_Profit_Loss_Account_Net_W
 *   Upload_Partnership_Agreement_Proprietorship_Deed
 *   Upload_proof_of_security_Deposit
 *   Upload_two_Blank_Letterhead_Signed
 *   Upload_Aadhar_Card_File        (image_upload)
 *   Upload_GPS_Photo               (image_upload)
 *   Upload_Pan_Card_File           (image_upload)
 */
router.post(
    '/:recordId/fields/:fieldName/upload',
    upload.single('file'),
    (req, res, next) => ctrl.uploadField(req, res, next)
);

// ════════════════════════════════════════════════════════════════════════════
//  DOWNLOAD — Download files from the 22 File Upload / Image Upload fields
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /accounts/:recordId/sync
 * Sync ALL 22 fields for a single account:
 *   → Validate Status = "Approved"
 *   → Download every File Upload + Image Upload field
 *   → Save to /storage/{SAP_ID}/{fieldName}/
 *   → Return status_api_check + per-field results + storage URLs
 *
 * Example: POST /api/v1/accounts/1000823000013518007/sync
 */
router.post('/:recordId/sync', (req, res, next) => ctrl.syncOne(req, res, next));

/**
 * POST /accounts/sync
 * Sync ALL approved accounts (batch):
 *   → Fetch every account where Status = "Approved"
 *   → Download all 22 fields for each
 *   → Return summary with status_api_check per account
 *
 * ⚠️  Can be slow for large datasets — use /:recordId/sync for one account.
 *
 * Example: POST /api/v1/accounts/sync
 */
router.post('/sync', (req, res, next) => ctrl.syncAll(req, res, next));

/**
 * POST /accounts/:recordId/fields/:fieldName/download
 * Download a SINGLE field's file for one account:
 *   → Save to /storage/{SAP_ID}/{fieldName}/
 *   → Return status_api_check + storage URL
 *
 * Example:
 *   POST /api/v1/accounts/1000823000013518007/fields/Upload_Pan_Card_File/download
 */
router.post(
    '/:recordId/fields/:fieldName/download',
    (req, res, next) => ctrl.downloadField(req, res, next)
);

// ════════════════════════════════════════════════════════════════════════════
//  ATTACHMENTS — Standard Zoho CRM Attachments (not File Upload fields)
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /accounts/:recordId/attachments
 * List all standard attachments on the account (metadata only, no download).
 *
 * Example: GET /api/v1/accounts/1000823000013518007/attachments
 */
router.get('/:recordId/attachments', (req, res, next) => ctrl.listAttachments(req, res, next));

/**
 * POST /accounts/:recordId/attachments/download
 * Download ALL standard attachments for the account → save to disk → return paths.
 *
 * Example: POST /api/v1/accounts/1000823000013518007/attachments/download
 */
router.post('/:recordId/attachments/download', (req, res, next) => ctrl.downloadAllAttachments(req, res, next));

/**
 * POST /accounts/:recordId/attachments/:attachmentId/download
 * Download a SINGLE standard attachment by attachment ID.
 *
 * Body (optional): { "fileName": "report.pdf" }
 * If fileName is omitted, it is looked up from Zoho automatically.
 *
 * Example:
 *   POST /api/v1/accounts/1000823000013518007/attachments/1000823000014380029/download
 */
router.post(
    '/:recordId/attachments/:attachmentId/download',
    (req, res, next) => ctrl.downloadOneAttachment(req, res, next)
);

/**
 * POST /accounts/:recordId/attachments/upload
 * Upload a file as a standard Zoho CRM attachment on the account.
 *
 * Multipart form-data, field name: "file"
 *
 * Example:
 *   POST /api/v1/accounts/1000823000013518007/attachments/upload
 *   Body: form-data  →  file: <your file>
 */
router.post(
    '/:recordId/attachments/upload',
    upload.single('file'),
    (req, res, next) => ctrl.uploadAttachment(req, res, next)
);

// ════════════════════════════════════════════════════════════════════════════
//  IMAGES — Record Image field (photo associated with the account record)
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /accounts/:recordId/image
 * Download the record image (photo) for an account.
 * Uses the Zoho CRM Download Record Image API (GET /{module}/{record_ID}/photo).
 * Streams the image directly in the response.
 *
 * Example: GET /api/v1/accounts/1000823000013518007/image
 */
router.get('/:recordId/image', (req, res, next) => ctrl.getRecordImage(req, res, next));

/**
 * POST /accounts/:recordId/image/upload
 * Upload / replace the record image (photo) for an account.
 * Uses the Zoho CRM Upload Record Image API (POST /{module}/{record_ID}/photo).
 *
 * Multipart form-data, field name: "file"
 * Supported formats: JPG, PNG, GIF, BMP, WEBP
 *
 * Example:
 *   POST /api/v1/accounts/1000823000013518007/image/upload
 *   Body: form-data  →  file: <image file>
 */
router.post(
    '/:recordId/image/upload',
    upload.single('file'),
    (req, res, next) => ctrl.uploadRecordImage(req, res, next)
);




// ════════════════════════════════════════════════════════════════════════════
//  WEBHOOK ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /accounts/webhook/sync/:recordId
 * Downloads ALL files for an account from Zoho CRM → saves to VM.
 * Covers all 22 fields (file_upload + image_upload).
 *
 * Example: POST /api/v1/accounts/webhook/sync/1000823000014821235
 */
// Supports both:
//   POST /webhook/sync/1000823000014821235   ← direct API call with ID in URL
//   POST /webhook/sync                        ← Zoho CRM webhook with id in body
router.post('/webhook/sync/:recordId', (req, res, next) => ctrl.webhookSync(req, res, next));
router.post('/webhook/sync', (req, res, next) => ctrl.webhookSync(req, res, next));

/**
 * GET /accounts/webhook/storage/:recordId
 * Returns all files already stored on the VM for this account.
 * Does NOT download — just reads disk and returns public URLs.
 * Run webhook/sync first, then call this to get the links.
 *
 * Example: GET /api/v1/accounts/webhook/storage/1000823000014821235
 */
router.get('/webhook/storage/:recordId', (req, res, next) => ctrl.webhookStorage(req, res, next));

export default router;
