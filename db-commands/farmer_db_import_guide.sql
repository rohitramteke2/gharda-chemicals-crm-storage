-- ============================================================
--  FARMER_DB — DATA IMPORT GUIDE
--  Run AFTER farmer_db_schema.sql has been executed
--  Follow the steps in order — each sheet depends on the previous
-- ============================================================

USE farmer_db;

-- ============================================================
-- STEP 1: REGIONS
-- From your "RM" sheet — columns: Zone, State, RM Name, Region
-- Regions are unique per state
-- Copy this pattern for each row in the RM sheet
-- ============================================================

-- Maharashtra regions (from RM sheet rows 2-5)
INSERT INTO regions (state_id, name) VALUES
( (SELECT id FROM states WHERE name='Maharashtra'), 'Akola' ),
( (SELECT id FROM states WHERE name='Maharashtra'), 'Chhatrapati Sambhajinagar' ),
( (SELECT id FROM states WHERE name='Maharashtra'), 'WMH-1' ),
( (SELECT id FROM states WHERE name='Maharashtra'), 'WMH-2' );

-- Madhya Pradesh regions
INSERT INTO regions (state_id, name) VALUES
( (SELECT id FROM states WHERE name='Madhya Pradesh'), 'Central MP' ),
( (SELECT id FROM states WHERE name='Madhya Pradesh'), 'Western MP' );

-- Chhattisgarh regions
INSERT INTO regions (state_id, name) VALUES
( (SELECT id FROM states WHERE name='Chhattisgarh'), 'Chhattisgarh' );

-- Gujarat regions
INSERT INTO regions (state_id, name) VALUES
( (SELECT id FROM states WHERE name='Gujarat'), 'Gujarat - 1' ),
( (SELECT id FROM states WHERE name='Gujarat'), 'Gujarat - 2' );

-- Punjab regions
INSERT INTO regions (state_id, name) VALUES
( (SELECT id FROM states WHERE name='Punjab'), 'Panjab-1' ),
( (SELECT id FROM states WHERE name='Punjab'), 'Panjab-2' );

-- Rajasthan regions
INSERT INTO regions (state_id, name) VALUES
( (SELECT id FROM states WHERE name='Rajasthan'), 'Rajasthan - North' ),
( (SELECT id FROM states WHERE name='Rajasthan'), 'Rajasthan - South' );

-- Haryana regions
INSERT INTO regions (state_id, name) VALUES
( (SELECT id FROM states WHERE name='Haryana'), 'Haryana Cotton' ),
( (SELECT id FROM states WHERE name='Haryana'), 'Haryana Paddy' );

-- Uttar Pradesh regions
INSERT INTO regions (state_id, name) VALUES
( (SELECT id FROM states WHERE name='Uttar Pradesh'), 'Central UP' ),
( (SELECT id FROM states WHERE name='Uttar Pradesh'), 'Western UP' ),
( (SELECT id FROM states WHERE name='Uttar Pradesh'), 'Eastern UP' );

-- Uttarakhand regions
INSERT INTO regions (state_id, name) VALUES
( (SELECT id FROM states WHERE name='Uttarakhand'), 'Central UP' ),
( (SELECT id FROM states WHERE name='Uttarakhand'), 'Western UP' );

-- Bihar regions
INSERT INTO regions (state_id, name) VALUES
( (SELECT id FROM states WHERE name='Bihar'), 'Bihar' );

-- Tamil Nadu / Kerala / Puducherry (same RM)
INSERT INTO regions (state_id, name) VALUES
( (SELECT id FROM states WHERE name='Tamil Nadu'),  'Tamil Nadu' ),
( (SELECT id FROM states WHERE name='Kerala'),      'Tamil Nadu' ),   -- same region name per your RM sheet
( (SELECT id FROM states WHERE name='Puducherry'),  'Tamil Nadu' );

-- Karnataka regions
INSERT INTO regions (state_id, name) VALUES
( (SELECT id FROM states WHERE name='Karnataka'), 'Karnataka North' ),
( (SELECT id FROM states WHERE name='Karnataka'), 'Karnataka South' );

-- Andhra Pradesh regions
INSERT INTO regions (state_id, name) VALUES
( (SELECT id FROM states WHERE name='Andhra Pradesh'), 'Guntur' ),
( (SELECT id FROM states WHERE name='Andhra Pradesh'), 'Kurnool' );

