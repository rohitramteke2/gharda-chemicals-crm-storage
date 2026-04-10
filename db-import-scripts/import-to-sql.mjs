/**
 * FARMER DB — CSV to SQL Server Importer
 * =======================================
 * ES Module version (.mjs) — uses import syntax
 * Compatible with projects using "type": "module"
 *
 * SETUP (run once):
 *   npm install mssql csv-parser
 *
 * RUN:
 *   node import-to-sql.mjs
 */

import sql       from 'mssql';
import fs        from 'fs';
import path      from 'path';
import csvParser from 'csv-parser';
import { fileURLToPath } from 'url';

// ES module replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ============================================================
// CONFIG — fill in your real password
// ============================================================
const DB_CONFIG = {
    server:   'localhost',
    database: 'ZOHO',
    user:     'zoho',
    password: 'YOUR_PASSWORD_HERE',  // <-- fill in real password
    options: {
        trustServerCertificate: true,
        enableArithAbort:       true,
        encrypt:                false,
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

const CSV_FOLDER = path.join(__dirname, 'output_csvs');

// ============================================================
// HELPERS
// ============================================================
const log = (msg) => {
    const t = new Date().toTimeString().slice(0, 8);
    console.log(`[${t}] ${msg}`);
};

const readCSV = (filename) => new Promise((resolve, reject) => {
    const rows = [];
    const filepath = path.join(CSV_FOLDER, filename);
    if (!fs.existsSync(filepath)) {
        return reject(new Error(`CSV not found: ${filepath}`));
    }
    fs.createReadStream(filepath)
        .pipe(csvParser())
        .on('data', row => {
            const cleaned = {};
            for (const [k, v] of Object.entries(row)) {
                cleaned[k.trim()] = typeof v === 'string' ? v.trim() : v;
            }
            rows.push(cleaned);
        })
        .on('end',   () => resolve(rows))
        .on('error', err => reject(err));
});

const getId = async (pool, table, nameCol, nameVal, extraCol = null, extraVal = null) => {
    if (!nameVal) return null;
    let query = `SELECT id FROM dbo.${table} WHERE ${nameCol} = @name`;
    const req = pool.request().input('name', sql.NVarChar, nameVal);
    if (extraCol) {
        query += ` AND ${extraCol} = @extra`;
        req.input('extra', sql.Int, extraVal);
    }
    const result = await req.query(query);
    return result.recordset[0]?.id ?? null;
};

const toNum = (v) => {
    const n = parseFloat(String(v ?? '').replace(/,/g, ''));
    return isNaN(n) ? null : n;
};

// ============================================================
// STEP 1: Regions + Regional Managers (RM.csv)
// ============================================================
const loadRM = async (pool) => {
    log('='.repeat(55));
    log('STEP 1: Regions + Regional Managers (RM.csv)');
    const rows = await readCSV('RM.csv');
    let regionsAdded = 0, rmsAdded = 0, linksAdded = 0;

    for (const row of rows) {
        const stateName  = row.state_name?.trim()  ?? '';
        const regionName = row.region_name?.trim() ?? '';
        const rmName     = row.rm_name?.trim()     ?? '';
        if (!stateName || !regionName) continue;

        const stateId = await getId(pool, 'farm_states', 'name', stateName);
        if (!stateId) { log(`  WARN: State not found: ${stateName}`); continue; }

        let regionId = await getId(pool, 'farm_regions', 'name', regionName, 'state_id', stateId);
        if (!regionId) {
            const r = await pool.request()
                .input('sid',  sql.SmallInt, stateId)
                .input('name', sql.NVarChar, regionName)
                .query(`INSERT INTO dbo.farm_regions (state_id, name)
                        OUTPUT INSERTED.id VALUES (@sid, @name)`);
            regionId = r.recordset[0].id;
            regionsAdded++;
        }

        if (rmName) {
            let rmId = await getId(pool, 'farm_regional_managers', 'name', rmName);
            if (!rmId) {
                const r = await pool.request()
                    .input('name', sql.NVarChar, rmName)
                    .query(`INSERT INTO dbo.farm_regional_managers (name)
                            OUTPUT INSERTED.id VALUES (@name)`);
                rmId = r.recordset[0].id;
                rmsAdded++;
            }
            const exists = await pool.request()
                .input('rm', sql.SmallInt, rmId)
                .input('rg', sql.SmallInt, regionId)
                .query(`SELECT 1 FROM dbo.farm_rm_regions
                        WHERE rm_id=@rm AND region_id=@rg`);
            if (!exists.recordset.length) {
                await pool.request()
                    .input('rm', sql.SmallInt, rmId)
                    .input('rg', sql.SmallInt, regionId)
                    .query(`INSERT INTO dbo.farm_rm_regions (rm_id, region_id)
                            VALUES (@rm, @rg)`);
                linksAdded++;
            }
        }
    }
    log(`  Regions inserted:           ${regionsAdded}`);
    log(`  Regional managers inserted: ${rmsAdded}`);
    log(`  RM-region links:            ${linksAdded}`);
};

// ============================================================
// STEP 2: Territories + Territory Managers (TM.csv)
// ============================================================
const loadTM = async (pool) => {
    log('='.repeat(55));
    log('STEP 2: Territories + Territory Managers (TM.csv)');
    const rows = await readCSV('TM.csv');
    let territoriesAdded = 0, tmsAdded = 0;

    for (const row of rows) {
        const stateName     = row.state_name?.trim()     ?? '';
        const regionName    = row.region_name?.trim()    ?? '';
        const territoryName = row.territory_name?.trim() ?? '';
        const tmName        = row.tm_name?.trim()        ?? '';
        const rmName        = row.rm_name?.trim()        ?? '';
        if (!stateName || !regionName || !territoryName) continue;

        const stateId = await getId(pool, 'farm_states', 'name', stateName);
        if (!stateId) continue;
        const regionId = await getId(pool, 'farm_regions', 'name', regionName, 'state_id', stateId);
        if (!regionId) { log(`  WARN: Region not found: ${regionName}`); continue; }

        let territoryId = await getId(pool, 'farm_territories', 'name', territoryName, 'region_id', regionId);
        if (!territoryId) {
            const r = await pool.request()
                .input('rid',  sql.SmallInt, regionId)
                .input('name', sql.NVarChar, territoryName)
                .query(`INSERT INTO dbo.farm_territories (region_id, name)
                        OUTPUT INSERTED.id VALUES (@rid, @name)`);
            territoryId = r.recordset[0].id;
            territoriesAdded++;
        }

        if (tmName && rmName) {
            const rmId = await getId(pool, 'farm_regional_managers', 'name', rmName);
            if (rmId) {
                const exists = await pool.request()
                    .input('name', sql.NVarChar, tmName)
                    .input('tid',  sql.SmallInt, territoryId)
                    .query(`SELECT 1 FROM dbo.farm_territory_managers
                            WHERE name=@name AND territory_id=@tid`);
                if (!exists.recordset.length) {
                    await pool.request()
                        .input('rmid', sql.SmallInt, rmId)
                        .input('tid',  sql.SmallInt, territoryId)
                        .input('name', sql.NVarChar,  tmName)
                        .query(`INSERT INTO dbo.farm_territory_managers
                                (rm_id, territory_id, name)
                                VALUES (@rmid, @tid, @name)`);
                    tmsAdded++;
                }
            }
        }
    }
    log(`  Territories inserted:        ${territoriesAdded}`);
    log(`  Territory managers inserted: ${tmsAdded}`);
};

// ============================================================
// STEP 3: Markets (Dealer.csv + farmers_combined.csv)
// ============================================================
const loadMarkets = async (pool) => {
    log('='.repeat(55));
    log('STEP 3: Loading Markets');
    const seen = new Set();
    let marketsAdded = 0;

    for (const csvFile of ['Dealer.csv', 'farmers_combined.csv']) {
        const rows = await readCSV(csvFile);
        for (const row of rows) {
            const stateName     = row.state_name?.trim()     ?? '';
            const regionName    = row.region_name?.trim()    ?? '';
            const territoryName = row.territory_name?.trim() ?? '';
            const marketName    = row.market_name?.trim()    ?? '';
            if (!marketName || !territoryName) continue;

            const key = `${stateName}|${regionName}|${territoryName}|${marketName}`;
            if (seen.has(key)) continue;
            seen.add(key);

            const stateId = await getId(pool, 'farm_states', 'name', stateName);
            if (!stateId) continue;
            const regionId = await getId(pool, 'farm_regions', 'name', regionName, 'state_id', stateId);
            if (!regionId) continue;
            const territoryId = await getId(pool, 'farm_territories', 'name', territoryName, 'region_id', regionId);
            if (!territoryId) continue;
            const exists = await getId(pool, 'farm_markets', 'name', marketName, 'territory_id', territoryId);
            if (!exists) {
                await pool.request()
                    .input('tid',  sql.SmallInt, territoryId)
                    .input('name', sql.NVarChar,  marketName)
                    .query(`INSERT INTO dbo.farm_markets (territory_id, name)
                            VALUES (@tid, @name)`);
                marketsAdded++;
            }
        }
    }
    log(`  Markets inserted: ${marketsAdded}`);
};

// ============================================================
// STEP 4: Villages (Demographic_info.csv — 482,545 rows)
// ============================================================
const loadVillages = async (pool) => {
    log('='.repeat(55));
    log('STEP 4: Loading Villages (482,545 rows) — please wait...');
    const rows = await readCSV('Demographic_info.csv');
    let inserted = 0, skipped = 0;
    const BATCH = 500;
    let batch = [];

    const flush = async () => {
        if (!batch.length) return;
        const table = new sql.Table('dbo.farm_villages');
        table.create = false;
        table.columns.add('territory_id',          sql.SmallInt,     { nullable: false });
        table.columns.add('name',                  sql.NVarChar(150),{ nullable: false });
        table.columns.add('district',              sql.NVarChar(100),{ nullable: true  });
        table.columns.add('taluk',                 sql.NVarChar(100),{ nullable: true  });
        table.columns.add('geographical_area_km2', sql.Decimal(10,2),{ nullable: true  });
        table.columns.add('population',            sql.Int,          { nullable: true  });
        table.columns.add('acreage',               sql.Decimal(12,2),{ nullable: true  });
        table.columns.add('hectares',              sql.Decimal(12,2),{ nullable: true  });
        for (const r of batch) table.rows.add(...r);
        await pool.request().bulk(table);
        inserted += batch.length;
        batch = [];
        if (inserted % 50000 === 0) log(`  ...${inserted.toLocaleString()} villages loaded`);
    };

    for (const row of rows) {
        const stateName     = row.state_name?.trim()     ?? '';
        const regionName    = row.region_name?.trim()    ?? '';
        const territoryName = row.territory_name?.trim() ?? '';
        const villageName   = row.village_name?.trim()   ?? '';
        if (!villageName || !territoryName) { skipped++; continue; }

        const stateId = await getId(pool, 'farm_states', 'name', stateName);
        if (!stateId) { skipped++; continue; }
        const regionId = await getId(pool, 'farm_regions', 'name', regionName, 'state_id', stateId);
        if (!regionId) { skipped++; continue; }
        const territoryId = await getId(pool, 'farm_territories', 'name', territoryName, 'region_id', regionId);
        if (!territoryId) { skipped++; continue; }

        batch.push([
            territoryId,
            villageName,
            row.district || null,
            row.taluk    || null,
            toNum(row.geo_area_km2),
            toNum(row.population),
            toNum(row.acreage),
            toNum(row.hectares),
        ]);
        if (batch.length >= BATCH) await flush();
    }
    await flush();
    log(`  Villages inserted: ${inserted.toLocaleString()}`);
    log(`  Villages skipped:  ${skipped.toLocaleString()}`);
};

// ============================================================
// STEP 5: Distributors (10,059 rows)
// ============================================================
const loadDistributors = async (pool) => {
    log('='.repeat(55));
    log('STEP 5: Loading Distributors (10,059 rows)');
    const rows = await readCSV('Distributor.csv');
    let inserted = 0, skipped = 0;

    for (const row of rows) {
        const stateName     = row.state_name?.trim()     ?? '';
        const regionName    = row.region_name?.trim()    ?? '';
        const territoryName = row.territory_name?.trim() ?? '';
        const firmName      = row.firm_name?.trim()      ?? '';
        if (!firmName) { skipped++; continue; }

        const stateId = await getId(pool, 'farm_states', 'name', stateName);
        if (!stateId) { skipped++; continue; }
        const regionId = await getId(pool, 'farm_regions', 'name', regionName, 'state_id', stateId);
        if (!regionId) { skipped++; continue; }
        const territoryId = await getId(pool, 'farm_territories', 'name', territoryName, 'region_id', regionId);
        if (!territoryId) { skipped++; continue; }

        await pool.request()
            .input('tid', sql.SmallInt, territoryId)
            .input('fn',  sql.NVarChar, firmName)
            .input('mob', sql.NVarChar, row.mobile            ?? null)
            .input('cat', sql.NVarChar, row.business_category ?? null)
            .query(`INSERT INTO dbo.farm_distributors
                    (territory_id, firm_name, mobile, business_category)
                    VALUES (@tid, @fn, @mob, @cat)`);
        inserted++;
    }
    log(`  Distributors inserted: ${inserted.toLocaleString()}`);
    log(`  Distributors skipped:  ${skipped.toLocaleString()}`);
};

// ============================================================
// STEP 6: Dealers (33,911 rows)
// ============================================================
const loadDealers = async (pool) => {
    log('='.repeat(55));
    log('STEP 6: Loading Dealers (33,911 rows)');
    const rows = await readCSV('Dealer.csv');
    let inserted = 0, skipped = 0;

    for (const row of rows) {
        const stateName     = row.state_name?.trim()     ?? '';
        const regionName    = row.region_name?.trim()    ?? '';
        const territoryName = row.territory_name?.trim() ?? '';
        const marketName    = row.market_name?.trim()    ?? '';
        const firmName      = row.firm_name?.trim()      ?? '';
        if (!firmName || !marketName) { skipped++; continue; }

        const stateId = await getId(pool, 'farm_states', 'name', stateName);
        if (!stateId) { skipped++; continue; }
        const regionId = await getId(pool, 'farm_regions', 'name', regionName, 'state_id', stateId);
        if (!regionId) { skipped++; continue; }
        const territoryId = await getId(pool, 'farm_territories', 'name', territoryName, 'region_id', regionId);
        if (!territoryId) { skipped++; continue; }
        const marketId = await getId(pool, 'farm_markets', 'name', marketName, 'territory_id', territoryId);
        if (!marketId) { skipped++; continue; }

        await pool.request()
            .input('mid',  sql.SmallInt, marketId)
            .input('fn',   sql.NVarChar, firmName)
            .input('code', sql.NVarChar, row.dealer_code ?? null)
            .input('mob',  sql.NVarChar, row.mobile      ?? null)
            .input('cat',  sql.NVarChar, row.category    ?? null)
            .query(`INSERT INTO dbo.farm_dealers
                    (market_id, firm_name, dealer_code, mobile, category)
                    VALUES (@mid, @fn, @code, @mob, @cat)`);
        inserted++;
    }
    log(`  Dealers inserted: ${inserted.toLocaleString()}`);
    log(`  Dealers skipped:  ${skipped.toLocaleString()}`);
};

// ============================================================
// STEP 7: Farmers (1,262,634 rows) — bulk insert with cache
// ============================================================
const loadFarmers = async (pool) => {
    log('='.repeat(55));
    log('STEP 7: Loading Farmers (1,262,634 rows) — biggest step...');
    const rows = await readCSV('farmers_combined.csv');
    let inserted = 0, skipped = 0;
    const BATCH = 1000;
    let batch = [];

    const territoryCache = new Map();
    const marketCache    = new Map();
    const villageCache   = new Map();

    const flush = async () => {
        if (!batch.length) return;
        const table = new sql.Table('dbo.farm_farmers');
        table.create = false;
        table.columns.add('market_id',  sql.SmallInt,     { nullable: false });
        table.columns.add('village_id', sql.Int,          { nullable: true  });
        table.columns.add('name',       sql.NVarChar(150),{ nullable: false });
        table.columns.add('mobile',     sql.NVarChar(15), { nullable: true  });
        table.columns.add('category',   sql.NVarChar(10), { nullable: true  });
        for (const r of batch) table.rows.add(...r);
        await pool.request().bulk(table);
        inserted += batch.length;
        batch = [];
        if (inserted % 100000 === 0) log(`  ...${inserted.toLocaleString()} farmers inserted`);
    };

    for (const row of rows) {
        const stateName     = row.state_name?.trim()     ?? '';
        const regionName    = row.region_name?.trim()    ?? '';
        const territoryName = row.territory_name?.trim() ?? '';
        const marketName    = row.market_name?.trim()    ?? '';
        const villageName   = row.village_name?.trim()   ?? '';
        const farmerName    = row.farmer_name?.trim()    ?? '';
        if (!farmerName || !marketName) { skipped++; continue; }

        // Territory (cached)
        const tKey = `${stateName}|${regionName}|${territoryName}`;
        if (!territoryCache.has(tKey)) {
            const stateId = await getId(pool, 'farm_states', 'name', stateName);
            if (!stateId) { territoryCache.set(tKey, null); }
            else {
                const regionId = await getId(pool, 'farm_regions', 'name', regionName, 'state_id', stateId);
                if (!regionId) { territoryCache.set(tKey, null); }
                else {
                    territoryCache.set(tKey,
                        await getId(pool, 'farm_territories', 'name', territoryName, 'region_id', regionId)
                    );
                }
            }
        }
        const territoryId = territoryCache.get(tKey);
        if (!territoryId) { skipped++; continue; }

        // Market (cached)
        const mKey = `${territoryId}|${marketName}`;
        if (!marketCache.has(mKey)) {
            marketCache.set(mKey, await getId(pool, 'farm_markets', 'name', marketName, 'territory_id', territoryId));
        }
        const marketId = marketCache.get(mKey);
        if (!marketId) { skipped++; continue; }

        // Village (cached)
        let villageId = null;
        if (villageName) {
            const vKey = `${territoryId}|${villageName}`;
            if (!villageCache.has(vKey)) {
                villageCache.set(vKey,
                    await getId(pool, 'farm_villages', 'name', villageName, 'territory_id', territoryId)
                );
            }
            villageId = villageCache.get(vKey) ?? null;
        }

        batch.push([marketId, villageId, farmerName, row.mobile ?? null, row.category ?? null]);
        if (batch.length >= BATCH) await flush();
    }
    await flush();
    log(`  Farmers inserted: ${inserted.toLocaleString()}`);
    log(`  Farmers skipped:  ${skipped.toLocaleString()}`);
};

// ============================================================
// FINAL COUNT CHECK
// ============================================================
const finalCheck = async (pool) => {
    log('='.repeat(55));
    log('FINAL COUNT CHECK:');
    const tables = [
        ['farm_zones',             4],
        ['farm_states',           36],
        ['farm_regions',        null],
        ['farm_territories',    null],
        ['farm_markets',        null],
        ['farm_villages',     482545],
        ['farm_distributors',  10059],
        ['farm_dealers',       33911],
        ['farm_farmers',     1262634],
    ];
    for (const [table, expected] of tables) {
        const r   = await pool.request().query(`SELECT COUNT(*) AS cnt FROM dbo.${table}`);
        const cnt = r.recordset[0].cnt;
        const status = expected
            ? (cnt === expected ? '✓ OK' : `⚠  expected ${expected.toLocaleString()}`)
            : '';
        log(`  ${table.padEnd(30)} ${String(cnt.toLocaleString()).padStart(12)}  ${status}`);
    }
};

// ============================================================
// MAIN
// ============================================================
const main = async () => {
    if (DB_CONFIG.password === 'YOUR_PASSWORD_HERE') {
        console.error('\nERROR: Set your real password in DB_CONFIG at the top!');
        process.exit(1);
    }
    if (!fs.existsSync(CSV_FOLDER)) {
        console.error(`\nERROR: Cannot find folder: ${CSV_FOLDER}`);
        console.error('Put output_csvs in the same folder as this script');
        process.exit(1);
    }

    log('Connecting to SQL Server at localhost...');
    const pool = await sql.connect(DB_CONFIG);
    log('Connected successfully!');

    await loadRM(pool);
    await loadTM(pool);
    await loadMarkets(pool);
    await loadVillages(pool);
    await loadDistributors(pool);
    await loadDealers(pool);
    await loadFarmers(pool);
    await finalCheck(pool);

    await pool.close();
    log('='.repeat(55));
    log('ALL DONE! Your database is fully loaded.');
};

main().catch(err => {
    console.error('\nFATAL ERROR:', err.message);
    process.exit(1);
});
