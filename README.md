# sandbox-api

Production-grade Node.js API server for fetching data from **Zoho CRM** and persisting it to the **RDP server** (local storage + MSSQL).

---

## Project Structure

```
sandbox-api/
├── server.js                    # Entry point — bootstrap + graceful shutdown
├── package.json
├── .env                         # Environment variables (never commit)
│
├── storage/
│   └── crm-data/
│       └── {Module}/
│           ├── latest.json      # Most recent full fetch
│           └── snapshots/       # Timestamped snapshots (auto-pruned after 30d)
│
├── logs/
│   ├── combined-YYYY-MM-DD.log  # All logs (daily rotating)
│   ├── error-YYYY-MM-DD.log     # Errors only
│   └── http-YYYY-MM-DD.log      # HTTP access log
│
└── src/
    ├── app.js                   # Express factory (security, routes, middleware)
    ├── config/env.js            # Centralised env config
    ├── routes/
    │   ├── crm.js               # CRM route definitions
    │   └── sql.js               # SQL route definitions
    ├── controllers/
    │   ├── CRMController.js     # Request/response for CRM endpoints
    │   └── SQLController.js     # Request/response for SQL endpoints
    ├── services/
    │   ├── ZohoService.js       # OAuth2 token lifecycle + Zoho API calls
    │   ├── SQLService.js        # MSSQL connection pool + query helpers
    │   └── StorageService.js    # JSON file persistence on RDP disk
    ├── middleware/
    │   ├── errorHandler.js      # Global error handler + AppError class
    │   └── rateLimiter.js       # Rate limiting + API Key auth
    ├── utils/
    │   ├── logger.js            # Winston + daily-rotate-file
    │   └── validator.js         # Joi schemas for all endpoints
    └── store/
        └── CacheStore.js        # In-memory NodeCache (tokens + hot data)
```

---

## Setup

```bash
npm install
cp .env .env.local    # fill in your credentials
npm run dev           # development (nodemon)
npm start             # production
```

---

## API Reference

All routes are prefixed: `/api/v1`  
Auth header required: `X-API-Key: <your_key>`

### Health
| Method | Route     | Description          |
|--------|-----------|----------------------|
| GET    | `/health` | Server health check  |

---

### CRM — `/api/v1/crm`

| Method | Route                          | Description                              |
|--------|-------------------------------|------------------------------------------|
| GET    | `/records`                    | Live fetch from Zoho CRM (paginated)     |
| GET    | `/records/:module/:id`        | Single record by ID                      |
| POST   | `/sync`                       | Fetch ALL records → save to RDP storage  |
| GET    | `/storage/:module`            | Read latest persisted data               |
| GET    | `/storage/:module/snapshots`  | List all saved snapshots                 |

**GET /records query params:**
```
module      required  Leads | Contacts | Accounts | Deals | Tasks
page        default 1
per_page    default 50, max 200
fields      optional  comma-separated field names
sort_by     optional
sort_order  asc | desc (default desc)
```

**POST /sync body:**
```json
{ "module": "Leads", "overwrite": false }
```

---

### SQL — `/api/v1/sql`

| Method | Route                  | Description                              |
|--------|------------------------|------------------------------------------|
| GET    | `/query`               | SELECT rows from RDP SQL table           |
| POST   | `/insert`              | Bulk INSERT into SQL table               |
| POST   | `/import/:module`      | Import CRM storage file into SQL table   |
| GET    | `/health`              | SQL Server connectivity check            |

**GET /query params:**
```
table    required
where    optional  JSON object { col: val }
limit    default 100, max 1000
offset   default 0
```

**POST /import/:module body:**
```json
{ "table": "crm_leads" }
```

---

## Logging

Logs are written day-by-day under `./logs/`:

| File                        | Content                  | Retention |
|-----------------------------|--------------------------|-----------|
| `combined-YYYY-MM-DD.log`   | All log levels           | 30 days   |
| `error-YYYY-MM-DD.log`      | Errors only              | 30 days   |
| `http-YYYY-MM-DD.log`       | HTTP access log (Morgan) | 14 days   |

Files are gzip-compressed after rotation and auto-deleted per retention policy.

---

## SOLID Principles Applied

| Principle | Where |
|-----------|-------|
| **S** — Single Responsibility | Each service/controller has one job |
| **O** — Open/Closed | SQLService query methods are extensible without modification |
| **L** — Liskov Substitution | Services are injectable and swappable |
| **I** — Interface Segregation | Controllers only import the service they need |
| **D** — Dependency Inversion | App depends on service abstractions, not implementations |
