-- ============================================================
--  FARMER_DB — SQL SERVER SCHEMA
--  Corrected for Microsoft SQL Server (version 15.x)
--  Run this in SSMS or DBeaver connected to your SQL Server
--
--  IMPORTANT: This creates a brand new database called farmer_db
--  It does NOT touch any existing databases on the server
-- ============================================================

-- ============================================================
-- CREATE THE DATABASE (runs once, safe to re-run)
-- ============================================================
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'farmer_db')
BEGIN
    CREATE DATABASE farmer_db;
END
GO

USE farmer_db;
GO

-- ============================================================
-- DROP TABLES in reverse order (children before parents)
-- ============================================================
IF OBJECT_ID('dbo.farmers',             'U') IS NOT NULL DROP TABLE dbo.farmers;
IF OBJECT_ID('dbo.dealers',             'U') IS NOT NULL DROP TABLE dbo.dealers;
IF OBJECT_ID('dbo.distributors',        'U') IS NOT NULL DROP TABLE dbo.distributors;
IF OBJECT_ID('dbo.territory_managers',  'U') IS NOT NULL DROP TABLE dbo.territory_managers;
IF OBJECT_ID('dbo.rm_regions',          'U') IS NOT NULL DROP TABLE dbo.rm_regions;
IF OBJECT_ID('dbo.regional_managers',   'U') IS NOT NULL DROP TABLE dbo.regional_managers;
IF OBJECT_ID('dbo.villages',            'U') IS NOT NULL DROP TABLE dbo.villages;
IF OBJECT_ID('dbo.markets',             'U') IS NOT NULL DROP TABLE dbo.markets;
IF OBJECT_ID('dbo.territories',         'U') IS NOT NULL DROP TABLE dbo.territories;
IF OBJECT_ID('dbo.regions',             'U') IS NOT NULL DROP TABLE dbo.regions;
IF OBJECT_ID('dbo.states',              'U') IS NOT NULL DROP TABLE dbo.states;
IF OBJECT_ID('dbo.zones',               'U') IS NOT NULL DROP TABLE dbo.zones;
GO

-- ============================================================
-- TABLE 1: ZONES
-- Values: North, South, East, West
-- ============================================================
CREATE TABLE dbo.zones (
    id         TINYINT       NOT NULL IDENTITY(1,1),
    name       NVARCHAR(20)  NOT NULL,
    created_at DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_zones PRIMARY KEY (id),
    CONSTRAINT UQ_zone_name UNIQUE (name)
);
GO

-- ============================================================
-- TABLE 2: STATES
-- Examples: Maharashtra, Punjab, Gujarat, West Bengal
-- ============================================================
CREATE TABLE dbo.states (
    id           SMALLINT       NOT NULL IDENTITY(1,1),
    zone_id      TINYINT        NOT NULL,
    name         NVARCHAR(100)  NOT NULL,
    census_code  SMALLINT       NULL,
    created_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_states PRIMARY KEY (id),
    CONSTRAINT UQ_state_name UNIQUE (name),
    CONSTRAINT FK_state_zone FOREIGN KEY (zone_id)
        REFERENCES dbo.zones(id)
);
GO

-- ============================================================
-- TABLE 3: REGIONS
-- Examples: Akola, Central MP, Gujarat-1, Panjab-2
-- ============================================================
CREATE TABLE dbo.regions (
    id         SMALLINT       NOT NULL IDENTITY(1,1),
    state_id   SMALLINT       NOT NULL,
    name       NVARCHAR(100)  NOT NULL,
    created_at DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_regions PRIMARY KEY (id),
    CONSTRAINT UQ_region_state UNIQUE (state_id, name),
    CONSTRAINT FK_region_state FOREIGN KEY (state_id)
        REFERENCES dbo.states(id)
);
GO

-- ============================================================
-- TABLE 4: TERRITORIES
-- Examples: Jalandhar, Bikaner, Abohar, Ahmedabad
-- ============================================================
CREATE TABLE dbo.territories (
    id         SMALLINT       NOT NULL IDENTITY(1,1),
    region_id  SMALLINT       NOT NULL,
    name       NVARCHAR(100)  NOT NULL,
    created_at DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_territories PRIMARY KEY (id),
    CONSTRAINT UQ_territory_region UNIQUE (region_id, name),
    CONSTRAINT FK_territory_region FOREIGN KEY (region_id)
        REFERENCES dbo.regions(id)
);
GO

