import { Router } from 'express';
import ctrl from '../controllers/FarmerController.js';

const router = Router();

// ════════════════════════════════════════════════════════════════════════════
//  READ
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /farmers
 * List all farmers (paginated + filterable).
 *
 * Query params:
 *   page        {number}  default: 1
 *   per_page    {number}  default: 50, max: 200
 *   village_id  {number}  filter by village
 *   market_id   {number}  filter by market
 *   category    {string}  filter by category  e.g. "A", "A+", "B"
 *
 * Example: GET /api/v1/farmers?page=1&per_page=10&category=A
 */
router.get('/', (req, res, next) => ctrl.list(req, res, next));

/**
 * GET /farmers/:id
 * Get a single farmer by id (the auto-increment id column).
 *
 * Example: GET /api/v1/farmers/9
 */
router.get('/:id', (req, res, next) => ctrl.getOne(req, res, next));

// ════════════════════════════════════════════════════════════════════════════
//  CREATE
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /farmers
 * Create a new farmer record.
 *
 * Body (JSON):
 *   name        {string}  required
 *   mobile      {string}  optional
 *   category    {string}  optional  "A" | "A+" | "A++" | "B"
 *   market_id   {number}  optional
 *   village_id  {number}  optional
 *
 * Example:
 *   POST /api/v1/farmers
 *   { "name": "Ramesh Patil", "mobile": "9876543210", "market_id": 568, "category": "A" }
 */
router.post('/', (req, res, next) => ctrl.create(req, res, next));

// ════════════════════════════════════════════════════════════════════════════
//  UPDATE
// ════════════════════════════════════════════════════════════════════════════

/**
 * PATCH /farmers/:id
 * Partially update a farmer — only send the fields you want to change.
 * Updatable: name, mobile, category, market_id, village_id
 *
 * Example:
 *   PATCH /api/v1/farmers/9
 *   { "mobile": "9999999999", "category": "A+" }
 */
router.patch('/:id', (req, res, next) => ctrl.update(req, res, next));

// ════════════════════════════════════════════════════════════════════════════
//  DELETE
// ════════════════════════════════════════════════════════════════════════════

/**
 * DELETE /farmers/:id
 * Permanently delete a farmer record.
 *
 * Example: DELETE /api/v1/farmers/9
 */
router.delete('/:id', (req, res, next) => ctrl.remove(req, res, next));

export default router;