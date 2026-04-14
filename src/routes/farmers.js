import { Router } from 'express';
import ctrl from '../controllers/FarmerController.js';

const router = Router();

// ════════════════════════════════════════════════════════════════════════════
//  READ
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /farmers
 * List all farmers (paginated).
 *
 * Query params:
 *   page        {number}  default: 1
 *   per_page    {number}  default: 50, max: 200
 *   village_id  {number}  filter by village
 *   dealer_id   {number}  filter by dealer
 *   tm_id       {number}  filter by territory manager
 *
 * Example: GET /api/v1/farmers?page=1&per_page=100&village_id=12
 */
router.get('/', (req, res, next) => ctrl.list(req, res, next));

/**
 * GET /farmers/:farmerId
 * Get a single farmer by ID.
 *
 * Example: GET /api/v1/farmers/42
 */
router.get('/:farmerId', (req, res, next) => ctrl.getOne(req, res, next));

// ════════════════════════════════════════════════════════════════════════════
//  CREATE
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /farmers
 * Create a new farmer record.
 *
 * Body: JSON object. Column names must match the [farmers] table.
 * Required: farmer_name
 *
 * Example:
 *   POST /api/v1/farmers
 *   {
 *     "farmer_name": "Ramesh Patil",
 *     "mobile_no":   "9876543210",
 *     "village_id":  5,
 *     "dealer_id":   3,
 *     "tm_id":       1
 *   }
 */
router.post('/', (req, res, next) => ctrl.create(req, res, next));

// ════════════════════════════════════════════════════════════════════════════
//  UPDATE
// ════════════════════════════════════════════════════════════════════════════

/**
 * PATCH /farmers/:farmerId
 * Partially update an existing farmer (only send the fields you want to change).
 *
 * Example:
 *   PATCH /api/v1/farmers/42
 *   { "mobile_no": "9999999999" }
 */
router.patch('/:farmerId', (req, res, next) => ctrl.update(req, res, next));

// ════════════════════════════════════════════════════════════════════════════
//  DELETE
// ════════════════════════════════════════════════════════════════════════════

/**
 * DELETE /farmers/:farmerId
 * Permanently delete a farmer record.
 *
 * Example: DELETE /api/v1/farmers/42
 */
router.delete('/:farmerId', (req, res, next) => ctrl.remove(req, res, next));

export default router;