-- Telangana regions
INSERT INTO regions (state_id, name) VALUES
( (SELECT id FROM states WHERE name='Telangana'), 'Telangana' );

-- West Bengal regions
INSERT INTO regions (state_id, name) VALUES
( (SELECT id FROM states WHERE name='West Bengal'), 'West Bengal' );


-- ============================================================
-- STEP 2: REGIONAL MANAGERS
-- From your "RM" sheet col C
-- ============================================================
INSERT INTO regional_managers (name) VALUES
('Mr. Kapil Krishan'),
('Mr. Varun Pathare'),
('Mr. Dinesh Devre'),
('Mr. Kantilal Jagtap'),
('Mr. Pawan Sharma'),
('Mr. Pawan Gupta'),
('Mr. Satyendra Pandey'),
('Mr. Opinder Singh'),
('Mr. Anuj'),
('Mr. Narveer Singh'),
('Mr. Balbeer Thakur'),
('Mr. Duniram Saharan'),
('Mr. G.S. Shekhawat'),
('Mr. Sher Singh'),
('Mr. Deep Narayan Singh'),
('Mr. Sunil Singh'),
('Mr. Dheeraj Sahani'),
('Mr. HariOm Singh'),
('Mr. Sandeep Kumar'),
('Mr. A.K. Mathaiya'),
('Mr. Govardhan'),
('Mr. Senthil'),
('Mr. Y.Ramanaih'),
('Mr. Imam Sayed');


-- ============================================================
-- STEP 3: RM → REGION ASSIGNMENTS
-- From your "RM" sheet — match RM name to region
-- Using subqueries so names drive the IDs
-- ============================================================
INSERT INTO rm_regions (rm_id, region_id)
SELECT rm.id, r.id
FROM regional_managers rm, regions r
WHERE rm.name = 'Mr. Kapil Krishan'
  AND r.name = 'Akola'
  AND r.state_id = (SELECT id FROM states WHERE name = 'Maharashtra');

INSERT INTO rm_regions (rm_id, region_id)
SELECT rm.id, r.id
FROM regional_managers rm, regions r
WHERE rm.name = 'Mr. Varun Pathare'
  AND r.name = 'Chhatrapati Sambhajinagar'
  AND r.state_id = (SELECT id FROM states WHERE name = 'Maharashtra');

-- (Continue this pattern for all RM-Region pairs from your RM sheet)
-- You have ~24 RMs and ~30+ regions to assign


-- ============================================================
-- STEP 4: TERRITORIES
-- From your "TM" sheet col F
-- Examples: Jalandhar, Bikaner, Abohar, Ahmedabad, Hisar
-- ============================================================

-- Punjab territories
INSERT INTO territories (region_id, name)
SELECT r.id, t.name
FROM regions r,
(VALUES ROW('Panjab-1', 'Punjab', 'Jalandhar'),
        ROW('Panjab-2', 'Punjab', 'Abohar'),
        ROW('Panjab-2', 'Punjab', 'Kotkapura'),
        ROW('Panjab-2', 'Punjab', 'Barnala'),
        ROW('Panjab-2', 'Punjab', 'Mansa'),
        ROW('Panjab-2', 'Punjab', 'Bhatinda'),
        ROW('Panjab-2', 'Punjab', 'Solan')) AS t(region_name, state_name, territory_name)
WHERE r.name = t.region_name
  AND r.state_id = (SELECT id FROM states WHERE name = t.state_name);

-- Ahmedabad territory (Gujarat)
INSERT INTO territories (region_id, name)
SELECT r.id, 'Ahmedabad'
FROM regions r
WHERE r.name = 'Gujarat - 2'
  AND r.state_id = (SELECT id FROM states WHERE name = 'Gujarat');

-- (Add all territories from your TM sheet following this pattern)


-- ============================================================
-- STEP 5: TERRITORY MANAGERS
-- From "TM" sheet: col E (TM Name), col C (RM), col F (Territory)
-- ============================================================
INSERT INTO territory_managers (rm_id, territory_id, name)
SELECT
    rm.id,
    t.id,
    'Paras Kumar'
FROM regional_managers rm, territories t, regions r, states s
WHERE rm.name = 'Mr. Narveer Singh'
  AND t.name = 'Jalandhar'
  AND t.region_id = r.id
  AND r.state_id = s.id
  AND s.name = 'Punjab';

