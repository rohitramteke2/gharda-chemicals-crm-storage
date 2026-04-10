-- ============================================================
--  FARMER TABLES — inside existing ZOHO database
--  All our tables are prefixed with  farm_
--  so they're clearly separated from existing ZOHO tables
--
--  HOW TO RUN IN SSMS / DBeaver:
--  1. Make sure ZOHO is selected in the database dropdown
--  2. Open this file
--  3. Ctrl+A to select all  →  click Execute (or F5)
-- ============================================================

USE ZOHO;
GO

-- ============================================================
-- SAFE CLEANUP: drops only OUR farm_ tables, nothing else
-- ============================================================
IF OBJECT_ID('dbo.farm_farmers',            'U') IS NOT NULL DROP TABLE dbo.farm_farmers;
IF OBJECT_ID('dbo.farm_dealers',            'U') IS NOT NULL DROP TABLE dbo.farm_dealers;
IF OBJECT_ID('dbo.farm_distributors',       'U') IS NOT NULL DROP TABLE dbo.farm_distributors;
IF OBJECT_ID('dbo.farm_territory_managers', 'U') IS NOT NULL DROP TABLE dbo.farm_territory_managers;
IF OBJECT_ID('dbo.farm_rm_regions',         'U') IS NOT NULL DROP TABLE dbo.farm_rm_regions;
IF OBJECT_ID('dbo.farm_regional_managers',  'U') IS NOT NULL DROP TABLE dbo.farm_regional_managers;
IF OBJECT_ID('dbo.farm_villages',           'U') IS NOT NULL DROP TABLE dbo.farm_villages;
IF OBJECT_ID('dbo.farm_markets',            'U') IS NOT NULL DROP TABLE dbo.farm_markets;
IF OBJECT_ID('dbo.farm_territories',        'U') IS NOT NULL DROP TABLE dbo.farm_territories;
IF OBJECT_ID('dbo.farm_regions',            'U') IS NOT NULL DROP TABLE dbo.farm_regions;
IF OBJECT_ID('dbo.farm_states',             'U') IS NOT NULL DROP TABLE dbo.farm_states;
IF OBJECT_ID('dbo.farm_zones',              'U') IS NOT NULL DROP TABLE dbo.farm_zones;
GO

-- ============================================================
-- TABLE 1: farm_zones  (North, South, East, West)
-- ============================================================
CREATE TABLE dbo.farm_zones (
    id         TINYINT       NOT NULL IDENTITY(1,1),
    name       NVARCHAR(20)  NOT NULL,
    created_at DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_farm_zones     PRIMARY KEY (id),
    CONSTRAINT UQ_farm_zone_name UNIQUE (name)
);
GO

-- ============================================================
-- TABLE 2: farm_states  (Maharashtra, Punjab, Gujarat...)
-- ============================================================
CREATE TABLE dbo.farm_states (
    id           SMALLINT       NOT NULL IDENTITY(1,1),
    zone_id      TINYINT        NOT NULL,
    name         NVARCHAR(100)  NOT NULL,
    census_code  SMALLINT       NULL,
    created_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_farm_states     PRIMARY KEY (id),
    CONSTRAINT UQ_farm_state_name UNIQUE (name),
    CONSTRAINT FK_farm_state_zone FOREIGN KEY (zone_id)
        REFERENCES dbo.farm_zones(id)
);
GO

-- ============================================================
-- TABLE 3: farm_regions  (Akola, Central MP, Gujarat-1...)
-- ============================================================
CREATE TABLE dbo.farm_regions (
    id         SMALLINT       NOT NULL IDENTITY(1,1),
    state_id   SMALLINT       NOT NULL,
    name       NVARCHAR(100)  NOT NULL,
    created_at DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_farm_regions      PRIMARY KEY (id),
    CONSTRAINT UQ_farm_region_state UNIQUE (state_id, name),
    CONSTRAINT FK_farm_region_state FOREIGN KEY (state_id)
        REFERENCES dbo.farm_states(id)
);
GO

