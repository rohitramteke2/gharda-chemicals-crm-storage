/**
 * views/pages.js — Server-rendered HTML templates for the account file browser.
 *
 * Design: Clean, professional, dark-themed UI inspired by file managers.
 * No external dependencies — pure HTML/CSS/JS.
 */

// ── Shared CSS ──────────────────────────────────────────────────────────────

const BASE_CSS = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
        --bg:          #0f1117;
        --surface:     #1a1d27;
        --surface-2:   #242836;
        --border:      #2e3346;
        --text:        #e4e6ef;
        --text-muted:  #8b8fa3;
        --accent:      #4f8fff;
        --accent-glow: rgba(79, 143, 255, 0.15);
        --green:       #34d399;
        --red:         #f87171;
        --orange:      #fbbf24;
        --radius:      10px;
        --font:        'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
        --mono:        'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace;
    }
    body {
        font-family: var(--font);
        background: var(--bg);
        color: var(--text);
        line-height: 1.6;
        min-height: 100vh;
    }
    a { color: var(--accent); text-decoration: none; transition: opacity 0.2s; }
    a:hover { opacity: 0.8; }

    .container { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }

    /* Header */
    .header {
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        padding: 20px 0;
        margin-bottom: 32px;
    }
    .header-inner {
        max-width: 1100px; margin: 0 auto; padding: 0 24px;
        display: flex; align-items: center; justify-content: space-between;
    }
    .logo {
        font-size: 18px; font-weight: 700; color: var(--text);
        display: flex; align-items: center; gap: 10px;
    }
    .logo-icon {
        width: 32px; height: 32px; background: var(--accent);
        border-radius: 8px; display: flex; align-items: center; justify-content: center;
        font-size: 16px; color: white;
    }
    .nav { display: flex; gap: 20px; font-size: 14px; }
    .nav a { color: var(--text-muted); }
    .nav a:hover, .nav a.active { color: var(--accent); }

    /* Breadcrumb */
    .breadcrumb {
        font-size: 13px; color: var(--text-muted); margin-bottom: 24px;
        display: flex; align-items: center; gap: 8px;
    }
    .breadcrumb span { color: var(--border); }

    /* Cards */
    .card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 24px;
        margin-bottom: 16px;
        transition: border-color 0.2s, box-shadow 0.2s;
    }
    .card:hover {
        border-color: var(--accent);
        box-shadow: 0 0 0 1px var(--accent-glow), 0 4px 24px rgba(0,0,0,0.2);
    }
    .card-link { display: block; color: inherit; }
    .card-link:hover { opacity: 1; }

    /* Stats row */
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .stat-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 20px;
        text-align: center;
    }
    .stat-value { font-size: 32px; font-weight: 700; color: var(--accent); }
    .stat-label { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

    /* Badge */
    .badge {
        display: inline-block; padding: 3px 10px; border-radius: 20px;
        font-size: 12px; font-weight: 600; letter-spacing: 0.3px;
    }
    .badge-ok { background: rgba(52, 211, 153, 0.15); color: var(--green); }
    .badge-fail { background: rgba(248, 113, 113, 0.15); color: var(--red); }
    .badge-empty { background: rgba(139, 143, 163, 0.15); color: var(--text-muted); }
    .badge-warn { background: rgba(251, 191, 36, 0.15); color: var(--orange); }

    /* Table */
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th {
        text-align: left; padding: 12px 16px; font-size: 12px;
        text-transform: uppercase; letter-spacing: 0.5px;
        color: var(--text-muted); border-bottom: 1px solid var(--border);
        background: var(--surface);
    }
    td {
        padding: 14px 16px; border-bottom: 1px solid var(--border);
        vertical-align: middle;
    }
    tr:hover td { background: var(--surface-2); }

    /* File icon */
    .file-icon {
        width: 36px; height: 36px; border-radius: 8px;
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 11px; font-weight: 700; color: white;
        flex-shrink: 0;
    }
    .fi-pdf  { background: #e74c3c; }
    .fi-img  { background: #9b59b6; }
    .fi-doc  { background: #3498db; }
    .fi-xls  { background: #27ae60; }
    .fi-zip  { background: #f39c12; }
    .fi-txt  { background: #95a5a6; }
    .fi-other { background: #7f8c8d; }

    /* Empty state */
    .empty {
        text-align: center; padding: 60px 20px; color: var(--text-muted);
    }
    .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.3; }
    .empty-title { font-size: 18px; color: var(--text); margin-bottom: 8px; }

    /* Buttons */
    .btn {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 10px 20px; border-radius: 8px;
        font-size: 14px; font-weight: 600;
        border: none; cursor: pointer; transition: all 0.2s;
        font-family: var(--font);
    }
    .btn-primary { background: var(--accent); color: white; }
    .btn-primary:hover { background: #3d7ae6; }
    .btn-secondary { background: var(--surface-2); color: var(--text); border: 1px solid var(--border); }
    .btn-secondary:hover { border-color: var(--accent); }

    /* Mono text */
    .mono { font-family: var(--mono); font-size: 13px; }

    /* Size helper */
    .text-sm { font-size: 13px; }
    .text-muted { color: var(--text-muted); }

    /* Footer */
    .footer {
        margin-top: 60px; padding: 24px 0;
        border-top: 1px solid var(--border);
        text-align: center; font-size: 12px; color: var(--text-muted);
    }

    /* Responsive */
    @media (max-width: 768px) {
        .stats { grid-template-columns: 1fr 1fr; }
        .header-inner { flex-direction: column; gap: 12px; }
    }
`;


// ── Helper functions ────────────────────────────────────────────────────────

function formatSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function getFileIconClass(fileName) {
    const ext = (fileName || '').split('.').pop().toLowerCase();
    if (['pdf'].includes(ext))                          return 'fi-pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'fi-img';
    if (['doc', 'docx'].includes(ext))                  return 'fi-doc';
    if (['xls', 'xlsx', 'csv'].includes(ext))           return 'fi-xls';
    if (['zip', 'rar', '7z'].includes(ext))             return 'fi-zip';
    if (['txt', 'log'].includes(ext))                   return 'fi-txt';
    return 'fi-other';
}

function getFileExt(fileName) {
    return (fileName || '').split('.').pop().toUpperCase() || '?';
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}


// ── Layout wrapper ──────────────────────────────────────────────────────────

function layout(title, breadcrumbs, bodyHtml) {
    const crumbs = breadcrumbs.map((b, i) => {
        if (i === breadcrumbs.length - 1) return escapeHtml(b.label);
        return `<a href="${escapeHtml(b.href)}">${escapeHtml(b.label)}</a>`;
    }).join(' <span>›</span> ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} — Gharda CRM Files</title>
    <style>${BASE_CSS}</style>
</head>
<body>
    <div class="header">
        <div class="header-inner">
            <div class="logo">
                <div class="logo-icon">G</div>
                Gharda CRM File Manager
            </div>
            <nav class="nav">
                <a href="/pages/accounts">Accounts</a>
                <a href="/pages/docs">API Docs</a>
                <a href="/health">API Health</a>
                <a href="/debug/zoho">Debug</a>
            </nav>
        </div>
    </div>

    <div class="container">
        <div class="breadcrumb">${crumbs}</div>
        ${bodyHtml}
        <div class="footer">
            Gharda Chemicals — Zoho CRM Integration &middot; Fristine Infotech
        </div>
    </div>
</body>
</html>`;
}


// ════════════════════════════════════════════════════════════════════════════
//  PAGE: Dashboard — List all downloaded accounts
// ════════════════════════════════════════════════════════════════════════════

export function renderDashboard(accounts = []) {
    const totalFiles = accounts.reduce((s, a) => s + a.fileCount, 0);
    const totalSize  = accounts.reduce((s, a) => s + a.totalSize, 0);

    let body = `
        <h1 style="font-size: 24px; margin-bottom: 8px;">Accounts — File Manager</h1>
        <p class="text-muted text-sm" style="margin-bottom: 28px;">
            Browse and download files synced from Zoho CRM File Upload fields (Distributor layout).
        </p>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${accounts.length}</div>
                <div class="stat-label">Accounts Synced</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalFiles}</div>
                <div class="stat-label">Total Files</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${formatSize(totalSize)}</div>
                <div class="stat-label">Total Size</div>
            </div>
        </div>
    `;

    if (accounts.length === 0) {
        body += `
            <div class="empty">
                <div class="empty-icon">📂</div>
                <div class="empty-title">No accounts synced yet</div>
                <p class="text-sm">Use <code class="mono">POST /api/v1/accounts/sync</code> to sync approved accounts.</p>
            </div>
        `;
    } else {
        body += `
            <div class="card" style="padding: 0; overflow: hidden;">
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>SAP ID</th>
                                <th>Files</th>
                                <th>Size</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${accounts.map(a => `
                                <tr>
                                    <td>
                                        <a href="/pages/accounts/${escapeHtml(a.sapId)}" style="font-weight: 600;">
                                            ${escapeHtml(a.sapId)}
                                        </a>
                                    </td>
                                    <td>
                                        ${a.fileCount > 0
                                            ? `<span class="badge badge-ok">${a.fileCount} files</span>`
                                            : `<span class="badge badge-empty">Empty</span>`
                                        }
                                    </td>
                                    <td class="text-muted text-sm">${formatSize(a.totalSize)}</td>
                                    <td>
                                        <a href="/pages/accounts/${escapeHtml(a.sapId)}" class="btn btn-secondary" style="padding: 6px 14px; font-size: 12px;">
                                            Browse Files →
                                        </a>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    return layout('Accounts', [
        { label: 'Home', href: '/pages/accounts' },
        { label: 'Accounts' },
    ], body);
}


// ════════════════════════════════════════════════════════════════════════════
//  PAGE: Account Detail — Browse files for a specific account
// ════════════════════════════════════════════════════════════════════════════

export function renderAccountFiles(sapId, data) {
    if (!data) {
        return renderError(404, 'Account Not Found',
            `No downloaded files found for SAP ID: <strong>${escapeHtml(sapId)}</strong>. ` +
            `Either the account hasn't been synced yet, or the SAP ID is incorrect.`
        );
    }

    let body = `
        <h1 style="font-size: 24px; margin-bottom: 8px;">${escapeHtml(sapId)}</h1>
        <p class="text-muted text-sm" style="margin-bottom: 28px;">
            Files downloaded from Zoho CRM File Upload fields.
        </p>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${data.totalFiles}</div>
                <div class="stat-label">Total Files</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${formatSize(data.totalSize)}</div>
                <div class="stat-label">Total Size</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${data.fields.length}</div>
                <div class="stat-label">Field Folders</div>
            </div>
        </div>
    `;

    if (data.fields.length === 0) {
        body += `
            <div class="empty">
                <div class="empty-icon">📄</div>
                <div class="empty-title">No files downloaded yet</div>
                <p class="text-sm">Use <code class="mono">POST /api/v1/accounts/${escapeHtml(sapId)}/sync</code> to sync files.</p>
            </div>
        `;
    } else {
        for (const field of data.fields) {
            body += `
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div>
                            <div style="font-weight: 600; font-size: 15px;">${escapeHtml(field.fieldLabel)}</div>
                            <div class="mono text-muted" style="font-size: 11px; margin-top: 2px;">${escapeHtml(field.fieldApiName)}</div>
                        </div>
                        <span class="badge ${field.fieldType === 'image_upload' ? 'badge-warn' : 'badge-ok'}">
                            ${escapeHtml(field.fieldType === 'image_upload' ? 'Image' : 'File Upload')}
                        </span>
                    </div>
            `;

            if (field.files.length === 0) {
                body += `<div class="text-muted text-sm" style="padding: 12px 0;">No files in this field</div>`;
            } else {
                body += `<div class="table-wrap"><table>
                    <thead>
                        <tr>
                            <th style="width: 50px;"></th>
                            <th>File Name</th>
                            <th>Size</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>`;

                for (const file of field.files) {
                    const iconClass = getFileIconClass(file.name);
                    const ext       = getFileExt(file.name);

                    body += `
                        <tr>
                            <td><div class="file-icon ${iconClass}">${escapeHtml(ext.slice(0, 4))}</div></td>
                            <td>
                                <div style="font-weight: 500;">${escapeHtml(file.name)}</div>
                            </td>
                            <td class="text-muted text-sm">${formatSize(file.size)}</td>
                            <td>
                                <a href="${escapeHtml(file.url)}" target="_blank" class="btn btn-primary" style="padding: 6px 14px; font-size: 12px;">
                                    Download
                                </a>
                            </td>
                        </tr>
                    `;
                }

                body += `</tbody></table></div>`;
            }

            body += `</div>`;
        }
    }

    return layout(`Account ${sapId}`, [
        { label: 'Home', href: '/pages/accounts' },
        { label: 'Accounts', href: '/pages/accounts' },
        { label: sapId },
    ], body);
}


// ════════════════════════════════════════════════════════════════════════════
//  PAGE: Sync Result — Show result after syncing an account
// ════════════════════════════════════════════════════════════════════════════

export function renderSyncResult(result) {
    const isSuccess = result.status_api_check;

    let body = `
        <div style="text-align: center; margin-bottom: 32px;">
            <div style="font-size: 48px; margin-bottom: 12px;">${isSuccess ? '✅' : '⚠️'}</div>
            <h1 style="font-size: 24px; margin-bottom: 8px;">
                Sync ${isSuccess ? 'Complete' : 'Completed with Issues'}
            </h1>
            <p class="text-muted text-sm">
                Account: <strong>${escapeHtml(result.accountName || result.sapId)}</strong>
                ${result.sapId ? ` &middot; SAP ID: <span class="mono">${escapeHtml(result.sapId)}</span>` : ''}
            </p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-value" style="color: var(--green);">${result.summary?.downloaded || 0}</div>
                <div class="stat-label">Downloaded</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: var(--red);">${result.summary?.failed || 0}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: var(--text-muted);">${result.summary?.fields_empty || 0}</div>
                <div class="stat-label">Empty Fields</div>
            </div>
        </div>

        <div class="card">
            <div style="font-weight: 600; margin-bottom: 8px;">Storage URL</div>
            <div class="mono" style="padding: 12px; background: var(--bg); border-radius: 8px; word-break: break-all;">
                <a href="${escapeHtml(result.storage_url || '#')}" target="_blank">${escapeHtml(result.storage_url || 'N/A')}</a>
            </div>
        </div>

        <div class="card">
            <div style="font-weight: 600; margin-bottom: 8px;">status_api_check</div>
            <span class="badge ${isSuccess ? 'badge-ok' : 'badge-fail'}">${isSuccess}</span>
        </div>

        <div style="text-align: center; margin-top: 24px;">
            <a href="/pages/accounts/${escapeHtml(result.sapId || '')}" class="btn btn-primary">Browse Files →</a>
            <a href="/pages/accounts" class="btn btn-secondary" style="margin-left: 12px;">← Back to Accounts</a>
        </div>
    `;

    return layout('Sync Result', [
        { label: 'Home', href: '/pages/accounts' },
        { label: 'Accounts', href: '/pages/accounts' },
        { label: result.sapId || 'Sync Result' },
    ], body);
}


// ════════════════════════════════════════════════════════════════════════════
//  PAGE: API Documentation
// ════════════════════════════════════════════════════════════════════════════

const DOCS_CSS = `
    .endpoint-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        margin-bottom: 20px;
        overflow: hidden;
    }
    .endpoint-header {
        display: flex; align-items: center; gap: 12px;
        padding: 16px 20px;
        cursor: pointer;
        transition: background 0.2s;
    }
    .endpoint-header:hover { background: var(--surface-2); }
    .method {
        padding: 4px 10px; border-radius: 6px;
        font-size: 12px; font-weight: 700;
        font-family: var(--mono); letter-spacing: 0.5px;
        flex-shrink: 0;
    }
    .method-get  { background: rgba(52, 211, 153, 0.15); color: var(--green); }
    .method-post { background: rgba(79, 143, 255, 0.15); color: var(--accent); }
    .endpoint-path {
        font-family: var(--mono); font-size: 14px;
        color: var(--text); font-weight: 500;
    }
    .endpoint-desc { color: var(--text-muted); font-size: 13px; margin-left: auto; }
    .endpoint-body {
        display: none; padding: 0 20px 20px;
        border-top: 1px solid var(--border);
    }
    .endpoint-body.open { display: block; padding-top: 16px; }
    .doc-section { margin-bottom: 16px; }
    .doc-section-title {
        font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;
        color: var(--text-muted); margin-bottom: 8px; font-weight: 600;
    }
    .code-block {
        background: var(--bg); border: 1px solid var(--border);
        border-radius: 8px; padding: 16px;
        font-family: var(--mono); font-size: 13px;
        line-height: 1.6; overflow-x: auto;
        white-space: pre; color: var(--text);
    }
    .param-table { width: 100%; font-size: 13px; }
    .param-table th {
        text-align: left; padding: 8px 12px; font-size: 11px;
        text-transform: uppercase; letter-spacing: 0.5px;
        color: var(--text-muted); border-bottom: 1px solid var(--border);
    }
    .param-table td {
        padding: 8px 12px; border-bottom: 1px solid var(--border);
        vertical-align: top;
    }
    .param-name { font-family: var(--mono); color: var(--accent); font-weight: 500; }
    .param-type { color: var(--orange); font-size: 12px; font-family: var(--mono); }
    .tag-public { background: rgba(52, 211, 153, 0.1); color: var(--green); padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .tag-protected { background: rgba(248, 113, 113, 0.1); color: var(--red); padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .section-divider {
        font-size: 18px; font-weight: 700; color: var(--text);
        padding: 20px 0 12px; margin-top: 16px;
        border-bottom: 1px solid var(--border); margin-bottom: 20px;
    }
    .base-url-box {
        background: var(--surface); border: 1px solid var(--border);
        border-radius: var(--radius); padding: 16px 20px;
        display: flex; align-items: center; gap: 12px; margin-bottom: 28px;
    }
    .base-url-label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .base-url-value { font-family: var(--mono); font-size: 15px; color: var(--accent); }
    .arch-box {
        background: var(--surface); border: 1px solid var(--border);
        border-radius: var(--radius); padding: 20px;
        font-family: var(--mono); font-size: 13px;
        line-height: 2; text-align: center; margin-bottom: 28px;
        color: var(--text);
    }
    .arch-arrow { color: var(--accent); }
`;

function endpointCard(method, path, desc, auth, details) {
    const methodClass = method === 'GET' ? 'method-get' : 'method-post';
    const authTag = auth === 'public' ? '<span class="tag-public">PUBLIC</span>' : '<span class="tag-protected">API KEY</span>';
    const id = `ep-${path.replace(/[^a-zA-Z0-9]/g, '-')}`;

    let detailsHtml = '';

    if (details.params) {
        detailsHtml += `
            <div class="doc-section">
                <div class="doc-section-title">Parameters</div>
                <table class="param-table">
                    <thead><tr><th>Name</th><th>Type</th><th>Description</th></tr></thead>
                    <tbody>
                        ${details.params.map(p =>
                            `<tr>
                                <td><span class="param-name">${p.name}</span></td>
                                <td><span class="param-type">${p.type}</span></td>
                                <td>${p.desc}</td>
                            </tr>`
                        ).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    if (details.headers) {
        detailsHtml += `
            <div class="doc-section">
                <div class="doc-section-title">Headers</div>
                <table class="param-table">
                    <thead><tr><th>Header</th><th>Value</th></tr></thead>
                    <tbody>
                        ${details.headers.map(h =>
                            `<tr><td><span class="param-name">${h.name}</span></td><td>${h.value}</td></tr>`
                        ).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    if (details.response) {
        detailsHtml += `
            <div class="doc-section">
                <div class="doc-section-title">Response Example</div>
                <div class="code-block">${escapeHtml(details.response)}</div>
            </div>
        `;
    }

    if (details.notes) {
        detailsHtml += `
            <div class="doc-section">
                <div class="doc-section-title">Notes</div>
                <p style="font-size: 13px; color: var(--text-muted);">${details.notes}</p>
            </div>
        `;
    }

    return `
        <div class="endpoint-card">
            <div class="endpoint-header" onclick="toggleEndpoint('${id}')">
                <span class="method ${methodClass}">${method}</span>
                <span class="endpoint-path">${path}</span>
                ${authTag}
                <span class="endpoint-desc">${desc}</span>
            </div>
            <div class="endpoint-body" id="${id}">
                ${detailsHtml}
            </div>
        </div>
    `;
}

export function renderDocs(baseUrl) {
    const apiHeaders = [
        { name: 'x-api-key', value: 'Your API key (set in .env)' },
        { name: 'Content-Type', value: 'application/json (for POST with body)' },
    ];

    let body = `
        <style>${DOCS_CSS}</style>

        <h1 style="font-size: 24px; margin-bottom: 8px;">API Documentation</h1>
        <p class="text-muted text-sm" style="margin-bottom: 24px;">
            Gharda CRM Integration API — Zoho CRM File Upload sync, attachments, and record access.
        </p>

        <div class="base-url-box">
            <div>
                <div class="base-url-label">Base URL</div>
                <div class="base-url-value">${escapeHtml(baseUrl)}</div>
            </div>
        </div>

        <div class="arch-box">
            External Client <span class="arch-arrow">→</span> zoho.gharda.com:14443 (IIS + SSL) <span class="arch-arrow">→</span> localhost:3000 (Node.js) <span class="arch-arrow">→</span> Zoho CRM Cloud
        </div>

        <!-- ═══ PUBLIC ENDPOINTS ═══ -->
        <div class="section-divider">Public Endpoints</div>
        <p class="text-muted text-sm" style="margin-bottom: 20px;">No authentication required. Accessible from any browser.</p>

        ${endpointCard('GET', '/', 'Redirect to File Manager', 'public', {
            notes: 'Redirects to <code>/pages/accounts</code> dashboard.',
        })}

        ${endpointCard('GET', '/health', 'API health check', 'public', {
            response: JSON.stringify({ status: 'ok', version: 'v1', env: 'production', timestamp: '2026-03-18T12:00:00Z' }, null, 2),
        })}

        ${endpointCard('GET', '/debug/zoho', 'Zoho connectivity diagnostics', 'public', {
            response: JSON.stringify({
                timestamp: '2026-03-18T12:00:00Z',
                config: { nodeEnv: 'production', accountsUrl: 'https://accounts.zoho.in/oauth/v2/token', '...': '...' },
                tests: {
                    accounts: { ok: true, ms: 109 },
                    apiDomain: { ok: true, ms: 47 },
                    tokenRefresh: { ok: true, tokenPrefix: '1000.4a346...' },
                },
            }, null, 2),
            notes: 'Tests Zoho accounts URL reachability, API domain reachability, and token refresh. Returns 503 if any test fails.',
        })}

        <!-- ═══ HTML PAGES ═══ -->
        <div class="section-divider">HTML Pages (Browser UI)</div>
        <p class="text-muted text-sm" style="margin-bottom: 20px;">Visual file browser — open in a browser, no API key needed.</p>

        ${endpointCard('GET', '/pages/accounts', 'Accounts dashboard', 'public', {
            notes: 'Lists all synced accounts with file counts and sizes. Browse downloaded files visually.',
        })}

        ${endpointCard('GET', '/pages/accounts/:sapId', 'Account file browser', 'public', {
            params: [{ name: ':sapId', type: 'string', desc: 'SAP ID or Customer ID of the account' }],
            notes: 'Browse and download individual files organized by field name. Shows file type icons, sizes, and direct download links.',
        })}

        ${endpointCard('GET', '/pages/docs', 'API documentation (this page)', 'public', {
            notes: 'You are here.',
        })}

        <!-- ═══ STATIC FILES ═══ -->
        <div class="section-divider">Static File Access</div>
        <p class="text-muted text-sm" style="margin-bottom: 20px;">Direct download links to synced files. No API key required.</p>

        ${endpointCard('GET', '/storage/Accounts/:sapId/:fieldName/:fileName', 'Download a file', 'public', {
            params: [
                { name: ':sapId', type: 'string', desc: 'SAP ID folder name' },
                { name: ':fieldName', type: 'string', desc: 'Field API name subfolder (e.g. Pesticide_Liscense)' },
                { name: ':fileName', type: 'string', desc: 'Actual file name (e.g. license.pdf)' },
            ],
            notes: 'Serves files directly from disk. Files are organized as <code>/storage/Accounts/{SAP_ID}/{field_api_name}/{file_name}</code>.',
        })}

        <!-- ═══ ACCOUNTS MODULE ═══ -->
        <div class="section-divider">Accounts Module — File Upload Sync</div>
        <p class="text-muted text-sm" style="margin-bottom: 20px;">
            Syncs all 22 File Upload + Image Upload fields from Zoho CRM Accounts (Distributor layout).
            Only processes records where <code>Status = "Approved"</code>.
        </p>

        ${endpointCard('GET', '/api/v1/accounts/approved', 'List approved accounts', 'protected', {
            headers: apiHeaders,
            response: JSON.stringify({
                success: true,
                data: {
                    total: 2,
                    accounts: [
                        { id: '100082300001351', accountName: 'Acme Distributors', sapId: 'SAP001', status: 'Approved', layout: 'Distributor' },
                        { id: '100082300001352', accountName: 'Beta Agro', sapId: 'SAP002', status: 'Approved', layout: 'Distributor' },
                    ],
                },
            }, null, 2),
            notes: 'Preview which accounts will be processed. Does NOT download any files.',
        })}

        ${endpointCard('GET', '/api/v1/accounts/:recordId/fields', 'Show file upload fields', 'protected', {
            headers: apiHeaders,
            params: [{ name: ':recordId', type: 'string', desc: 'Zoho CRM record ID' }],
            response: JSON.stringify({
                success: true,
                data: {
                    recordId: '100082300001351',
                    accountName: 'Acme Distributors',
                    sapId: 'SAP001',
                    status: 'Approved',
                    summary: { total_fields: 22, fields_with_files: 15, fields_empty: 7, total_files: 18 },
                    fields: {
                        Pesticide_Liscense: { hasFile: true, value: [{ id: '...', file_Name: 'license.pdf' }] },
                        Upload_GSTIN_Certificate: { hasFile: false, value: null },
                    },
                },
            }, null, 2),
            notes: 'Shows metadata about which File Upload fields have files. Does NOT download files.',
        })}

        ${endpointCard('POST', '/api/v1/accounts/:recordId/sync', 'Sync single account', 'protected', {
            headers: apiHeaders,
            params: [{ name: ':recordId', type: 'string', desc: 'Zoho CRM record ID' }],
            response: JSON.stringify({
                success: true,
                status_api_check: true,
                data: {
                    recordId: '100082300001351',
                    sapId: 'SAP001',
                    accountName: 'Acme Distributors',
                    status_api_check: true,
                    storage_url: 'https://zoho.gharda.com:14443/production/storage/Accounts/SAP001',
                    summary: {
                        total_fields: 22,
                        fields_with_files: 15,
                        fields_empty: 7,
                        total_files: 18,
                        downloaded: 18,
                        failed: 0,
                    },
                },
            }, null, 2),
            notes: 'Validates <code>Status = "Approved"</code>, then downloads all File Upload field files to disk. Returns 422 if status is not Approved. Returns 207 if some downloads failed.',
        })}

        ${endpointCard('POST', '/api/v1/accounts/sync', 'Sync ALL approved accounts', 'protected', {
            headers: apiHeaders,
            response: JSON.stringify({
                status_api_check: true,
                total_accounts: 5,
                successful_accounts: 5,
                failed_accounts: 0,
                results: ['... (array of per-account results)'],
            }, null, 2),
            notes: '<strong>Warning:</strong> This can take a long time if there are many approved accounts with many files. Use the single account sync for testing first.',
        })}

        <!-- ═══ ATTACHMENTS ═══ -->
        <div class="section-divider">Attachments (Legacy — Zoho Attachments API)</div>
        <p class="text-muted text-sm" style="margin-bottom: 20px;">
            Works with the standard Zoho CRM Attachments API (not File Upload fields).
            Use for modules/records that use the classic attachment system.
        </p>

        ${endpointCard('GET', '/api/v1/attachments/:module/:recordId', 'List attachments', 'protected', {
            headers: apiHeaders,
            params: [
                { name: ':module', type: 'string', desc: 'Zoho module name (Leads, Contacts, Accounts, etc.)' },
                { name: ':recordId', type: 'string', desc: 'Zoho CRM record ID' },
            ],
            response: JSON.stringify({
                success: true,
                data: {
                    module: 'Leads',
                    recordId: '1000823000013518007',
                    count: 2,
                    attachments: [
                        { id: '1000823000014380029', fileName: 'proposal.pdf', size: 245000 },
                    ],
                },
            }, null, 2),
        })}

        ${endpointCard('POST', '/api/v1/attachments/:module/:recordId/download', 'Download all attachments', 'protected', {
            headers: apiHeaders,
            params: [
                { name: ':module', type: 'string', desc: 'Zoho module name' },
                { name: ':recordId', type: 'string', desc: 'Zoho CRM record ID' },
            ],
            response: JSON.stringify({
                success: true,
                data: {
                    module: 'Leads',
                    recordId: '1000823000013518007',
                    total: 2,
                    downloaded: 2,
                    failed: 0,
                    attachments: [
                        { attachmentId: '...', fileName: 'proposal.pdf', filePath: 'C:\\\\...', size: 245000, status: 'ok' },
                    ],
                },
            }, null, 2),
        })}

        ${endpointCard('POST', '/api/v1/attachments/:module/:recordId/upload', 'Upload attachment', 'protected', {
            headers: [
                { name: 'x-api-key', value: 'Your API key' },
                { name: 'Content-Type', value: 'multipart/form-data' },
            ],
            params: [
                { name: ':module', type: 'string', desc: 'Zoho module name' },
                { name: ':recordId', type: 'string', desc: 'Zoho CRM record ID' },
                { name: 'file', type: 'file (form-data)', desc: 'File to upload. Field name must be exactly <code>file</code>. Max 20MB.' },
            ],
            notes: 'Uploads to Zoho CRM AND saves to local disk simultaneously.',
        })}

        <!-- ═══ CRM RECORDS ═══ -->
        <div class="section-divider">CRM Records (Generic)</div>
        <p class="text-muted text-sm" style="margin-bottom: 20px;">
            Fetch records from any Zoho CRM module. Results are cached for 5 minutes.
        </p>

        ${endpointCard('GET', '/api/v1/crm/records?module=Accounts', 'List records', 'protected', {
            headers: apiHeaders,
            params: [
                { name: 'module', type: 'string (query)', desc: 'Required. Zoho module name.' },
                { name: 'page', type: 'number (query)', desc: 'Page number (default: 1)' },
                { name: 'per_page', type: 'number (query)', desc: 'Records per page (default: 50, max: 200)' },
                { name: 'fields', type: 'string (query)', desc: 'Comma-separated field API names' },
                { name: 'sort_by', type: 'string (query)', desc: 'Field to sort by' },
                { name: 'sort_order', type: 'string (query)', desc: 'asc or desc (default: desc)' },
            ],
        })}

        ${endpointCard('GET', '/api/v1/crm/records/:module/:id', 'Get single record', 'protected', {
            headers: apiHeaders,
            params: [
                { name: ':module', type: 'string', desc: 'Zoho module name' },
                { name: ':id', type: 'string', desc: 'Zoho CRM record ID' },
            ],
        })}

        <!-- ═══ STORAGE STRUCTURE ═══ -->
        <div class="section-divider">Storage Structure on VM</div>
        <div class="code-block" style="margin-bottom: 20px; line-height: 1.8;">storage/attachments/
├── Accounts/
│   ├── {SAP_ID}/
│   │   ├── Pesticide_Liscense/
│   │   │   └── license.pdf
│   │   ├── Upload_GSTIN_Certificate/
│   │   │   └── gstin_cert.pdf
│   │   ├── Upload_Pan_Card_File/
│   │   │   └── pan_card.jpg
│   │   ├── Distributor_Agreement/
│   │   │   └── agreement.pdf
│   │   └── ... (22 field folders)
│   ├── {SAP_ID_2}/
│   └── ...
└── {module}/              ← Legacy attachments
    └── {recordId}/
        └── file.pdf</div>

        <!-- ═══ FILE UPLOAD FIELDS ═══ -->
        <div class="section-divider">File Upload Fields (22 Total)</div>
        <p class="text-muted text-sm" style="margin-bottom: 16px;">These fields are synced from the Accounts module, Distributor layout.</p>

        <div class="card" style="padding: 0; overflow: hidden;">
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr><th>#</th><th>Field Label</th><th>API Name</th><th>Type</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>1</td><td>Official Email & Contact on Letterhead</td><td class="mono" style="font-size: 12px;">Official_E_Mail_ID_Contact_No_On_Letter_Head</td><td><span class="badge badge-ok">File</span></td></tr>
                        <tr><td>2</td><td>Pesticide License</td><td class="mono" style="font-size: 12px;">Pesticide_Liscense</td><td><span class="badge badge-ok">File</span></td></tr>
                        <tr><td>3</td><td>Account Verification Cheque</td><td class="mono" style="font-size: 12px;">Upload_Account_Verification_Cheque_Rs_100</td><td><span class="badge badge-ok">File</span></td></tr>
                        <tr><td>4</td><td>Address Proof</td><td class="mono" style="font-size: 12px;">Upload_Address_Proof</td><td><span class="badge badge-ok">File</span></td></tr>
                        <tr><td>5</td><td>Appraisal Form</td><td class="mono" style="font-size: 12px;">Upload_appraisal_Form</td><td><span class="badge badge-ok">File</span></td></tr>
                        <tr><td>6</td><td>Bank Certificate</td><td class="mono" style="font-size: 12px;">Upload_Bank_Certificate_for_Bank_Account_Confirmat</td><td><span class="badge badge-ok">File</span></td></tr>
                        <tr><td>7</td><td>Bank Cheque</td><td class="mono" style="font-size: 12px;">Upload_Bank_Cheque</td><td><span class="badge badge-ok">File</span></td></tr>
                        <tr><td>8</td><td>Business Planning Sheet</td><td class="mono" style="font-size: 12px;">Business_Report</td><td><span class="badge badge-ok">File</span></td></tr>
                        <tr><td>9</td><td>Declaration of Detail Information</td><td class="mono" style="font-size: 12px;">Upload_declaration_of_detail_Information</td><td><span class="badge badge-ok">File</span></td></tr>
                        <tr><td>10</td><td>Distributor Agreement Form</td><td class="mono" style="font-size: 12px;">Distributor_Agreement</td><td><span class="badge badge-ok">File</span></td></tr>
                        <tr><td>11</td><td>Distributor Strength Analysis Report</td><td class="mono" style="font-size: 12px;">Upload_distributor_Strength_Analysis_Report</td><td><span class="badge badge-ok">File</span></td></tr>
                        <tr><td>12</td><td>Fertilizer License</td><td class="mono" style="font-size: 12px;">Upload_Fertilizer_License</td><td><span class="badge badge-ok">File</span></td></tr>
                        <tr><td>13</td><td>GSTIN Certificate</td><td class="mono" style="font-size: 12px;">Upload_GSTIN_Certificate</td><td><span class="badge badge-ok">File</span></td></tr>
                        <tr><td>14</td><td>Balance Sheet / Net Worth</td><td class="mono" style="font-size: 12px;">Upload_last_Two_Year_Balance_Sheet_Net_Worth</td><td><span class="badge badge-ok">File</span></td></tr>
                        <tr><td>15</td><td>ITR / Net Worth Certificate</td><td class="mono" style="font-size: 12px;">Upload_Last_Two_Year_ITR_Net_Worth_Certificate</td><td><span class="badge badge-ok">File</span></td></tr>
                        <tr><td>16</td><td>Profit & Loss Account</td><td class="mono" style="font-size: 12px;">Upload_Last_Two_Year_Profit_Loss_Account_Net_W</td><td><span class="badge badge-ok">File</span></td></tr>
                        <tr><td>17</td><td>Partnership Agreement / Deed</td><td class="mono" style="font-size: 12px;">Upload_Partnership_Agreement_Proprietorship_Deed</td><td><span class="badge badge-ok">File</span></td></tr>
                        <tr><td>18</td><td>Proof of Security Deposit</td><td class="mono" style="font-size: 12px;">Upload_proof_of_security_Deposit</td><td><span class="badge badge-ok">File</span></td></tr>
                        <tr><td>19</td><td>Two Blank Letterhead Signed</td><td class="mono" style="font-size: 12px;">Upload_two_Blank_Letterhead_Signed</td><td><span class="badge badge-ok">File</span></td></tr>
                        <tr><td>20</td><td>Aadhar Card</td><td class="mono" style="font-size: 12px;">Upload_Aadhar_Card_File</td><td><span class="badge badge-warn">Image</span></td></tr>
                        <tr><td>21</td><td>GPS Photo</td><td class="mono" style="font-size: 12px;">Upload_GPS_Photo</td><td><span class="badge badge-warn">Image</span></td></tr>
                        <tr><td>22</td><td>Pan Card</td><td class="mono" style="font-size: 12px;">Upload_Pan_Card_File</td><td><span class="badge badge-warn">Image</span></td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- ═══ ERROR CODES ═══ -->
        <div class="section-divider">Error Codes</div>
        <div class="card" style="padding: 0; overflow: hidden;">
            <div class="table-wrap">
                <table>
                    <thead><tr><th>HTTP</th><th>Code</th><th>Meaning</th></tr></thead>
                    <tbody>
                        <tr><td><span class="badge badge-warn">400</span></td><td class="mono">MISSING_MODULE / MISSING_RECORD_ID / NO_FILE</td><td>Required parameter is missing</td></tr>
                        <tr><td><span class="badge badge-warn">401</span></td><td class="mono">UNAUTHORIZED</td><td>Missing or invalid x-api-key header</td></tr>
                        <tr><td><span class="badge badge-fail">404</span></td><td class="mono">NOT_FOUND / ATTACHMENT_NOT_FOUND</td><td>Record or resource doesn't exist</td></tr>
                        <tr><td><span class="badge badge-fail">422</span></td><td class="mono">NOT_APPROVED</td><td>Account status is not "Approved"</td></tr>
                        <tr><td><span class="badge badge-ok">200</span></td><td class="mono">—</td><td>Success — all operations completed</td></tr>
                        <tr><td><span class="badge badge-ok">207</span></td><td class="mono">—</td><td>Partial success — some files failed to download</td></tr>
                        <tr><td><span class="badge badge-fail">429</span></td><td class="mono">—</td><td>Rate limit exceeded</td></tr>
                        <tr><td><span class="badge badge-fail">500</span></td><td class="mono">INTERNAL_ERROR</td><td>Server error — check logs</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <script>
            function toggleEndpoint(id) {
                const el = document.getElementById(id);
                el.classList.toggle('open');
            }
        </script>
    `;

    return layout('API Documentation', [
        { label: 'Home', href: '/pages/accounts' },
        { label: 'API Docs' },
    ], body);
}


// ════════════════════════════════════════════════════════════════════════════
//  PAGE: Payment Success — Zoho Creator redirect after successful payment
//
//  Zoho Creator passes these query params on redirect:
//    ?status=success
//    &paymentId=PAY-XXXX          (Zoho payment reference)
//    &orderId=ORD-XXXX            (your order/record ID)
//    &amount=5000                 (amount in smallest currency unit OR decimal)
//    &currency=INR
//    &customerName=John+Doe
//    &email=john%40example.com
//    &recordId=1000823000XXXXXXX  (Zoho Creator record ID)
//
//  All params are optional — page degrades gracefully if any are missing.
// ════════════════════════════════════════════════════════════════════════════

// ── ICICI Orange PG — all fields POSTed back to returnURL ──────────────────
//
//  SUCCESS response fields (from spec + UAT sample):
//    responseCode        "0000/000"  → success
//    respdescription     "Transaction successful"
//    merchantId          echo
//    merchantTxnNo       your order ref (≤20 chars, alphanumeric only)
//    txnID               ICICI PG unique ref (24 digits)
//    paymentID           authorization/payment ID (24 digits)
//    paymentDateTime     YYYYMMDDHHmmSS
//    paymentMode         CARD | NB | UPI | WALLET
//    paymentSubInstType  bank name (NB) or DC/CC (card)
//    amount              decimal  e.g. "25000.00"
//    currencyCode        "356" for INR
//    customerName        echo
//    customerEmailID     echo
//    customerMobileNo    echo
//    addlParam1          your custom field 1 (Zoho record ID etc.)
//    addlParam2          your custom field 2
//    securehash          verification hash (lowercase key in response)
//
//  FAILURE: responseCode anything other than "0000" or "0000/000"
// ──────────────────────────────────────────────────────────────────────────

// Helper: parse ICICI YYYYMMDDHHmmSS into readable date/time
function parseICICIDateTime(raw) {
    if (!raw || raw.length < 14) return null;
    const s   = String(raw);
    const yr  = s.slice(0, 4);
    const mo  = s.slice(4, 6);
    const dy  = s.slice(6, 8);
    const hr  = s.slice(8, 10);
    const mn  = s.slice(10, 12);
    const sc  = s.slice(12, 14);
    const d   = new Date(`${yr}-${mo}-${dy}T${hr}:${mn}:${sc}`);
    if (isNaN(d.getTime())) return null;
    return {
        date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
        time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
        iso:  d.toISOString(),
    };
}

// Helper: is this a successful ICICI response code?
function isSuccessCode(code) {
    if (!code) return false;
    const c = String(code).trim();
    return c === '0000' || c === '0000/000' || c.startsWith('0000');
}

// Helper: payment mode display label
function payModeLabel(mode, subType) {
    const m = (mode || '').toUpperCase();
    if (m === 'NB')     return `Net Banking${subType ? ` — ${subType}` : ''}`;
    if (m === 'CARD')   return `Card${subType ? ` (${subType})` : ''}`;
    if (m === 'UPI')    return 'UPI';
    if (m === 'WALLET') return `Wallet${subType ? ` — ${subType}` : ''}`;
    return mode || 'Online';
}

export function renderPaymentSuccess(params = {}) {
    // ── Normalise all ICICI POST fields ──────────────────────────────────
    const responseCode     = params.responseCode     || params.responsecode     || null;
    const respDescription  = params.respdescription  || params.responseDescription || params.respdesc || null;
    const merchantTxnNo    = params.merchantTxnNo    || params.merchant_txn_no  || null;
    const txnID            = params.txnID            || params.txn_id           || null;
    const paymentID        = params.paymentID        || params.payment_id       || null;
    const paymentDateTime  = params.paymentDateTime  || params.payment_date_time|| null;
    const paymentMode      = params.paymentMode      || params.payment_mode     || null;
    const paymentSubInst   = params.paymentSubInstType || params.payment_sub_inst|| null;
    const amount           = params.amount           || null;
    const currencyCode     = params.currencyCode     || params.currency         || '356';
    const customerName     = params.customerName     || params.customer_name    || null;
    const customerEmail    = params.customerEmailID  || params.email            || null;
    const customerMobile   = params.customerMobileNo || params.mobile           || null;
    const addlParam1       = params.addlParam1       || null;
    const addlParam2       = params.addlParam2       || null;

    // ── Determine success vs failure / dev mode ───────────────────────────
    const isDev     = !responseCode;
    const isSuccess = isDev || isSuccessCode(responseCode);

    // ── Format amount ─────────────────────────────────────────────────────
    const currMap = { '356': 'INR', '840': 'USD', '978': 'EUR' };
    const currency = currMap[currencyCode] || currencyCode || 'INR';

    function formatAmount(amt) {
        if (!amt) return null;
        const num = parseFloat(amt);
        if (isNaN(num)) return null;
        try {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency', currency,
                minimumFractionDigits: 2,
            }).format(num);
        } catch { return `₹${num.toFixed(2)}`; }
    }

    const formattedAmount = formatAmount(amount);

    // ── Parse ICICI datetime (YYYYMMDDHHmmSS) ────────────────────────────
    const parsedDT    = parseICICIDateTime(paymentDateTime);
    const now         = new Date();
    const displayDate = parsedDT?.date || now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const displayTime = parsedDT?.time || now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const PAYMENT_CSS = `
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
        :root {
            --bg:#f4f1eb; --surface:#fff; --surface-warm:#faf8f4;
            --border:#e5dfd5; --text:#18150f; --text-muted:#7a7167;
            --green:#1a6b3c; --green-bg:#e8f5ee; --green-border:#b0d9c2;
            --red:#b91c1c; --red-bg:#fef2f2; --red-border:#fca5a5;
            --gold:#92650a; --gold-bg:#fdf6e3; --gold-border:#e8cc88;
            --font-d:'DM Serif Display',Georgia,serif;
            --font-b:'DM Sans','Segoe UI',sans-serif;
            --r:12px;
        }
        body {
            font-family:var(--font-b); background:var(--bg); color:var(--text);
            min-height:100vh; display:flex; flex-direction:column;
            align-items:center; justify-content:center; padding:40px 20px;
            background-image:
                radial-gradient(ellipse at 15% 10%,rgba(146,101,10,.07) 0%,transparent 55%),
                radial-gradient(ellipse at 85% 90%,rgba(26,107,60,.05) 0%,transparent 55%);
        }
        .logo-bar{display:flex;align-items:center;gap:10px;margin-bottom:32px;animation:fadeUp .4s ease both}
        .logo-mark{width:34px;height:34px;border-radius:8px;background:var(--text);color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--font-d);font-size:17px}
        .logo-name{font-family:var(--font-d);font-size:16px}
        .card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:48px 40px;max-width:540px;width:100%;box-shadow:0 8px 40px rgba(24,21,15,.10),0 2px 8px rgba(24,21,15,.06);text-align:center;animation:fadeUp .45s ease .05s both}
        @keyframes fadeUp{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
        .icon-wrap{width:80px;height:80px;margin:0 auto 24px;position:relative}
        .icon-circle{width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;animation:popIn .45s cubic-bezier(.175,.885,.32,1.275) both}
        .icon-circle.success{background:var(--green-bg);border:2px solid var(--green-border)}
        .icon-circle.failure{background:var(--red-bg);border:2px solid var(--red-border)}
        .icon-circle svg{width:36px;height:36px}
        .icon-circle.success svg path{stroke:var(--green)}
        .icon-circle.failure svg path{stroke:var(--red)}
        .icon-circle svg path{stroke-width:2.8;stroke-linecap:round;stroke-linejoin:round;fill:none;stroke-dasharray:60;stroke-dashoffset:60;animation:drawLine .45s ease .35s forwards}
        @keyframes popIn{from{transform:scale(.5);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes drawLine{to{stroke-dashoffset:0}}
        .icon-wrap.success::before,.icon-wrap.success::after{content:'';position:absolute;inset:-8px;border-radius:50%;border:1.5px solid var(--green-border);animation:ripple 2.2s ease-out .7s infinite;opacity:0}
        .icon-wrap.success::after{inset:-16px;animation-delay:1s}
        @keyframes ripple{0%{transform:scale(.88);opacity:.45}100%{transform:scale(1.12);opacity:0}}
        .status-tag{display:inline-flex;align-items:center;gap:6px;border-radius:20px;padding:5px 14px;font-size:11px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;margin-bottom:18px}
        .status-tag.success{background:var(--green-bg);color:var(--green);border:1px solid var(--green-border)}
        .status-tag.failure{background:var(--red-bg);color:var(--red);border:1px solid var(--red-border)}
        .status-dot{width:6px;height:6px;border-radius:50%}
        .status-dot.success{background:var(--green);animation:pulse 1.6s ease infinite}
        .status-dot.failure{background:var(--red)}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        .dev-banner{background:var(--gold-bg);border:1px solid var(--gold-border);border-radius:8px;padding:10px 16px;font-size:12px;color:var(--gold);font-weight:500;margin-bottom:20px;display:flex;align-items:center;gap:8px}
        h1{font-family:var(--font-d);font-size:30px;font-weight:400;line-height:1.25;margin-bottom:8px}
        .subtitle{font-size:14px;color:var(--text-muted);line-height:1.65;margin-bottom:28px}
        .amount-box{background:var(--gold-bg);border:1px solid var(--gold-border);border-radius:var(--r);padding:18px 24px;margin-bottom:24px}
        .amount-label{font-size:10px;text-transform:uppercase;letter-spacing:.9px;color:var(--gold);font-weight:600;margin-bottom:4px}
        .amount-value{font-family:var(--font-d);font-size:34px;color:var(--text);letter-spacing:-.5px}
        .details{background:var(--surface-warm);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;margin-bottom:24px;text-align:left}
        .section-label{font-size:10px;text-transform:uppercase;letter-spacing:.9px;color:var(--text-muted);font-weight:600;padding:8px 18px 6px;background:var(--surface-warm);border-bottom:1px solid var(--border)}
        .detail-row{display:flex;justify-content:space-between;align-items:flex-start;padding:11px 18px;border-bottom:1px solid var(--border);font-size:13px;gap:16px}
        .detail-row:last-child{border-bottom:none}
        .detail-key{color:var(--text-muted);font-weight:500;flex-shrink:0;min-width:110px}
        .detail-val{font-weight:500;color:var(--text);text-align:right;word-break:break-all;font-family:'Courier New',monospace;font-size:12px}
        .detail-val.plain{font-family:var(--font-b);font-size:13px}
        .detail-val.mode{font-family:var(--font-b);font-size:12px;background:var(--green-bg);color:var(--green);padding:2px 8px;border-radius:4px;border:1px solid var(--green-border)}
        .error-box{background:var(--red-bg);border:1px solid var(--red-border);border-radius:var(--r);padding:16px 20px;text-align:left;margin-bottom:24px}
        .error-code{font-family:'Courier New',monospace;font-size:13px;color:var(--red);font-weight:600;margin-bottom:4px}
        .error-msg{font-size:13px;color:var(--text-muted)}
        .footer-note{margin-top:24px;font-size:12px;color:var(--text-muted);line-height:1.7}
        .footer-note strong{color:var(--text);font-weight:600}
        .timestamp{margin-top:8px;font-size:11px;color:#ccc}
        .powered{margin-top:20px;font-size:11px;color:#c0bab3;display:flex;align-items:center;justify-content:center;gap:6px}
        @media(max-width:560px){.card{padding:32px 20px}h1{font-size:24px}.amount-value{font-size:28px}.detail-key{min-width:90px}}
    `;

    // ── Build detail sections ─────────────────────────────────────────────
    const pRows = [], cRows = [], aRows = [];

    if (txnID)          pRows.push({ key: 'ICICI Txn ID',  val: txnID,                               cls: '' });
    if (paymentID)      pRows.push({ key: 'Payment ID',    val: paymentID,                           cls: '' });
    if (merchantTxnNo)  pRows.push({ key: 'Order Ref',     val: merchantTxnNo,                       cls: '' });
    if (paymentMode)    pRows.push({ key: 'Payment Mode',  val: payModeLabel(paymentMode, paymentSubInst), cls: 'mode' });
    pRows.push({        key: 'Date & Time',                val: `${displayDate}, ${displayTime}`,    cls: 'plain' });

    if (customerName)   cRows.push({ key: 'Customer',  val: customerName,   cls: 'plain' });
    if (customerEmail)  cRows.push({ key: 'Email',     val: customerEmail,  cls: '' });
    if (customerMobile) cRows.push({ key: 'Mobile',    val: customerMobile, cls: '' });

    if (addlParam1)     aRows.push({ key: 'Reference 1', val: addlParam1, cls: '' });
    if (addlParam2)     aRows.push({ key: 'Reference 2', val: addlParam2, cls: '' });

    function section(label, rows) {
        if (!rows.length) return '';
        return `<div class="section-label">${label}</div>` +
            rows.map(r => `<div class="detail-row"><span class="detail-key">${r.key}</span><span class="detail-val ${r.cls}">${escapeHtml(r.val)}</span></div>`).join('');
    }

    const hasDetail = pRows.length > 0 || cRows.length > 0;

    const iconSvg = isSuccess
        ? `<svg viewBox="0 0 36 36"><path d="M8 18 L15 25 L28 11"/></svg>`
        : `<svg viewBox="0 0 36 36"><path d="M10 10 L26 26 M26 10 L10 26"/></svg>`;

    const heading = isSuccess
        ? `Thank You${customerName ? `,<br><em>${escapeHtml(customerName.split(' ')[0])}</em>` : ''}!`
        : 'Payment Failed';

    const subText = isSuccess
        ? 'Your payment has been successfully processed.<br>Please save this page for your records.'
        : `The transaction could not be completed.<br>${respDescription ? escapeHtml(respDescription) : 'Please try again or contact support.'}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${isSuccess ? 'Payment Successful' : 'Payment Failed'} — Gharda Chemicals</title>
<style>${PAYMENT_CSS}</style>
</head>
<body>
<div class="logo-bar">
    <div class="logo-mark">G</div>
    <span class="logo-name">Gharda Chemicals</span>
</div>
<div class="card">
    ${isDev ? `<div class="dev-banner">⚙️ <strong>Development Preview</strong> — No payment data received yet. In production, ICICI Bank will POST all transaction fields to this URL automatically.</div>` : ''}
    <div class="icon-wrap ${isSuccess ? 'success' : ''}">
        <div class="icon-circle ${isSuccess ? 'success' : 'failure'}">${iconSvg}</div>
    </div>
    <div class="status-tag ${isSuccess ? 'success' : 'failure'}">
        <span class="status-dot ${isSuccess ? 'success' : 'failure'}"></span>
        ${isSuccess ? 'Payment Confirmed' : 'Payment Failed'}
    </div>
    <h1>${heading}</h1>
    <p class="subtitle">${subText}</p>
    ${!isSuccess && responseCode ? `<div class="error-box"><div class="error-code">Code: ${escapeHtml(responseCode)}</div>${respDescription ? `<div class="error-msg">${escapeHtml(respDescription)}</div>` : ''}</div>` : ''}
    ${formattedAmount && isSuccess ? `<div class="amount-box"><div class="amount-label">Amount Paid</div><div class="amount-value">${escapeHtml(formattedAmount)}</div></div>` : ''}
    ${hasDetail ? `<div class="details">${section('Transaction Details', pRows)}${section('Customer Details', cRows)}${section('Additional References', aRows)}</div>` : ''}
    <div class="footer-note">
        ${isSuccess
            ? `Please retain this confirmation for your records.<br>For support, contact <strong>Gharda Chemicals</strong>.`
            : `Please contact <strong>Gharda Chemicals</strong> support if your account was debited.`}
    </div>
    <div class="timestamp">Page generated ${displayDate} at ${displayTime}${parsedDT ? ' (transaction time)' : ' (local time)'}</div>
    <div class="powered">Secured by ICICI Bank Orange Payment Gateway</div>
</div>
</body>
</html>`;
}



// ════════════════════════════════════════════════════════════════════════════
//  PAGE: Error pages (404, 500, 422, etc.)
// ════════════════════════════════════════════════════════════════════════════

export function renderError(statusCode, title, message) {
    const emoji = statusCode === 404 ? '🔍' : statusCode === 422 ? '🚫' : '💥';

    const body = `
        <div style="text-align: center; padding: 80px 20px;">
            <div style="font-size: 64px; margin-bottom: 16px;">${emoji}</div>
            <div style="font-size: 72px; font-weight: 800; color: var(--border); line-height: 1;">${statusCode}</div>
            <h1 style="font-size: 22px; margin: 16px 0 8px;">${title}</h1>
            <p class="text-muted" style="max-width: 500px; margin: 0 auto 32px;">${message}</p>
            <a href="/pages/accounts" class="btn btn-primary">← Back to Accounts</a>
        </div>
    `;

    return layout(`${statusCode} — ${title}`, [
        { label: 'Home', href: '/pages/accounts' },
        { label: `${statusCode} Error` },
    ], body);
}