import FarmerService from '../services/FarmerService.js';
import logger        from '../utils/logger.js';

// Inline AppError — errorHandler.js doesn't export it so we define it here
class AppError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code       = code;
    }
}

/**
 * FarmerController
 * ────────────────
 * Table   : dbo.farm_farmers
 * Columns : id, market_id, village_id, name, mobile, category, created_at, updated_at
 */
class FarmerController {

    // ── GET /farmers ──────────────────────────────────────────────────────
    /**
     * List farmers (paginated + filterable).
     *
     * Query params:
     *   page        {number}  default: 1
     *   per_page    {number}  default: 50, max: 200
     *   village_id  {number}  optional filter
     *   market_id   {number}  optional filter
     *   category    {string}  optional filter  e.g. "A", "A+", "B"
     */
    async list(req, res, next) {
        try {
            const { page, per_page, village_id, market_id, category } = req.query;
            const result = await FarmerService.list({ page, per_page, village_id, market_id, category });
            res.json({ success: true, ...result });
        } catch (err) { next(err); }
    }

    // ── GET /farmers/:id ──────────────────────────────────────────────────
    /**
     * Get a single farmer by id.
     */
    async getOne(req, res, next) {
        try {
            const { id } = req.params;

            if (!id || isNaN(Number(id))) {
                throw new AppError('id must be a valid number.', 400, 'VALIDATION_ERROR');
            }

            const farmer = await FarmerService.getById(id);

            if (!farmer) {
                throw new AppError(`Farmer with id ${id} not found.`, 404, 'NOT_FOUND');
            }

            res.json({ success: true, data: farmer });
        } catch (err) { next(err); }
    }

    // ── POST /farmers ──────────────────────────────────────────────────────
    /**
     * Create a new farmer.
     *
     * Body (JSON):
     *   name        {string}  required
     *   mobile      {string}  optional
     *   category    {string}  optional  e.g. "A", "A+", "B"
     *   market_id   {number}  optional
     *   village_id  {number}  optional
     */
    async create(req, res, next) {
        try {
            const data = req.body;

            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                throw new AppError('Request body must be a JSON object.', 400, 'VALIDATION_ERROR');
            }
            if (!data.name || !String(data.name).trim()) {
                throw new AppError('name is required.', 400, 'VALIDATION_ERROR');
            }

            // Strip id — it's an auto-identity column
            const { id: _ignored, created_at: _c, updated_at: _u, ...payload } = data;

            const created = await FarmerService.create(payload);
            logger.info('FarmerController: farmer created', { id: created?.id });
            res.status(201).json({ success: true, data: created });
        } catch (err) { next(err); }
    }

    // ── PATCH /farmers/:id ─────────────────────────────────────────────────
    /**
     * Partially update a farmer — only send fields you want to change.
     * Updatable fields: name, mobile, category, market_id, village_id
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;

            if (!id || isNaN(Number(id))) {
                throw new AppError('id must be a valid number.', 400, 'VALIDATION_ERROR');
            }

            const data = req.body;

            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                throw new AppError('Request body must be a JSON object.', 400, 'VALIDATION_ERROR');
            }
            if (!Object.keys(data).length) {
                throw new AppError('Request body is empty — provide at least one field to update.', 400, 'VALIDATION_ERROR');
            }

            // Strip id/timestamps from body
            const { id: _i, created_at: _c, updated_at: _u, ...payload } = data;

            const updated = await FarmerService.update(id, payload);

            if (!updated) {
                throw new AppError(`Farmer with id ${id} not found.`, 404, 'NOT_FOUND');
            }

            logger.info('FarmerController: farmer updated', { id });
            res.json({ success: true, data: updated });
        } catch (err) { next(err); }
    }

    // ── DELETE /farmers/:id ────────────────────────────────────────────────
    /**
     * Permanently delete a farmer.
     */
    async remove(req, res, next) {
        try {
            const { id } = req.params;

            if (!id || isNaN(Number(id))) {
                throw new AppError('id must be a valid number.', 400, 'VALIDATION_ERROR');
            }

            const deleted = await FarmerService.remove(id);

            if (!deleted) {
                throw new AppError(`Farmer with id ${id} not found.`, 404, 'NOT_FOUND');
            }

            logger.info('FarmerController: farmer deleted', { id });
            res.json({ success: true, message: `Farmer ${id} deleted.`, data: deleted });
        } catch (err) { next(err); }
    }
}

export default new FarmerController();