-- ============================================================
-- TABLE 5: MARKETS
-- Examples: ABOHAR, PRANTIJ, SARKHEJ, BAVLA
-- ============================================================
CREATE TABLE dbo.markets (
    id           SMALLINT       NOT NULL IDENTITY(1,1),
    territory_id SMALLINT       NOT NULL,
    name         NVARCHAR(100)  NOT NULL,
    created_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_markets PRIMARY KEY (id),
    CONSTRAINT UQ_market_territory UNIQUE (territory_id, name),
    CONSTRAINT FK_market_territory FOREIGN KEY (territory_id)
        REFERENCES dbo.territories(id)
);
GO

-- ============================================================
-- TABLE 6: VILLAGES
-- From "Demographic info" sheet — 482,545 rows
-- ============================================================
CREATE TABLE dbo.villages (
    id                    INT             NOT NULL IDENTITY(1,1),
    territory_id          SMALLINT        NOT NULL,
    market_id             SMALLINT        NULL,
    name                  NVARCHAR(150)   NOT NULL,
    district              NVARCHAR(100)   NULL,
    taluk                 NVARCHAR(100)   NULL,
    geographical_area_km2 DECIMAL(10,2)   NULL,
    population            INT             NULL,
    acreage               DECIMAL(12,2)   NULL,
    hectares              DECIMAL(12,2)   NULL,
    created_at            DATETIME2       NOT NULL DEFAULT GETDATE(),
    updated_at            DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_villages PRIMARY KEY (id),
    CONSTRAINT FK_village_territory FOREIGN KEY (territory_id)
        REFERENCES dbo.territories(id),
    CONSTRAINT FK_village_market FOREIGN KEY (market_id)
        REFERENCES dbo.markets(id)
);
GO
CREATE INDEX IX_village_name      ON dbo.villages(name);
CREATE INDEX IX_village_territory ON dbo.villages(territory_id);
GO

-- ============================================================
-- TABLE 7: REGIONAL MANAGERS
-- From "RM" sheet — Mr. Kapil Krishan, Mr. Pawan Sharma etc.
-- ============================================================
CREATE TABLE dbo.regional_managers (
    id         SMALLINT       NOT NULL IDENTITY(1,1),
    name       NVARCHAR(150)  NOT NULL,
    mobile     NVARCHAR(15)   NULL,
    email      NVARCHAR(150)  NULL,
    created_at DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_regional_managers PRIMARY KEY (id)
);
GO

-- ============================================================
-- TABLE 8: RM → REGION ASSIGNMENTS
-- One RM can manage multiple regions
-- ============================================================
CREATE TABLE dbo.rm_regions (
    rm_id     SMALLINT  NOT NULL,
    region_id SMALLINT  NOT NULL,
    CONSTRAINT PK_rm_regions PRIMARY KEY (rm_id, region_id),
    CONSTRAINT FK_rmr_rm     FOREIGN KEY (rm_id)     REFERENCES dbo.regional_managers(id),
    CONSTRAINT FK_rmr_region FOREIGN KEY (region_id) REFERENCES dbo.regions(id)
);
GO

-- ============================================================
-- TABLE 9: TERRITORY MANAGERS
-- From "TM" sheet — Paras Kumar, Singh Bhawneet etc.
-- ============================================================
CREATE TABLE dbo.territory_managers (
    id           SMALLINT       NOT NULL IDENTITY(1,1),
    rm_id        SMALLINT       NOT NULL,
    territory_id SMALLINT       NOT NULL,
    name         NVARCHAR(150)  NOT NULL,
    mobile       NVARCHAR(15)   NULL,
    email        NVARCHAR(150)  NULL,
    created_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_territory_managers PRIMARY KEY (id),
    CONSTRAINT FK_tm_rm        FOREIGN KEY (rm_id)        REFERENCES dbo.regional_managers(id),
    CONSTRAINT FK_tm_territory FOREIGN KEY (territory_id) REFERENCES dbo.territories(id)
);
GO

-- ============================================================
-- TABLE 10: DISTRIBUTORS
-- From "Distributor" sheet — 10,059 rows
-- ============================================================
CREATE TABLE dbo.distributors (
    id                INT            NOT NULL IDENTITY(1,1),
    territory_id      SMALLINT       NOT NULL,
    firm_name         NVARCHAR(250)  NOT NULL,
    mobile            NVARCHAR(15)   NULL,
    business_category NVARCHAR(10)   NULL,
    created_at        DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at        DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_distributors PRIMARY KEY (id),
    CONSTRAINT FK_dist_territory FOREIGN KEY (territory_id)
        REFERENCES dbo.territories(id)
);
GO
CREATE INDEX IX_dist_mobile ON dbo.distributors(mobile);
GO

