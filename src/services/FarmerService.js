import sql       from 'mssql';
import SQLService from './SQLService.js';
import logger     from '../utils/logger.js';

/**
 * FarmerService
 * ─────────────
 * Table   : dbo.farm_farmers     (ff)
 * JOINs   : farm_markets         (fm)
 *           farm_villages        (fv)
 *           farm_territories     (ft)
 *           farm_regions         (fr)
 *           farm_states          (fs)
 *           farm_zones           (fz)
 */
class FarmerService {

    // ─────────────────────────────────────────────────────────────────────
    //  SHARED BASE SELECT — used by list + getById
    // ─────────────────────────────────────────────────────────────────────
    _baseSelect() {
        return `
            SELECT
                ff.id,
                ff.market_id,
                ff.village_id,
                ff.name           AS farmer_name,
                ff.mobile,
                ff.category,
                ff.created_at,
                ff.updated_at,
                fm.name           AS market_name,
                fv.name           AS village_name,
                -- territory comes from market (primary) or village (fallback)
                COALESCE(ft.name, ftv.name)   AS territory_name,
                COALESCE(fr.name, frv.name)   AS region_name,
                COALESCE(fs.name, fsv.name)   AS state_name,
                COALESCE(fz.name, fzv.name)   AS zone_name
            FROM       dbo.farm_farmers      ff
            -- market side
            LEFT JOIN  dbo.farm_markets      fm   ON fm.id  = ff.market_id
            LEFT JOIN  dbo.farm_territories  ft   ON ft.id  = fm.territory_id
            LEFT JOIN  dbo.farm_regions      fr   ON fr.id  = ft.region_id
            LEFT JOIN  dbo.farm_states       fs   ON fs.id  = fr.state_id
            LEFT JOIN  dbo.farm_zones        fz   ON fz.id  = fs.zone_id
            -- village side (farm_villages also has territory_id directly)
            LEFT JOIN  dbo.farm_villages     fv   ON fv.id  = ff.village_id
            LEFT JOIN  dbo.farm_territories  ftv  ON ftv.id = fv.territory_id
            LEFT JOIN  dbo.farm_regions      frv  ON frv.id = ftv.region_id
            LEFT JOIN  dbo.farm_states       fsv  ON fsv.id = frv.state_id
            LEFT JOIN  dbo.farm_zones        fzv  ON fzv.id = fsv.zone_id
        `;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  SHARED JOIN clause — used in count query
    // ─────────────────────────────────────────────────────────────────────
    _baseJoins() {
        return `
            FROM       dbo.farm_farmers      ff
            LEFT JOIN  dbo.farm_markets      fm   ON fm.id  = ff.market_id
            LEFT JOIN  dbo.farm_territories  ft   ON ft.id  = fm.territory_id
            LEFT JOIN  dbo.farm_regions      fr   ON fr.id  = ft.region_id
            LEFT JOIN  dbo.farm_states       fs   ON fs.id  = fr.state_id
            LEFT JOIN  dbo.farm_zones        fz   ON fz.id  = fs.zone_id
            LEFT JOIN  dbo.farm_villages     fv   ON fv.id  = ff.village_id
            LEFT JOIN  dbo.farm_territories  ftv  ON ftv.id = fv.territory_id
            LEFT JOIN  dbo.farm_regions      frv  ON frv.id = ftv.region_id
            LEFT JOIN  dbo.farm_states       fsv  ON fsv.id = frv.state_id
            LEFT JOIN  dbo.farm_zones        fzv  ON fzv.id = fsv.zone_id
        `;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  LIST  —  paginated + all filters + full location details
    // ─────────────────────────────────────────────────────────────────────
    /**
     * Supported query params:
     *   page, per_page                   pagination
     *   name         string              partial match (LIKE)
     *   mobile       string              exact match
     *   category     string              exact  "A" | "A+" | "A++" | "B"
     *   market_id    number              exact
     *   village_id   number              exact
     *   state_id     number              filter by state
     *   zone_id      number              filter by zone
     *   region_id    number              filter by region
     *   territory_id number              filter by territory
     */
    async list({
        page = 1,
        per_page = 50,
        name,
        mobile,
        category,
        market_id,
        village_id,
        state_id,
        zone_id,
        region_id,
        territory_id,
    } = {}) {
        const pool   = await SQLService.getPool();
        const limit  = Math.min(Number(per_page), 200);
        const offset = (Math.max(Number(page), 1) - 1) * limit;

        const { conditions, bindings } = this._buildFilters({
            name, mobile, category,
            market_id, village_id,
            state_id, zone_id, region_id, territory_id,
        });

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        // ── Count ────────────────────────────────────────────────────────
        const countReq = pool.request();
        this._bindParams(countReq, bindings);
        const countResult = await countReq.query(
            `SELECT COUNT(*) AS total ${this._baseJoins()} ${whereClause}`
        );
        const total = countResult.recordset[0].total;

        // ── Data ─────────────────────────────────────────────────────────
        const dataReq = pool.request();
        this._bindParams(dataReq, bindings);
        const dataResult = await dataReq.query(`
            ${this._baseSelect()}
            ${whereClause}
            ORDER BY ff.id ASC
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

    // ─────────────────────────────────────────────────────────────────────
    //  GET ONE  —  full details with all JOINs
    // ─────────────────────────────────────────────────────────────────────
    async getById(id) {
        const pool    = await SQLService.getPool();
        const request = pool.request();
        request.input('id', sql.Int, Number(id));

        const result = await request.query(`
            ${this._baseSelect()}
            WHERE ff.id = @id
        `);

        logger.debug('FarmerService: getById', { id });
        return result.recordset[0] || null;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  CREATE  —  returns only id + created_at + updated_at
    //  (caller already knows the body fields they sent)
    // ─────────────────────────────────────────────────────────────────────
    async create(data) {
        const pool    = await SQLService.getPool();
        const request = pool.request();

        request.input('market_id',  sql.SmallInt,      data.market_id  ? Number(data.market_id)            : null);
        request.input('village_id', sql.Int,           data.village_id ? Number(data.village_id)           : null);
        request.input('name',       sql.NVarChar(255), String(data.name).trim().slice(0, 255));
        request.input('mobile',     sql.NVarChar(100), data.mobile     ? String(data.mobile).slice(0, 100) : null);
        request.input('category',   sql.NVarChar(10),  data.category   ? String(data.category).slice(0, 10): null);

        const result = await request.query(`
            INSERT INTO dbo.farm_farmers (market_id, village_id, name, mobile, category)
            OUTPUT INSERTED.id, INSERTED.created_at, INSERTED.updated_at
            VALUES (@market_id, @village_id, @name, @mobile, @category)
        `);

        const inserted = result.recordset[0];
        logger.info('FarmerService: farmer created', { id: inserted?.id });
        return inserted;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  UPDATE
    // ─────────────────────────────────────────────────────────────────────
    async update(id, data) {
        const pool    = await SQLService.getPool();
        const request = pool.request();

        const allowed = ['name', 'mobile', 'category', 'market_id', 'village_id'];
        const fields  = Object.keys(data).filter(k => allowed.includes(k));
        if (!fields.length) throw new Error('No valid fields provided for update.');

        const setList = fields.map((col, i) => {
            switch (col) {
                case 'name':       request.input(`u${i}`, sql.NVarChar(255), String(data[col]).trim().slice(0, 255)); break;
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

    // ─────────────────────────────────────────────────────────────────────
    //  DELETE
    // ─────────────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────────
    //  PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────

    _buildFilters({ name, mobile, category, market_id, village_id, state_id, zone_id, region_id, territory_id }) {
        const conditions = [];
        const bindings   = [];

        if (name) {
            conditions.push(`ff.name LIKE @name`);
            bindings.push({ key: 'name', type: sql.NVarChar(255), value: `%${name.trim()}%` });
        }
        if (mobile) {
            conditions.push(`ff.mobile = @mobile`);
            bindings.push({ key: 'mobile', type: sql.NVarChar(100), value: String(mobile).trim() });
        }
        if (category) {
            conditions.push(`ff.category = @category`);
            bindings.push({ key: 'category', type: sql.NVarChar(10), value: String(category) });
        }
        if (market_id) {
            conditions.push(`ff.market_id = @market_id`);
            bindings.push({ key: 'market_id', type: sql.SmallInt, value: Number(market_id) });
        }
        if (village_id) {
            conditions.push(`ff.village_id = @village_id`);
            bindings.push({ key: 'village_id', type: sql.Int, value: Number(village_id) });
        }
        if (state_id) {
            conditions.push(`(fs.id = @state_id OR fsv.id = @state_id)`);
            bindings.push({ key: 'state_id', type: sql.Int, value: Number(state_id) });
        }
        if (zone_id) {
            conditions.push(`(fz.id = @zone_id OR fzv.id = @zone_id)`);
            bindings.push({ key: 'zone_id', type: sql.Int, value: Number(zone_id) });
        }
        if (region_id) {
            conditions.push(`(fr.id = @region_id OR frv.id = @region_id)`);
            bindings.push({ key: 'region_id', type: sql.Int, value: Number(region_id) });
        }
        if (territory_id) {
            conditions.push(`(ft.id = @territory_id OR ftv.id = @territory_id)`);
            bindings.push({ key: 'territory_id', type: sql.Int, value: Number(territory_id) });
        }

        return { conditions, bindings };
    }

    _bindParams(request, bindings) {
        for (const { key, type, value } of bindings) {
            request.input(key, type, value);
        }
    }
}

export default new FarmerService();