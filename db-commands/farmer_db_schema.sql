-- ============================================================
--  FARMER_DB — PRODUCTION SCHEMA
--  Matches your exact Excel structure across all 9 sheets
--  Run this entire file once in DBeaver to build the database
--  Safe to re-run: uses DROP IF EXISTS before each table
-- ============================================================

CREATE DATABASE IF NOT EXISTS farmer_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE farmer_db;

-- ============================================================
-- SAFETY: Drop in reverse order (children before parents)
-- ============================================================
DROP TABLE IF EXISTS farmers;
DROP TABLE IF EXISTS dealers;
DROP TABLE IF EXISTS distributors;
DROP TABLE IF EXISTS territory_managers;
DROP TABLE IF EXISTS rm_regions;
DROP TABLE IF EXISTS regional_managers;
DROP TABLE IF EXISTS villages;
DROP TABLE IF EXISTS markets;
DROP TABLE IF EXISTS territories;
DROP TABLE IF EXISTS regions;
DROP TABLE IF EXISTS states;
DROP TABLE IF EXISTS zones;


-- ============================================================
-- TABLE 1: ZONES
-- Source: Column "Zone" across all sheets
-- Values: North, South, East, West
-- ============================================================
CREATE TABLE zones (
    id         TINYINT      NOT NULL AUTO_INCREMENT,
    name       VARCHAR(20)  NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_zone_name (name)
);