-- (Continue for each TM from your TM sheet)


-- ============================================================
-- STEP 6: MARKETS
-- From "Farmer" sheet col H and "Dealer" sheet col H
-- Link each market to its territory
-- ============================================================

-- Sample markets for Abohar territory (Punjab)
INSERT INTO markets (territory_id, name)
SELECT t.id, m.name
FROM territories t, regions r, states s,
(VALUES ROW('ABOHAR'),
        ROW('SITTO GUNNO')) AS m(name)
WHERE t.name = 'Abohar'
  AND t.region_id = r.id
  AND r.state_id = s.id
  AND s.name = 'Punjab';

-- Sample markets for Ahmedabad territory (Gujarat)
INSERT INTO markets (territory_id, name)
SELECT t.id, m.name
FROM territories t, regions r, states s,
(VALUES ROW('PRANTIJ'),
        ROW('SARKHEJ'),
        ROW('BAVLA'),
        ROW('BAYAD'),
        ROW('DEMAI'),
        ROW('NARODA')) AS m(name)
WHERE t.name = 'Ahmedabad'
  AND t.region_id = r.id
  AND r.state_id = s.id
  AND s.name = 'Gujarat';


-- ============================================================
-- STEP 7: VILLAGES (from "Demographic info" sheet)
-- This is your largest reference table — 482,545 rows
-- Best imported via DBeaver CSV import wizard (see note below)
-- ============================================================

-- Sample — manual insert pattern for a few rows:
INSERT INTO villages (territory_id, name, district, taluk,
                      geographical_area_km2, population, acreage, hectares)
SELECT
    t.id,
    'Ankevaliya', 'Ahmedabad', 'Barwala',
    13.78, 505, 3405.04, 1362.02
FROM territories t, regions r, states s
WHERE t.name = 'Ahmedabad'
  AND t.region_id = r.id
  AND r.state_id = s.id
  AND s.name = 'Gujarat';

-- NOTE: For 482,545 villages, use DBeaver Import Wizard:
-- Right-click the villages table → Import Data → CSV
-- Map columns: state→(skip), district→district, taluk→taluk,
--   village name→name, geo area→geographical_area_km2,
--   population→population, acreage→acreage, hectares→hectares,
--   territory (text) → use a staging table approach below


-- ============================================================
-- STAGING TABLE APPROACH for large CSV imports
-- Create a flat staging table, load CSV into it,
-- then INSERT...SELECT with lookups to populate real tables
-- ============================================================

-- Create staging table matching your Demographic info sheet exactly
DROP TABLE IF EXISTS _staging_villages;
CREATE TABLE _staging_villages (
    state_name    VARCHAR(100),
    district      VARCHAR(100),
    taluk         VARCHAR(100),
    village_name  VARCHAR(150),
    geo_area_km2  DECIMAL(10,2),
    population    INT,
    acreage       DECIMAL(12,2),
    hectares      DECIMAL(12,2),
    region_name   VARCHAR(100),
    territory_name VARCHAR(100),
    zone_name     VARCHAR(20)
);

-- After loading CSV into _staging_villages via DBeaver Import Wizard:
INSERT INTO villages (territory_id, name, district, taluk,
                      geographical_area_km2, population, acreage, hectares)
SELECT
    t.id,
    s.village_name,
    s.district,
    s.taluk,
    s.geo_area_km2,
    s.population,
    s.acreage,
    s.hectares
FROM _staging_villages s
JOIN states st   ON st.name  = s.state_name
JOIN regions r   ON r.name   = s.region_name    AND r.state_id = st.id
JOIN territories t ON t.name = s.territory_name AND t.region_id = r.id;


-- ============================================================
-- STAGING TABLE for DISTRIBUTORS (Distributor sheet)
-- ============================================================
DROP TABLE IF EXISTS _staging_distributors;
CREATE TABLE _staging_distributors (
    sr             INT,
    state_name     VARCHAR(100),
    zone_name      VARCHAR(20),
    region_name    VARCHAR(100),
    territory_name VARCHAR(100),
    firm_name      VARCHAR(250),
    mobile         VARCHAR(15),
    business_category VARCHAR(10)
);

-- After CSV import into staging:
INSERT INTO distributors (territory_id, firm_name, mobile, business_category)
SELECT
    t.id,
    sd.firm_name,
    sd.mobile,
    sd.business_category
