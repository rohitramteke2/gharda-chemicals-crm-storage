import { Router } from 'express';
import ctrl from '../controllers/FarmerController.js';

const router = Router();

// ════════════════════════════════════════════════════════════════════════════
//  READ — List + Search
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /farmers
 * List all farmers — paginated, filterable, full location details in response.
 *
 * ── Pagination ──────────────────────────────────────────────────────────────
 *   page         {number}  default: 1
 *   per_page     {number}  default: 50, max: 200
 *
 * ── Search ──────────────────────────────────────────────────────────────────
 *   name         {string}  partial match  e.g. ?name=ramesh
 *   mobile       {string}  exact match    e.g. ?mobile=9876543210
 *
 * ── Filters ─────────────────────────────────────────────────────────────────
 *   category     {string}  "A" | "A+" | "A++" | "B"
 *   market_id    {number}  exact
 *   village_id   {number}  exact
 *   state_id     {number}  all farmers in a state
 *   zone_id      {number}  all farmers in a zone
 *   region_id    {number}  all farmers in a region
 *   territory_id {number}  all farmers in a territory
 *
 * ── Response fields ─────────────────────────────────────────────────────────
 *   id, farmer_name, mobile, category,
 *   market_id, village_id,
 *   market_name, village_name, territory_name,
 *   region_name, state_name, zone_name,
 *   created_at, updated_at
 *
 * Examples:
 *   GET /api/v1/farmers
 *   GET /api/v1/farmers?page=2&per_page=100
 *   GET /api/v1/farmers?name=ramesh
 *   GET /api/v1/farmers?mobile=9876543210
 *   GET /api/v1/farmers?category=A&state_id=5
 *   GET /api/v1/farmers?territory_id=12&page=1&per_page=50
 *   GET /api/v1/farmers?zone_id=1&category=A+
 */
// ════════════════════════════════════════════════════════════════════════════
//  SYNC — Pull from Zoho CRM and upsert into SQL
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /farmers/sync
 * Fetch all Farmers from Zoho CRM and upsert into dbo.farm_farmers.
 * Safe to run multiple times — uses zoho_record_id as unique key.
 */
router.post('/sync', (req, res, next) => ctrl.syncFromCRM(req, res, next));

router.get('/', (req, res, next) => ctrl.list(req, res, next));

/**
 * GET /farmers/:id
 * Get a single farmer by id — includes full location details.
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
 *   market_id   {number}  optional  must exist in farm_markets
 *   village_id  {number}  optional  must exist in farm_villages
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": 1262539,
 *     "created_at": "2026-04-14T...",
 *     "updated_at": "2026-04-14T...",
 *     "name": "Ramesh Patil",
 *     "mobile": "9876543210",
 *     "category": "A",
 *     "market_id": 4361,
 *     "village_id": null
 *   }
 * }
 *
 * Example:
 *   POST /api/v1/farmers
 *   { "name": "Ramesh Patil", "mobile": "9876543210", "market_id": 4361, "category": "A" }
 */
router.post('/', (req, res, next) => ctrl.create(req, res, next));

// ════════════════════════════════════════════════════════════════════════════
//  UPDATE
// ════════════════════════════════════════════════════════════════════════════

/**
 * PATCH /farmers/:id
 * Partially update a farmer — only send fields you want to change.
 * Updatable fields: name, mobile, category, market_id, village_id
 *
 * Example:
 *   PATCH /api/v1/farmers/1262539
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
 * Example: DELETE /api/v1/farmers/1262539
 */
router.delete('/:id', (req, res, next) => ctrl.remove(req, res, next));

export default router;