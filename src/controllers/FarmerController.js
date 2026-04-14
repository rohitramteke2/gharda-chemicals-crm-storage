import FarmerService from '../services/FarmerService.js';
import { AppError }  from '../middleware/errorHandler.js';
import logger        from '../utils/logger.js';

/**
 * FarmerController
 * ────────────────
 * Handles HTTP layer for /farmers endpoints.
 * Validates inputs, calls FarmerService, returns consistent JSON responses.
 */
class FarmerController {

    // ── GET /farmers ──────────────────────────────────────────────────────
    /**
     * List farmers (paginated).
     *
     * Query params:
     *   page        {number}  default: 1
     *   per_page    {number}  default: 50, max: 200
     *   village_id  {number}  optional filter
     *   dealer_id   {number}  optional filter
     *   tm_id       {number}  optional filter
     */
    async list(req, res, next) {
        try {
            const { page, per_page, village_id, dealer_id, tm_id } = req.query;
            const result = await FarmerService.list({ page, per_page, village_id, dealer_id, tm_id });

            res.json({
                success: true,
                ...result,
            });
        } catch (err) { next(err); }
    }

    // ── GET /farmers/:farmerId ─────────────────────────────────────────────
    /**
     * Get a single farmer by farmer_id.
     */
    async getOne(req, res, next) {
        try {
            const { farmerId } = req.params;

            if (!farmerId || isNaN(Number(farmerId))) {
                throw new AppError('farmerId must be a valid number.', 400, 'VALIDATION_ERROR');
            }

            const farmer = await FarmerService.getById(farmerId);

            if (!farmer) {
                throw new AppError(`Farmer with id ${farmerId} not found.`, 404, 'NOT_FOUND');
            }

            res.json({ success: true, data: farmer });
        } catch (err) { next(err); }
    }

    // ── POST /farmers ──────────────────────────────────────────────────────
    /**
     * Create a new farmer record.
     *
     * Body: JSON object — field names must match the [farmers] table columns.
     *
     * Required fields:
     *   farmer_name  {string}
     *
     * Optional fields (as defined in your schema):
     *   mobile_no, village_id, dealer_id, tm_id, rm_id, etc.
     */
    async create(req, res, next) {
        try {
            const data = req.body;

            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                throw new AppError('Request body must be a JSON object.', 400, 'VALIDATION_ERROR');
            }

            if (!data.farmer_name || !String(data.farmer_name).trim()) {
                throw new AppError('farmer_name is required.', 400, 'VALIDATION_ERROR');
            }

            // Strip out any attempt to manually set farmer_id (auto-identity column)
            const { farmer_id: _ignored, ...payload } = data;

            const created = await FarmerService.create(payload);

            logger.info('FarmerController: farmer created', { farmer_id: created?.farmer_id });
            res.status(201).json({ success: true, data: created });
        } catch (err) { next(err); }
    }

    // ── PATCH /farmers/:farmerId ───────────────────────────────────────────
    /**
     * Update an existing farmer record (partial update — only send changed fields).
     *
     * Body: JSON object with only the fields you want to update.
     */
    async update(req, res, next) {
        try {
            const { farmerId } = req.params;

            if (!farmerId || isNaN(Number(farmerId))) {
                throw new AppError('farmerId must be a valid number.', 400, 'VALIDATION_ERROR');
            }

            const data = req.body;

            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                throw new AppError('Request body must be a JSON object.', 400, 'VALIDATION_ERROR');
            }

            if (!Object.keys(data).length) {
                throw new AppError('Request body is empty — provide at least one field to update.', 400, 'VALIDATION_ERROR');
            }

            // Prevent farmer_id from being overwritten
            const { farmer_id: _ignored, ...payload } = data;

            const updated = await FarmerService.update(farmerId, payload);

            if (!updated) {
                throw new AppError(`Farmer with id ${farmerId} not found.`, 404, 'NOT_FOUND');
            }

            logger.info('FarmerController: farmer updated', { farmerId });
            res.json({ success: true, data: updated });
        } catch (err) { next(err); }
    }

    // ── DELETE /farmers/:farmerId ─────────────────────────────────────────
    /**
     * Delete a farmer record permanently.
     */
    async remove(req, res, next) {
        try {
            const { farmerId } = req.params;

            if (!farmerId || isNaN(Number(farmerId))) {
                throw new AppError('farmerId must be a valid number.', 400, 'VALIDATION_ERROR');
            }

            const deleted = await FarmerService.remove(farmerId);

            if (!deleted) {
                throw new AppError(`Farmer with id ${farmerId} not found.`, 404, 'NOT_FOUND');
            }

            logger.info('FarmerController: farmer deleted', { farmerId });
            res.json({ success: true, message: `Farmer ${farmerId} deleted.`, data: deleted });
        } catch (err) { next(err); }
    }
}

export default new FarmerController();