FROM _staging_distributors sd
JOIN states st ON st.name    = sd.state_name
JOIN regions r ON r.name     = sd.region_name    AND r.state_id = st.id
JOIN territories t ON t.name = sd.territory_name AND t.region_id = r.id;


-- ============================================================
-- STAGING TABLE for DEALERS (Dealer sheet)
-- ============================================================
DROP TABLE IF EXISTS _staging_dealers;
CREATE TABLE _staging_dealers (
    sno            INT,
    state_name     VARCHAR(100),
    zone_name      VARCHAR(20),
    region_name    VARCHAR(100),
    territory_name VARCHAR(100),
    market_name    VARCHAR(100),
    dealer_code    VARCHAR(20),
    firm_name      VARCHAR(250),
    mobile         VARCHAR(15),
    category       VARCHAR(10)
);

-- After CSV import into staging:
INSERT INTO dealers (market_id, firm_name, dealer_code, mobile, category)
SELECT
    m.id,
    sd.firm_name,
    sd.dealer_code,
    sd.mobile,
    sd.category
FROM _staging_dealers sd
JOIN states st ON st.name    = sd.state_name
JOIN regions r ON r.name     = sd.region_name    AND r.state_id = st.id
JOIN territories t ON t.name = sd.territory_name AND t.region_id = r.id
JOIN markets m ON m.name     = sd.market_name    AND m.territory_id = t.id;


-- ============================================================
-- STAGING TABLE for FARMERS (Farmer + Farmer 2 sheets)
-- Load BOTH sheets into this ONE staging table
-- ============================================================
DROP TABLE IF EXISTS _staging_farmers;
CREATE TABLE _staging_farmers (
    sno            INT,
    state_name     VARCHAR(100),
    zone_name      VARCHAR(20),
    region_name    VARCHAR(100),
    territory_name VARCHAR(100),
    market_name    VARCHAR(100),
    village_name   VARCHAR(150),
    farmer_name    VARCHAR(150),
    mobile         VARCHAR(15),
    category       VARCHAR(10)
);

-- After loading BOTH CSV sheets into _staging_farmers:
INSERT INTO farmers (market_id, village_id, name, mobile, category)
SELECT
    m.id,
    v.id,
    sf.farmer_name,
    sf.mobile,
    sf.category
FROM _staging_farmers sf
JOIN states st     ON st.name  = sf.state_name
JOIN regions r     ON r.name   = sf.region_name    AND r.state_id = st.id
JOIN territories t ON t.name   = sf.territory_name AND t.region_id = r.id
JOIN markets m     ON m.name   = sf.market_name    AND m.territory_id = t.id
LEFT JOIN villages v ON v.name = sf.village_name   AND v.territory_id = t.id;


-- ============================================================
-- DROP STAGING TABLES after import is confirmed correct
-- ============================================================
-- DROP TABLE _staging_villages;
-- DROP TABLE _staging_distributors;
-- DROP TABLE _staging_dealers;
-- DROP TABLE _staging_farmers;


-- ============================================================
-- USEFUL QUERIES after your data is loaded
-- ============================================================

-- How many farmers per state?
-- SELECT st.name AS state, COUNT(f.id) AS farmers
-- FROM farmers f
-- JOIN markets m     ON m.id = f.market_id
-- JOIN territories t ON t.id = m.territory_id
-- JOIN regions r     ON r.id = t.region_id
-- JOIN states st     ON st.id = r.state_id
-- GROUP BY st.name ORDER BY farmers DESC;

-- All farmers in a specific market
-- SELECT f.name, f.mobile, f.category, v.name AS village
-- FROM farmers f
-- JOIN villages v ON v.id = f.village_id
-- JOIN markets m  ON m.id = f.market_id
-- WHERE m.name = 'ABOHAR';

-- Count distributors per territory with RM name
-- SELECT rm.name AS rm, t.name AS territory, COUNT(d.id) AS distributors
-- FROM distributors d
-- JOIN territories t ON t.id = d.territory_id
-- JOIN regions r     ON r.id = t.region_id
-- JOIN rm_regions rr ON rr.region_id = r.id
-- JOIN regional_managers rm ON rm.id = rr.rm_id
-- GROUP BY rm.name, t.name ORDER BY rm.name;
