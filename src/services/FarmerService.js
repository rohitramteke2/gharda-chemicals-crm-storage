import sql        from 'mssql';
import SQLService  from './SQLService.js';
import logger      from '../utils/logger.js';

/**
 * FarmerService
 * ─────────────
 * Table   : dbo.farm_farmers
 * Columns : id, market_id, village_id, name, mobile, category, created_at, updated_at
 */
class FarmerService {

    // ── LIST (paginated + optional filters) ──────────────────────────────
    async list({ page = 1, per_page = 50, village_id, market_id, category } = {}) {
        const pool    = await SQLService.getPool();
        const request = pool.request();

        const limit  = Math.min(Number(per_page), 200);
        const offset = (Math.max(Number(page), 1) - 1) * limit;

        const conditions = [];

        if (village_id) {
            request.input('village_id', sql.Int,          Number(village_id));
            conditions.push('[village_id] = @village_id');
        }
        if (market_id) {
            request.input('market_id',  sql.SmallInt,     Number(market_id));
            conditions.push('[market_id] = @market_id');
        }
        if (category) {
            request.input('category',   sql.NVarChar(10), String(category));
            conditions.push('[category] = @category');
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        // Count query (same filters, no pagination)
        const countReq = pool.request();
        if (village_id) countReq.input('village_id', sql.Int,          Number(village_id));
        if (market_id)  countReq.input('market_id',  sql.SmallInt,     Number(market_id));
        if (category)   countReq.input('category',   sql.NVarChar(10), String(category));

        const countResult = await countReq.query(
            `SELECT COUNT(*) AS total FROM dbo.farm_farmers ${whereClause}`
        );
        const total = countResult.recordset[0].total;

        const dataResult = await request.query(`
            SELECT *
            FROM   dbo.farm_farmers
            ${whereClause}
            ORDER  BY [id] ASC
            OFFSET ${offset} ROWS
            FETCH NEXT ${limit} ROWS ONLY
        `);

        logger.debug('FarmerService: list', { page, per_page: limit, total });

        return {
            data: dataResult.recordset,
            pagination: {
                total,
                page:        Number(page),
                per_page:    limit,
                total_pages: Math.ceil(total / limit),
            },
        };
    }

    // ── GET ONE ───────────────────────────────────────────────────────────
    async getById(id) {
        const pool    = await SQLService.getPool();
        const request = pool.request();
        request.input('id', sql.Int, Number(id));

        const result = await request.query(
            `SELECT * FROM dbo.farm_farmers WHERE [id] = @id`
        );

        logger.debug('FarmerService: getById', { id });
        return result.recordset[0] || null;
    }

    // ── CREATE ────────────────────────────────────────────────────────────
    async create(data) {
        const pool    = await SQLService.getPool();
        const request = pool.request();

        request.input('market_id',  sql.SmallInt,     data.market_id  ? Number(data.market_id)  : null);
        request.input('village_id', sql.Int,          data.village_id ? Number(data.village_id) : null);
        request.input('name',       sql.NVarChar(255), String(data.name).slice(0, 255));
        request.input('mobile',     sql.NVarChar(100), data.mobile ? String(data.mobile).slice(0, 100) : null);
        request.input('category',   sql.NVarChar(10),  data.category || null);

        const result = await request.query(`
            INSERT INTO dbo.farm_farmers
                (market_id, village_id, name, mobile, category)
            OUTPUT INSERTED.*
            VALUES
                (@market_id, @village_id, @name, @mobile, @category)
        `);

        const created = result.recordset[0];
        logger.info('FarmerService: farmer created', { id: created?.id });
        return created;
    }

    // ── UPDATE ────────────────────────────────────────────────────────────
    async update(id, data) {
        const pool    = await SQLService.getPool();
        const request = pool.request();

        // Only these columns are updatable
        const allowed = ['name', 'mobile', 'category', 'market_id', 'village_id'];
        const fields  = Object.keys(data).filter(k => allowed.includes(k));

        if (!fields.length) throw new Error('No valid fields provided for update.');

        const setList = fields.map((col, i) => {
            switch (col) {
                case 'name':       request.input(`u${i}`, sql.NVarChar(255), String(data[col]).slice(0, 255)); break;
                case 'mobile':     request.input(`u${i}`, sql.NVarChar(100), data[col] ? String(data[col]).slice(0, 100) : null); break;
                case 'category':   request.input(`u${i}`, sql.NVarChar(10),  data[col]); break;
                case 'market_id':  request.input(`u${i}`, sql.SmallInt,      Number(data[col])); break;
                case 'village_id': request.input(`u${i}`, sql.Int,           Number(data[col])); break;
            }
            return `[${col}] = @u${i}`;
        }).join(', ');

        request.input('id', sql.Int, Number(id));

        const result = await request.query(`
            UPDATE dbo.farm_farmers
            SET    ${setList}, [updated_at] = GETDATE()
            OUTPUT INSERTED.*
            WHERE  [id] = @id
        `);

        const updated = result.recordset[0] || null;
        logger.info('FarmerService: farmer updated', { id, updated: !!updated });
        return updated;
    }

    // ── DELETE ────────────────────────────────────────────────────────────
    async remove(id) {
        const pool    = await SQLService.getPool();
        const request = pool.request();
        request.input('id', sql.Int, Number(id));

        const result = await request.query(`
            DELETE FROM dbo.farm_farmers
            OUTPUT DELETED.*
            WHERE  [id] = @id
        `);

        const deleted = result.recordset[0] || null;
        logger.info('FarmerService: farmer deleted', { id, found: !!deleted });
        return deleted;
    }
}

export default new FarmerService();