-- ============================================================
-- TABLE 4: farm_territories  (Abohar, Ahmedabad, Bikaner...)
-- ============================================================
CREATE TABLE dbo.farm_territories (
    id         SMALLINT       NOT NULL IDENTITY(1,1),
    region_id  SMALLINT       NOT NULL,
    name       NVARCHAR(100)  NOT NULL,
    created_at DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_farm_territories       PRIMARY KEY (id),
    CONSTRAINT UQ_farm_territory_region  UNIQUE (region_id, name),
    CONSTRAINT FK_farm_territory_region  FOREIGN KEY (region_id)
        REFERENCES dbo.farm_regions(id)
);
GO

-- ============================================================
-- TABLE 5: farm_markets  (ABOHAR, PRANTIJ, SARKHEJ...)
-- ============================================================
CREATE TABLE dbo.farm_markets (
    id           SMALLINT       NOT NULL IDENTITY(1,1),
    territory_id SMALLINT       NOT NULL,
    name         NVARCHAR(100)  NOT NULL,
    created_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_farm_markets          PRIMARY KEY (id),
    CONSTRAINT UQ_farm_market_territory UNIQUE (territory_id, name),
    CONSTRAINT FK_farm_market_territory FOREIGN KEY (territory_id)
        REFERENCES dbo.farm_territories(id)
);
GO

-- ============================================================
-- TABLE 6: farm_villages  (482,545 rows from Demographic sheet)
-- ============================================================
CREATE TABLE dbo.farm_villages (
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
    CONSTRAINT PK_farm_villages          PRIMARY KEY (id),
    CONSTRAINT FK_farm_village_territory FOREIGN KEY (territory_id)
        REFERENCES dbo.farm_territories(id),
    CONSTRAINT FK_farm_village_market    FOREIGN KEY (market_id)
        REFERENCES dbo.farm_markets(id)
);
GO
CREATE INDEX IX_farm_village_name      ON dbo.farm_villages(name);
CREATE INDEX IX_farm_village_territory ON dbo.farm_villages(territory_id);
GO

-- ============================================================
-- TABLE 7: farm_regional_managers  (RM sheet)
-- ============================================================
CREATE TABLE dbo.farm_regional_managers (
    id         SMALLINT       NOT NULL IDENTITY(1,1),
    name       NVARCHAR(150)  NOT NULL,
    mobile     NVARCHAR(15)   NULL,
    email      NVARCHAR(150)  NULL,
    created_at DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_farm_regional_managers PRIMARY KEY (id)
);
GO

-- ============================================================
-- TABLE 8: farm_rm_regions  (one RM manages many regions)
-- ============================================================
CREATE TABLE dbo.farm_rm_regions (
    rm_id     SMALLINT  NOT NULL,
    region_id SMALLINT  NOT NULL,
    CONSTRAINT PK_farm_rm_regions PRIMARY KEY (rm_id, region_id),
    CONSTRAINT FK_farm_rmr_rm     FOREIGN KEY (rm_id)
        REFERENCES dbo.farm_regional_managers(id),
    CONSTRAINT FK_farm_rmr_region FOREIGN KEY (region_id)
        REFERENCES dbo.farm_regions(id)
);
GO

-- ============================================================
-- TABLE 9: farm_territory_managers  (TM sheet)
-- ============================================================
CREATE TABLE dbo.farm_territory_managers (
    id           SMALLINT       NOT NULL IDENTITY(1,1),
    rm_id        SMALLINT       NOT NULL,
    territory_id SMALLINT       NOT NULL,
    name         NVARCHAR(150)  NOT NULL,
    mobile       NVARCHAR(15)   NULL,
    email        NVARCHAR(150)  NULL,
    created_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_farm_territory_managers PRIMARY KEY (id),
    CONSTRAINT FK_farm_tm_rm        FOREIGN KEY (rm_id)
        REFERENCES dbo.farm_regional_managers(id),
    CONSTRAINT FK_farm_tm_territory FOREIGN KEY (territory_id)
        REFERENCES dbo.farm_territories(id)
);
GO