-- ============================================================
-- TABLE 2: STATES
-- Source: "State" sheet col B / "Vill Count" col B
-- Examples: Maharashtra, Punjab, Gujarat, West Bengal
-- census_code from your "Vill Count" sheet col C
-- ============================================================
CREATE TABLE states (
    id           SMALLINT      NOT NULL AUTO_INCREMENT,
    zone_id      TINYINT       NOT NULL,
    name         VARCHAR(100)  NOT NULL,
    census_code  SMALLINT      NULL COMMENT 'From Vill Count sheet col C',
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_state_name (name),
    CONSTRAINT fk_state_zone
        FOREIGN KEY (zone_id) REFERENCES zones(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================
-- TABLE 3: REGIONS
-- Source: "RM" sheet col D (REGION 010426)
-- Examples: Akola, Central MP, WMH-1, Gujarat-1, Panjab-2
-- ============================================================
CREATE TABLE regions (
    id         SMALLINT      NOT NULL AUTO_INCREMENT,
    state_id   SMALLINT      NOT NULL,
    name       VARCHAR(100)  NOT NULL,
    created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_region_state (state_id, name),
    CONSTRAINT fk_region_state
        FOREIGN KEY (state_id) REFERENCES states(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================
-- TABLE 4: TERRITORIES
-- Source: "TM" sheet col F (TERRITORY 01042)
-- Examples: Jalandhar, Bikaner, Suratgarh, Abohar, Ahmedabad
-- ============================================================
CREATE TABLE territories (
    id         SMALLINT      NOT NULL AUTO_INCREMENT,
    region_id  SMALLINT      NOT NULL,
    name       VARCHAR(100)  NOT NULL,
    created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_territory_region (region_id, name),
    CONSTRAINT fk_territory_region
        FOREIGN KEY (region_id) REFERENCES regions(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================
-- TABLE 5: MARKETS
-- Source: "Farmer" sheet col H (MARKET NAME) and "Dealer" sheet col H
-- Examples: ABOHAR, PRANTIJ, SITTO GUNNO, SARKHEJ, BAVLA
-- Note: Distributor sheet does NOT have markets — only territories
-- ============================================================
CREATE TABLE markets (
    id           SMALLINT      NOT NULL AUTO_INCREMENT,
    territory_id SMALLINT      NOT NULL,
    name         VARCHAR(100)  NOT NULL,
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_market_territory (territory_id, name),
    CONSTRAINT fk_market_territory
        FOREIGN KEY (territory_id) REFERENCES territories(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================
-- TABLE 6: VILLAGES
-- Source: "Demographic info" sheet
-- Columns: State, District, Taluk, Village Name, Geo Area KM2,
--          Population, Acreage, Hectares, Region, Territory, Zone
-- NOTE: Village links to territory (no market column in that sheet)
--       market_id is nullable — filled when we know which market
-- ============================================================
CREATE TABLE villages (
    id                    INT             NOT NULL AUTO_INCREMENT,
    territory_id          SMALLINT        NOT NULL,
    market_id             SMALLINT        NULL COMMENT 'Set from Farmer sheet matching',
    name                  VARCHAR(150)    NOT NULL,
    district              VARCHAR(100)    NULL,
    taluk                 VARCHAR(100)    NULL,
    geographical_area_km2 DECIMAL(10,2)   NULL COMMENT 'Col F: GEOGRAPHICAL AREA (KM2)',
    population            INT             NULL COMMENT 'Col G: VILL POPULATION',
    acreage               DECIMAL(12,2)   NULL COMMENT 'Col H: Acrea',
    hectares              DECIMAL(12,2)   NULL COMMENT 'Col I: Hect',
    created_at            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_village_name (name),
    INDEX idx_village_territory (territory_id),
    CONSTRAINT fk_village_territory
        FOREIGN KEY (territory_id) REFERENCES territories(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_village_market
        FOREIGN KEY (market_id) REFERENCES markets(id)
        ON DELETE SET NULL ON UPDATE CASCADE
);

-- ============================================================
-- TABLE 7: REGIONAL MANAGERS
-- Source: "RM" sheet col C (RM Name)
-- Examples: Mr. Kapil Krishan, Mr. Pawan Sharma, Mr. Narveer Singh
-- ============================================================
CREATE TABLE regional_managers (
    id         SMALLINT      NOT NULL AUTO_INCREMENT,
    name       VARCHAR(150)  NOT NULL,
    mobile     VARCHAR(15)   NULL,
    email      VARCHAR(150)  NULL,
    created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- ============================================================
-- TABLE 8: RM → REGION ASSIGNMENTS
-- Source: "RM" sheet — one RM can manage multiple regions
-- Example: Mr. A.K. Mathaiya manages Tamil Nadu, Kerala, Puducherry
-- ============================================================
CREATE TABLE rm_regions (
    rm_id     SMALLINT  NOT NULL,
    region_id SMALLINT  NOT NULL,
    PRIMARY KEY (rm_id, region_id),
    CONSTRAINT fk_rmr_rm
        FOREIGN KEY (rm_id) REFERENCES regional_managers(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_rmr_region
        FOREIGN KEY (region_id) REFERENCES regions(id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- TABLE 9: TERRITORY MANAGERS
-- Source: "TM" sheet col E (TM Name)
-- Examples: Paras Kumar, Singh Bhawneet, Garg Ravi, Monga Rahul
-- Each TM reports to one RM and manages one territory
-- ============================================================
CREATE TABLE territory_managers (
    id           SMALLINT      NOT NULL AUTO_INCREMENT,
    rm_id        SMALLINT      NOT NULL,
    territory_id SMALLINT      NOT NULL,
    name         VARCHAR(150)  NOT NULL,
    mobile       VARCHAR(15)   NULL,
    email        VARCHAR(150)  NULL,
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_tm_rm
        FOREIGN KEY (rm_id) REFERENCES regional_managers(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_tm_territory
        FOREIGN KEY (territory_id) REFERENCES territories(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================
-- TABLE 10: DISTRIBUTORS
-- Source: "Distributor" sheet
-- Columns: Sr, State, Zone, Region, Territory, Firm Name, Mobile, Category
-- NOTE: Distributors belong to territories (no market column)
-- ============================================================
CREATE TABLE distributors (
    id                INT           NOT NULL AUTO_INCREMENT,
    territory_id      SMALLINT      NOT NULL,
    firm_name         VARCHAR(250)  NOT NULL,
    mobile            VARCHAR(15)   NULL,
    business_category VARCHAR(10)   NULL COMMENT 'A, B, A+, A++ from col K',
    created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_dist_mobile (mobile),
    CONSTRAINT fk_dist_territory
        FOREIGN KEY (territory_id) REFERENCES territories(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================
-- TABLE 11: DEALERS
-- Source: "Dealer" sheet
-- Columns: S.No, State, Zone, Region, Territory, Market Name,
--          Code (col I), Firm Name, Mobile, Category
-- Dealers belong to markets
-- ============================================================
CREATE TABLE dealers (
    id           INT           NOT NULL AUTO_INCREMENT,
    market_id    SMALLINT      NOT NULL,
    firm_name    VARCHAR(250)  NOT NULL,
    dealer_code  VARCHAR(20)   NULL COMMENT 'Col I: Code',
    mobile       VARCHAR(15)   NULL,
    category     VARCHAR(10)   NULL COMMENT 'A, B, A+, A++ from col L',
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_dealer_mobile (mobile),
    CONSTRAINT fk_dealer_market
        FOREIGN KEY (market_id) REFERENCES markets(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================
-- TABLE 12: FARMERS  (Farmer + Farmer 2 sheets → same table)
-- Source: "Farmer" and "Farmer (2)" sheets — identical columns
-- Columns: S.No, State, Zone, Region, Territory, Market Name,
--          Village, Farmer Name, Mobile, Category
-- ============================================================
CREATE TABLE farmers (
    id           INT           NOT NULL AUTO_INCREMENT,
    market_id    SMALLINT      NOT NULL,
    village_id   INT           NULL COMMENT 'Linked after villages loaded',
    name         VARCHAR(150)  NOT NULL,
    mobile       VARCHAR(15)   NULL,
    category     VARCHAR(10)   NULL COMMENT 'A, A+, A++, B from col L',
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_farmer_mobile (mobile),
    INDEX idx_farmer_category (category),
    INDEX idx_farmer_village (village_id),
    CONSTRAINT fk_farmer_market
        FOREIGN KEY (market_id) REFERENCES markets(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_farmer_village
        FOREIGN KEY (village_id) REFERENCES villages(id)
        ON DELETE SET NULL ON UPDATE CASCADE
);


-- ============================================================
-- VERIFY: shows all 12 tables after creation
-- ============================================================
SHOW TABLES;


-- ============================================================
-- SEED DATA — the 4 zones (these never change)
-- ============================================================
INSERT INTO zones (name) VALUES
  ('North'),
  ('South'),
  ('East'),
  ('West');


-- ============================================================
-- SEED DATA — all states with zone and census code
-- From your "Vill Count" and "State" sheets
-- ============================================================
INSERT INTO states (zone_id, name, census_code) VALUES
-- West zone (id=4)
(4, 'Chhattisgarh',           22),
(4, 'Gujarat',                24),
(4, 'Madhya Pradesh',         23),
(4, 'Maharashtra',            27),
-- North zone (id=1)
(1, 'Bihar',                  10),
(1, 'Haryana',                 6),
(1, 'Punjab',                  3),
(1, 'Rajasthan',               8),
(1, 'Uttar Pradesh',           9),
(1, 'Uttarakhand',             5),
-- South zone (id=2)
(2, 'Karnataka',              29),
(2, 'Kerala',                 32),
(2, 'Puducherry',             34),
(2, 'Tamil Nadu',             33),
(2, 'Andhra Pradesh',         28),
(2, 'Telangana',              36),
-- East zone (id=3)
(3, 'Assam',                  18),
(3, 'Manipur',                14),
(3, 'Odisha',                 21),
(3, 'Tripura',                16),
(3, 'West Bengal',            19),
-- States with no current data (from Vill Count)
(1, 'Arunachal Pradesh',      12),
(3, 'Meghalaya',              17),
(3, 'Mizoram',                15),
(3, 'Nagaland',               13),
(3, 'Sikkim',                 11),
(3, 'Andaman and Nicobar Islands', 35),
(1, 'Chandigarh',              4),
(4, 'Dadra and Nagar Haveli', 26),
(4, 'Daman and Diu',          25),
(4, 'Goa',                    30),
(1, 'Himachal Pradesh',        2),
(1, 'Jammu and Kashmir',       1),
(1, 'Jharkhand',              20),
(3, 'Lakshadweep',            31),
(1, 'Nct Of Delhi',            7);


-- ============================================================
-- HOW TO VERIFY YOUR DATA COUNTS AFTER IMPORT
-- Uncomment and run this after loading all your Excel data
-- ============================================================
/*
SELECT 'zones'               AS table_name, COUNT(*) AS row_count FROM zones
UNION ALL SELECT 'states',               COUNT(*) FROM states
UNION ALL SELECT 'regions',              COUNT(*) FROM regions
UNION ALL SELECT 'territories',          COUNT(*) FROM territories
UNION ALL SELECT 'markets',              COUNT(*) FROM markets
UNION ALL SELECT 'villages',             COUNT(*) FROM villages
UNION ALL SELECT 'regional_managers',    COUNT(*) FROM regional_managers
UNION ALL SELECT 'rm_regions',           COUNT(*) FROM rm_regions
UNION ALL SELECT 'territory_managers',   COUNT(*) FROM territory_managers
UNION ALL SELECT 'distributors',         COUNT(*) FROM distributors
UNION ALL SELECT 'dealers',              COUNT(*) FROM dealers
UNION ALL SELECT 'farmers',             COUNT(*) FROM farmers;

-- Expected targets from your master sheet:
-- villages:      482,545
-- distributors:  10,059
-- dealers:       33,911
-- farmers:       1,262,634
*/
