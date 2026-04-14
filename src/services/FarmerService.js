import sql     from 'mssql';
import SQLService from './SQLService.js';
import logger  from '../utils/logger.js';

/**
 * FarmerService
 * ─────────────
 * All database operations for the [farmers] table.
 * Sits on top of SQLService (shared pool + query helpers).
 */
class FarmerService {

    // ── LIST (paginated + optional filters) ──────────────────────────────
    async list({ page = 1, per_page = 50, village_id, dealer_id, tm_id } = {}) {
        const pool    = await SQLService.getPool();
        const request = pool.request();

        const limit  = Math.min(Number(per_page), 200);
        const offset = (Math.max(Number(page), 1) - 1) * limit;

        const conditions = [];

        if (village_id) {
            request.input('village_id', sql.Int, Number(village_id));
            conditions.push('[village_id] = @village_id');
        }
        if (dealer_id) {
            request.input('dealer_id', sql.Int, Number(dealer_id));
            conditions.push('[dealer_id] = @dealer_id');
        }
        if (tm_id) {
            request.input('tm_id', sql.Int, Number(tm_id));
            conditions.push('[tm_id] = @tm_id');
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        // Count query (same filters, no pagination)
        const countReq = pool.request();
        if (village_id) countReq.input('village_id', sql.Int, Number(village_id));
        if (dealer_id)  countReq.input('dealer_id',  sql.Int, Number(dealer_id));
        if (tm_id)      countReq.input('tm_id',      sql.Int, Number(tm_id));

        const countResult = await countReq.query(
            `SELECT COUNT(*) AS total FROM [farmers] ${whereClause}`
        );
        const total = countResult.recordset[0].total;

        const dataResult = await request.query(`
            SELECT *
            FROM   [farmers]
            ${whereClause}
            ORDER  BY [farmer_id] ASC
            OFFSET ${offset} ROWS
            FETCH NEXT ${limit} ROWS ONLY
        `);

        logger.debug('FarmerService: list', { page, per_page: limit, total });

        return {
            data:       dataResult.recordset,
            pagination: {
                total,
                page:       Number(page),
                per_page:   limit,
                total_pages: Math.ceil(total / limit),
            },
        };
    }

    // ── GET ONE ───────────────────────────────────────────────────────────
    async getById(farmerId) {
        const pool    = await SQLService.getPool();
        const request = pool.request();
        request.input('farmer_id', sql.Int, Number(farmerId));

        const result = await request.query(
            `SELECT * FROM [farmers] WHERE [farmer_id] = @farmer_id`
        );

        logger.debug('FarmerService: getById', { farmerId });
        return result.recordset[0] || null;
    }

    // ── CREATE ────────────────────────────────────────────────────────────
    async create(data) {
        const pool    = await SQLService.getPool();
        const request = pool.request();

        // Bind each column from the payload
        const columns = Object.keys(data);
        const colList = columns.map(c => `[${c}]`).join(', ');
        const valList = columns.map((c, i) => {
            request.input(`c${i}`, data[c]);
            return `@c${i}`;
        }).join(', ');

        const result = await request.query(`
            INSERT INTO [farmers] (${colList})
            OUTPUT INSERTED.*
            VALUES (${valList})
        `);

        const created = result.recordset[0];
        logger.info('FarmerService: created farmer', { farmer_id: created?.farmer_id });
        return created;
    }

    // ── UPDATE ────────────────────────────────────────────────────────────
    async update(farmerId, data) {
        const pool    = await SQLService.getPool();
        const request = pool.request();

        const columns = Object.keys(data);
        if (!columns.length) throw new Error('No fields provided for update.');

        const setList = columns.map((c, i) => {
            request.input(`u${i}`, data[c]);
            return `[${c}] = @u${i}`;
        }).join(', ');

        request.input('farmer_id', sql.Int, Number(farmerId));

        const result = await request.query(`
            UPDATE [farmers]
            SET    ${setList}
            OUTPUT INSERTED.*
            WHERE  [farmer_id] = @farmer_id
        `);

        const updated = result.recordset[0] || null;
        logger.info('FarmerService: updated farmer', { farmerId, updated: !!updated });
        return updated;
    }

    // ── DELETE ────────────────────────────────────────────────────────────
    async remove(farmerId) {
        const pool    = await SQLService.getPool();
        const request = pool.request();
        request.input('farmer_id', sql.Int, Number(farmerId));

        const result = await request.query(`
            DELETE FROM [farmers]
            OUTPUT DELETED.*
            WHERE  [farmer_id] = @farmer_id
        `);

        const deleted = result.recordset[0] || null;
        logger.info('FarmerService: deleted farmer', { farmerId, found: !!deleted });
        return deleted;
    }
}

export default new FarmerService();