-- ============================================================
-- TABLE 11: DEALERS
-- From "Dealer" sheet — 33,911 rows
-- ============================================================
CREATE TABLE dbo.dealers (
    id           INT            NOT NULL IDENTITY(1,1),
    market_id    SMALLINT       NOT NULL,
    firm_name    NVARCHAR(250)  NOT NULL,
    dealer_code  NVARCHAR(20)   NULL,
    mobile       NVARCHAR(15)   NULL,
    category     NVARCHAR(10)   NULL,
    created_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_dealers PRIMARY KEY (id),
    CONSTRAINT FK_dealer_market FOREIGN KEY (market_id)
        REFERENCES dbo.markets(id)
);
GO
CREATE INDEX IX_dealer_mobile ON dbo.dealers(mobile);
GO

-- ============================================================
-- TABLE 12: FARMERS  (Farmer + Farmer 2 sheets → same table)
-- From both Farmer sheets — 1,262,634 rows total
-- ============================================================
CREATE TABLE dbo.farmers (
    id           INT            NOT NULL IDENTITY(1,1),
    market_id    SMALLINT       NOT NULL,
    village_id   INT            NULL,
    name         NVARCHAR(150)  NOT NULL,
    mobile       NVARCHAR(15)   NULL,
    category     NVARCHAR(10)   NULL,
    created_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_farmers PRIMARY KEY (id),
    CONSTRAINT FK_farmer_market  FOREIGN KEY (market_id)  REFERENCES dbo.markets(id),
    CONSTRAINT FK_farmer_village FOREIGN KEY (village_id) REFERENCES dbo.villages(id)
);
GO
CREATE INDEX IX_farmer_mobile   ON dbo.farmers(mobile);
CREATE INDEX IX_farmer_category ON dbo.farmers(category);
CREATE INDEX IX_farmer_village  ON dbo.farmers(village_id);
GO

-- ============================================================
-- VERIFY: list all 12 tables
-- ============================================================
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_CATALOG = 'farmer_db'
  AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
GO

-- ============================================================
-- SEED: 4 Zones
-- ============================================================
INSERT INTO dbo.zones (name) VALUES ('North'), ('South'), ('East'), ('West');
GO

-- ============================================================
-- SEED: All 35 States with census codes
-- ============================================================
INSERT INTO dbo.states (zone_id, name, census_code) VALUES
-- West (zone id=4)
(4, 'Chhattisgarh',                22),
(4, 'Gujarat',                     24),
(4, 'Madhya Pradesh',              23),
(4, 'Maharashtra',                 27),
-- North (zone id=1)
(1, 'Bihar',                       10),
(1, 'Haryana',                      6),
(1, 'Punjab',                       3),
(1, 'Rajasthan',                    8),
(1, 'Uttar Pradesh',                9),
(1, 'Uttarakhand',                  5),
-- South (zone id=2)
(2, 'Karnataka',                   29),
(2, 'Kerala',                      32),
(2, 'Puducherry',                  34),
(2, 'Tamil Nadu',                  33),
(2, 'Andhra Pradesh',              28),
(2, 'Telangana',                   36),
-- East (zone id=3)
(3, 'Assam',                       18),
(3, 'Manipur',                     14),
(3, 'Odisha',                      21),
(3, 'Tripura',                     16),
(3, 'West Bengal',                 19),
-- States present in master data but no active records yet
(1, 'Arunachal Pradesh',           12),
(3, 'Meghalaya',                   17),
(3, 'Mizoram',                     15),
(3, 'Nagaland',                    13),
(3, 'Sikkim',                      11),
(3, 'Andaman and Nicobar Islands', 35),
(1, 'Chandigarh',                   4),
(4, 'Dadra and Nagar Haveli',      26),
(4, 'Daman and Diu',               25),
(4, 'Goa',                         30),
(1, 'Himachal Pradesh',             2),
(1, 'Jammu and Kashmir',            1),
(1, 'Jharkhand',                   20),
(3, 'Lakshadweep',                 31),
(1, 'Nct Of Delhi',                 7);
GO

-- ============================================================
-- FINAL CHECK: row counts
-- ============================================================
SELECT 'zones'  AS tbl, COUNT(*) AS rows FROM dbo.zones
UNION ALL SELECT 'states', COUNT(*) FROM dbo.states;
GO