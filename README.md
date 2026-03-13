# Zoho CRM Attachment API

Node.js Express server that downloads attachments from Zoho CRM and stores them on the RDP/VM disk.

---

## Project structure

```
zoho-attachment-api/
├── server.js                          ← Entry point (loads .env, boots cluster)
├── package.json
├── .env.development                   ← Local machine config
├── .env.production                    ← RDP / VM server config
│
└── src/
    ├── app.js                         ← Express factory (routes, middleware)
    ├── config/
    │   └── env.js                     ← Central config + SSL agent
    ├── routes/
    │   ├── attachments.js             ← PRIMARY — attachment endpoints
    │   └── crm.js                     ← EXTRA — record fetching
    ├── controllers/
    │   ├── AttachmentController.js     ← Request/response for attachments
    │   └── CRMController.js           ← Request/response for records
    ├── services/
    │   ├── ZohoAuthService.js         ← OAuth token lifecycle
    │   ├── ZohoAttachmentService.js   ← List + download + store attachments
    │   └── ZohoCRMService.js          ← Fetch CRM records
    ├── middleware/
    │   ├── auth.js                    ← API key + rate limiter
    │   └── errorHandler.js            ← Global error handler
    └── utils/
        ├── logger.js                  ← Winston + daily rotation
        └── cache.js                   ← In-memory token/data cache
```

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment

**Local development** — edit `.env.development`:
- Fill in your sandbox/dev Zoho credentials
- `npm run dev` automatically uses this file

**RDP production** — edit `.env.production`:
- Fill in the Gharda production credentials
- Paste a fresh refresh token
- Set storage paths to Windows directories
- `npm start` automatically uses this file

### 3. Run

```bash
# Development (auto-reloads on file changes)
npm run dev

# Production (on the RDP server)
npm start
```

### 4. Verify connectivity

Open in browser: **`http://localhost:3000/debug/zoho`**

This shows:
- Whether credentials are loaded (or still placeholders)
- Whether Zoho accounts and API domains are reachable
- Whether token refresh works
- The exact error code if anything fails

---

## API Reference

All protected routes require: `X-API-Key: <your_key>` header.
Base path: `/api/v1`

### Public routes (no auth)

| Method | Route         | Description                          |
|--------|---------------|--------------------------------------|
| GET    | `/health`     | Server health check                  |
| GET    | `/debug/zoho` | Zoho connectivity diagnostics        |

### PRIMARY — Attachments

| Method | Route                                              | Description                              |
|--------|----------------------------------------------------|------------------------------------------|
| GET    | `/api/v1/attachments/:module/:recordId`            | List attachments (metadata only)         |
| POST   | `/api/v1/attachments/:module/:recordId/download`   | Download ALL attachments → return paths  |
| POST   | `/api/v1/attachments/:module/:recordId/download/:attachmentId` | Download ONE attachment → return path |

#### List attachments

```
GET /api/v1/attachments/Leads/1113843000000696206
X-API-Key: your-key
```

Response:
```json
{
  "success": true,
  "data": {
    "module": "Leads",
    "recordId": "1113843000000696206",
    "count": 3,
    "attachments": [
      {
        "id": "1113843000000703001",
        "fileName": "proposal.pdf",
        "size": 245760,
        "createdBy": "John Doe",
        "createdAt": "2026-03-10T09:30:00+05:30"
      }
    ]
  }
}
```

#### Download all attachments

```
POST /api/v1/attachments/Leads/1113843000000696206/download
X-API-Key: your-key
```

Response:
```json
{
  "success": true,
  "data": {
    "module": "Leads",
    "recordId": "1113843000000696206",
    "total": 3,
    "downloaded": 3,
    "failed": 0,
    "attachments": [
      {
        "attachmentId": "1113843000000703001",
        "fileName": "proposal.pdf",
        "filePath": "C:\\Users\\zoho.crm\\Desktop\\storage\\attachments\\Leads\\1113843000000696206\\proposal.pdf",
        "size": 245760,
        "status": "ok"
      }
    ]
  }
}
```

#### Download single attachment

```
POST /api/v1/attachments/Leads/1113843000000696206/download/1113843000000703001
X-API-Key: your-key
Content-Type: application/json

{ "fileName": "proposal.pdf" }
```

If `fileName` is omitted, the API looks it up from Zoho automatically.

### EXTRA — CRM Records

| Method | Route                           | Description                  |
|--------|---------------------------------|------------------------------|
| GET    | `/api/v1/crm/records`           | Fetch records (paginated)    |
| GET    | `/api/v1/crm/records/:module/:id` | Fetch single record by ID  |

Query params for `/crm/records`:
```
module      required    Leads | Contacts | Accounts | Deals
page        default 1
per_page    default 50, max 200
fields      optional    comma-separated field names
sort_by     optional
sort_order  asc | desc (default desc)
```

---

## File storage layout

```
ATTACHMENT_DIR/
└── {Module}/
    └── {RecordId}/
        ├── proposal.pdf
        ├── contract.docx
        └── photo.jpg
```

---

## Environment file loading

The server picks the correct `.env` file automatically based on `NODE_ENV`:

| NODE_ENV      | File loaded          | Command          |
|---------------|----------------------|------------------|
| `development` | `.env.development`   | `npm run dev`    |
| `production`  | `.env.production`    | `npm start`      |

On startup, the console prints which file was loaded:
```
  ENV loaded from: /path/to/.env.production  (NODE_ENV=production)
```

---

## SSL handling

The SSL agent is created automatically when needed:

| Condition | SSL verification |
|-----------|-----------------|
| Standard Zoho cloud (`*.zohoapis.in`) | Normal (verified) |
| Private instance (`zoho.gharda.com:14443`) | Auto-bypassed |
| `ZOHO_SKIP_SSL_VERIFY=true` | Explicitly bypassed |

---

## Troubleshooting

### "invalid_client" error
- `redirect_uri` doesn't match Zoho API Console registration (even a trailing slash matters)
- Wrong `client_id` or `client_secret` for the target Zoho instance
- Using cloud credentials against the private instance or vice versa

### "general_error" from Zoho
- Refresh token expired or revoked — generate a new one
- Zoho service temporarily down

### 401 Unauthorized on record/attachment calls
- Access token obtained but scopes are insufficient
- Regenerate with: `ZohoCRM.modules.ALL,ZohoCRM.settings.ALL`

### SSL errors
| Error code | Meaning | Fix |
|---|---|---|
| `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | Self-signed cert | Set `ZOHO_SKIP_SSL_VERIFY=true` |
| `DEPTH_ZERO_SELF_SIGNED_CERT` | Self-signed cert | Set `ZOHO_SKIP_SSL_VERIFY=true` |
| `ECONNREFUSED` | Port not open | Check if Zoho server is running |
| `ENOTFOUND` | DNS failure | Check hostname resolution on RDP |
| `ETIMEDOUT` | Firewall | Check outbound firewall rules |