-- ============================================================
-- TABLE 10: farm_distributors  (10,059 rows)
-- ============================================================
CREATE TABLE dbo.farm_distributors (
    id                INT            NOT NULL IDENTITY(1,1),
    territory_id      SMALLINT       NOT NULL,
    firm_name         NVARCHAR(250)  NOT NULL,
    mobile            NVARCHAR(15)   NULL,
    business_category NVARCHAR(10)   NULL,
    created_at        DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at        DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_farm_distributors   PRIMARY KEY (id),
    CONSTRAINT FK_farm_dist_territory FOREIGN KEY (territory_id)
        REFERENCES dbo.farm_territories(id)
);
GO
CREATE INDEX IX_farm_dist_mobile ON dbo.farm_distributors(mobile);
GO

-- ============================================================
-- TABLE 11: farm_dealers  (33,911 rows)
-- ============================================================
CREATE TABLE dbo.farm_dealers (
    id           INT            NOT NULL IDENTITY(1,1),
    market_id    SMALLINT       NOT NULL,
    firm_name    NVARCHAR(250)  NOT NULL,
    dealer_code  NVARCHAR(20)   NULL,
    mobile       NVARCHAR(15)   NULL,
    category     NVARCHAR(10)   NULL,
    created_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_farm_dealers       PRIMARY KEY (id),
    CONSTRAINT FK_farm_dealer_market FOREIGN KEY (market_id)
        REFERENCES dbo.farm_markets(id)
);
GO
CREATE INDEX IX_farm_dealer_mobile ON dbo.farm_dealers(mobile);
GO

-- ============================================================
-- TABLE 12: farm_farmers  (1,262,634 rows — both Farmer sheets)
-- ============================================================
CREATE TABLE dbo.farm_farmers (
    id           INT            NOT NULL IDENTITY(1,1),
    market_id    SMALLINT       NOT NULL,
    village_id   INT            NULL,
    name         NVARCHAR(150)  NOT NULL,
    mobile       NVARCHAR(15)   NULL,
    category     NVARCHAR(10)   NULL,
    created_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_farm_farmers        PRIMARY KEY (id),
    CONSTRAINT FK_farm_farmer_market  FOREIGN KEY (market_id)
        REFERENCES dbo.farm_markets(id),
    CONSTRAINT FK_farm_farmer_village FOREIGN KEY (village_id)
        REFERENCES dbo.farm_villages(id)
);
GO
CREATE INDEX IX_farm_farmer_mobile   ON dbo.farm_farmers(mobile);
CREATE INDEX IX_farm_farmer_category ON dbo.farm_farmers(category);
CREATE INDEX IX_farm_farmer_village  ON dbo.farm_farmers(village_id);
GO

-- ============================================================
-- VERIFY: shows all 12 farm_ tables just created
-- ============================================================
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_CATALOG = 'ZOHO'
  AND TABLE_TYPE    = 'BASE TABLE'
  AND TABLE_NAME LIKE 'farm_%'
ORDER BY TABLE_NAME;
GO

-- ============================================================
-- SEED: 4 Zones
-- ============================================================
INSERT INTO dbo.farm_zones (name)
VALUES ('North'), ('South'), ('East'), ('West');
GO

-- ============================================================
-- SEED: All 35 States with correct zone assignments
-- ============================================================
INSERT INTO dbo.farm_states (zone_id, name, census_code) VALUES
(4, 'Chhattisgarh',                22),
(4, 'Gujarat',                     24),
(4, 'Madhya Pradesh',              23),
(4, 'Maharashtra',                 27),
(1, 'Bihar',                       10),
(1, 'Haryana',                      6),
(1, 'Punjab',                       3),
(1, 'Rajasthan',                    8),
(1, 'Uttar Pradesh',                9),
(1, 'Uttarakhand',                  5),
(2, 'Karnataka',                   29),
(2, 'Kerala',                      32),
(2, 'Puducherry',                  34),
(2, 'Tamil Nadu',                  33),
(2, 'Andhra Pradesh',              28),
(2, 'Telangana',                   36),
(3, 'Assam',                       18),
(3, 'Manipur',                     14),
(3, 'Odisha',                      21),
(3, 'Tripura',                     16),
(3, 'West Bengal',                 19),
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
-- FINAL CHECK: confirm zones and states loaded correctly
-- ============================================================
SELECT 'farm_zones'  AS table_name, COUNT(*) AS row_count FROM dbo.farm_zones
UNION ALL
SELECT 'farm_states', COUNT(*) FROM dbo.farm_states;
GO
