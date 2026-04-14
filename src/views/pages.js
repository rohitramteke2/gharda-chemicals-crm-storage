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


// ════════════════════════════════════════════════════════════════════════════
//  PAGE: Payment Success — shown after ICICI payment completes
// ════════════════════════════════════════════════════════════════════════════

export function renderPaymentSuccess(params = {}) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true,
    }).toLowerCase();

    const isSuccess = params.responseCode === '0000';

    // Build transaction detail rows — only show rows that have data
    const details = [];
    if (params.txnID)         details.push(['ICICI Txn ID',    params.txnID]);
    if (params.paymentID)     details.push(['Payment ID',      params.paymentID]);
    if (params.merchantTxnNo) details.push(['Order Ref',       params.merchantTxnNo]);
    if (params.orderId)       details.push(['Invoice',         params.orderId]);
    if (params.customerName)  details.push(['Customer',        params.customerName]);
    if (params.customerEmail) details.push(['Email',           params.customerEmail]);
    if (params.paymentMode)   details.push(['Payment Mode',    params.paymentMode]);
    if (params.responseCode)  details.push(['Response Code',   params.responseCode]);
    details.push(['Date & Time', `${dateStr}, ${timeStr}`]);

    const amountDisplay = params.amount
        ? `<div style="
            margin: 0 auto 28px; padding: 14px 32px;
            background: linear-gradient(135deg, #fef9f0, #fdf3e0);
            border: 1px solid #e8d5b5; border-radius: 12px;
            display: inline-block;
          ">
            <div style="font-size: 12px; color: #8b7355; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Amount Paid</div>
            <div style="font-size: 28px; font-weight: 700; color: #2d2014; font-family: 'DM Serif Display', Georgia, serif;">
                ${params.currency || 'INR'} ${parseFloat(params.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>`
        : '';

    const detailRows = details.map(([label, value]) => `
        <tr>
            <td style="padding: 12px 16px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; border-bottom: 1px solid #f0ebe3; width: 160px; vertical-align: top;">${escapeHtml(label)}</td>
            <td style="padding: 12px 16px; font-size: 14px; color: #1f2937; font-weight: 500; border-bottom: 1px solid #f0ebe3;">${escapeHtml(value)}</td>
        </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment ${isSuccess ? 'Confirmed' : 'Result'} — Gharda Chemicals</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(180deg, #faf8f5 0%, #f5f0e8 100%);
            min-height: 100vh;
            display: flex; flex-direction: column; align-items: center;
            padding: 32px 16px;
        }

        .header {
            display: flex; align-items: center; gap: 12px;
            margin-bottom: 32px;
        }
        .header-icon {
            width: 40px; height: 40px; background: #2d5016;
            border-radius: 10px; display: flex; align-items: center; justify-content: center;
            color: white; font-weight: 700; font-size: 16px;
        }
        .header-text { font-size: 17px; font-weight: 700; color: #1f2937; }

        .card {
            background: white; border-radius: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04);
            max-width: 520px; width: 100%;
            padding: 40px 32px;
            text-align: center;
        }

        /* Animated checkmark */
        .check-wrap {
            width: 80px; height: 80px; margin: 0 auto 20px;
            position: relative;
        }
        .check-circle {
            width: 80px; height: 80px; border-radius: 50%;
            background: ${isSuccess ? 'rgba(45, 80, 22, 0.08)' : 'rgba(220, 120, 0, 0.08)'};
            display: flex; align-items: center; justify-content: center;
            animation: scaleIn 0.5s ease-out;
        }
        .check-svg { width: 40px; height: 40px; }
        .check-svg path {
            stroke: ${isSuccess ? '#2d5016' : '#b45309'};
            stroke-width: 3;
            stroke-linecap: round;
            stroke-linejoin: round;
            fill: none;
            stroke-dasharray: 50;
            stroke-dashoffset: 50;
            animation: drawCheck 0.6s 0.3s ease-out forwards;
        }

        @keyframes scaleIn {
            0% { transform: scale(0.5); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }
        @keyframes drawCheck {
            to { stroke-dashoffset: 0; }
        }

        .status-badge {
            display: inline-block; padding: 6px 16px;
            border-radius: 20px; font-size: 11px; font-weight: 700;
            letter-spacing: 1.2px; text-transform: uppercase;
            margin-bottom: 16px;
            ${isSuccess
                ? 'background: rgba(45, 80, 22, 0.1); color: #2d5016;'
                : 'background: rgba(180, 83, 9, 0.1); color: #b45309;'
            }
        }

        h1 {
            font-family: 'DM Serif Display', Georgia, serif;
            font-size: 32px; font-weight: 400; color: #1f2937;
            margin-bottom: 8px;
        }
        .subtitle {
            font-size: 14px; color: #6b7280; line-height: 1.6;
            margin-bottom: 28px;
        }

        .details-table {
            width: 100%; text-align: left;
            border: 1px solid #f0ebe3; border-radius: 10px;
            overflow: hidden; margin-top: 24px;
        }
        .details-header {
            padding: 10px 16px; font-size: 11px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 1px;
            color: #8b7355; background: #faf8f5;
            border-bottom: 1px solid #f0ebe3;
        }

        .save-note {
            margin-top: 24px; font-size: 12px; color: #9ca3af; line-height: 1.6;
        }
        .save-note strong { color: #6b7280; }

        .footer {
            margin-top: 20px; padding-top: 16px;
            border-top: 1px solid #f0ebe3;
            font-size: 11px; color: #d1ccc4;
        }
        .footer-secured {
            margin-top: 24px; font-size: 11px; color: #b8b0a4;
        }

        @media (max-width: 560px) {
            .card { padding: 28px 20px; }
            h1 { font-size: 26px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-icon">G</div>
        <div class="header-text">Gharda Chemicals</div>
    </div>

    <div class="card">
        <div class="check-wrap">
            <div class="check-circle">
                <svg class="check-svg" viewBox="0 0 40 40">
                    ${isSuccess
                        ? '<path d="M12 20 L18 26 L28 14" />'
                        : '<path d="M12 14 L28 26 M28 14 L12 26" />'
                    }
                </svg>
            </div>
        </div>

        <div class="status-badge">${isSuccess ? '&#9679; Payment Confirmed' : '&#9679; Payment ' + (params.responseCode || 'Received')}</div>

        <h1>${isSuccess ? 'Thank You!' : 'Payment Processed'}</h1>
        <p class="subtitle">
            ${isSuccess
                ? 'Your payment has been successfully processed.<br>Please save this page for your records.'
                : 'Your transaction has been processed. Please check the status below.'
            }
        </p>

        ${amountDisplay}

        <div class="details-table">
            <div class="details-header">Transaction Details</div>
            <table style="width: 100%; border-collapse: collapse;">
                ${detailRows}
            </table>
        </div>

        <div class="save-note">
            Please retain this confirmation for your records.<br>
            For support, contact <strong>Gharda Chemicals</strong>.
        </div>

        <div class="footer">
            Page generated ${dateStr} at ${timeStr} (local time)
        </div>
    </div>

    <div class="footer-secured">
        Secured by ICICI Bank Orange Payment Gateway
    </div>
</body>
</html>`;
}


// ════════════════════════════════════════════════════════════════════════════
//  PAGE: Payment Invalid — shown when URL has no valid transaction data
// ════════════════════════════════════════════════════════════════════════════

export function renderPaymentInvalid() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invalid Page — Gharda Chemicals</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(180deg, #faf8f5 0%, #f5f0e8 100%);
            min-height: 100vh;
            display: flex; flex-direction: column; align-items: center;
            justify-content: center;
            padding: 32px 16px;
        }

        .header {
            display: flex; align-items: center; gap: 12px;
            margin-bottom: 32px;
        }
        .header-icon {
            width: 40px; height: 40px; background: #2d5016;
            border-radius: 10px; display: flex; align-items: center; justify-content: center;
            color: white; font-weight: 700; font-size: 16px;
        }
        .header-text { font-size: 17px; font-weight: 700; color: #1f2937; }

        .card {
            background: white; border-radius: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04);
            max-width: 480px; width: 100%;
            padding: 48px 32px;
            text-align: center;
        }

        .icon-wrap {
            width: 72px; height: 72px; margin: 0 auto 20px;
            background: rgba(220, 38, 38, 0.06); border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
        }
        .icon-wrap svg {
            width: 32px; height: 32px;
        }

        h1 {
            font-size: 22px; font-weight: 700; color: #1f2937;
            margin-bottom: 12px;
        }
        p {
            font-size: 14px; color: #6b7280; line-height: 1.7;
            max-width: 360px; margin: 0 auto;
        }
        .error-code {
            display: inline-block; margin-top: 20px; padding: 6px 14px;
            background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px;
            font-size: 12px; font-weight: 600; color: #dc2626;
            font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
        }

        .footer {
            margin-top: 32px; font-size: 11px; color: #b8b0a4;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-icon">G</div>
        <div class="header-text">Gharda Chemicals</div>
    </div>

    <div class="card">
        <div class="icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
        </div>

        <h1>Invalid Page</h1>
        <p>
            This payment confirmation page can only be accessed immediately after a successful payment through ICICI Bank.
            The link you used is either expired, invalid, or was accessed directly.
        </p>

        <div class="error-code">NO_TRANSACTION_DATA</div>
    </div>

    <div class="footer">
        Gharda Chemicals &mdash; Zoho CRM Integration
    </div>
</body>
</html>`;
}



// ════════════════════════════════════════════════════════════════════════════
//  PAGE: Token-gated Docs Viewer — Modern sidebar + docs layout
//  ADD THIS FUNCTION to src/views/pages.js
//
//  Usage in pages.js route:
//    res.send(renderDocsViewer(recordId, folderName, data));
//
//  Export:
//    export function renderDocsViewer(recordId, folderName, data) { ... }
// ════════════════════════════════════════════════════════════════════════════

export function renderDocsViewer(recordId, folderName, data) {

    // ── No files found ────────────────────────────────────────────────────
    if (!data || data.fields.length === 0) {
        return renderDocsEmpty(folderName);
    }

    // ── Build sidebar categories + file list ──────────────────────────────
    // Only include fields that actually have files
    const fieldsWithFiles = data.fields.filter(f => f.files.length > 0);
    const totalFiles      = data.totalFiles;
    const totalSize       = formatSize(data.totalSize);

    // Pre-build each section's HTML
    const sections = fieldsWithFiles.map((field, idx) => {
        const sectionId  = `section-${idx}`;
        const fileRows   = field.files.map(file => {
            const iconClass = getFileIconClass(file.name);
            const ext       = getFileExt(file.name).slice(0, 4);
            const isImage   = ['jpg','jpeg','png','gif','bmp','webp']
                .includes((file.name || '').split('.').pop().toLowerCase());

            return `
            <div class="doc-item" data-section="${sectionId}">
                <div class="doc-icon ${iconClass}">${escapeHtml(ext)}</div>
                <div class="doc-info">
                    <div class="doc-name">${escapeHtml(file.name)}</div>
                    <div class="doc-meta">${formatSize(file.size)}</div>
                </div>
                <div class="doc-actions">
                    ${isImage ? `
                    <a href="${escapeHtml(file.url)}" target="_blank" class="action-btn preview-btn" title="Preview">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        View
                    </a>` : ''}
                    <a href="${escapeHtml(file.url)}" download class="action-btn download-btn" title="Download">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download
                    </a>
                </div>
            </div>`;
        }).join('');

        return {
            id:        sectionId,
            label:     field.fieldLabel,
            apiName:   field.fieldApiName,
            type:      field.fieldType,
            count:     field.files.length,
            fileRows,
        };
    });

    // ── Sidebar items ──────────────────────────────────────────────────────
    const sidebarItems = [
        `<div class="sidebar-item active" data-target="all" onclick="filterSection('all', this)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span>All Documents</span>
            <span class="sidebar-count">${totalFiles}</span>
        </div>`,
        ...sections.map(s => `
        <div class="sidebar-item" data-target="${s.id}" onclick="filterSection('${s.id}', this)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${s.type === 'image_upload'
                    ? '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'
                    : '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'}
            </svg>
            <span>${escapeHtml(s.label)}</span>
            <span class="sidebar-count">${s.count}</span>
        </div>`),
    ].join('');

    // ── Doc sections HTML ──────────────────────────────────────────────────
    const docSections = sections.map(s => `
        <div class="doc-section" id="${s.id}">
            <div class="section-header">
                <div>
                    <div class="section-title">${escapeHtml(s.label)}</div>
                    <div class="section-meta mono">${escapeHtml(s.apiName)}</div>
                </div>
                <span class="badge ${s.type === 'image_upload' ? 'badge-warn' : 'badge-ok'}">
                    ${s.type === 'image_upload' ? 'Image' : 'File Upload'}
                </span>
            </div>
            ${s.fileRows}
        </div>`
    ).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documents — Gharda CRM</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --bg:         #0f1117;
            --surface:    #1a1d27;
            --surface-2:  #242836;
            --border:     #2e3346;
            --text:       #e4e6ef;
            --text-muted: #8b8fa3;
            --accent:     #4f8fff;
            --accent-glow:rgba(79,143,255,0.15);
            --green:      #34d399;
            --orange:     #fbbf24;
            --radius:     10px;
            --font:       'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            --mono:       'Cascadia Code','Fira Code',Consolas,monospace;
            --sidebar-w:  260px;
        }

        body {
            font-family: var(--font);
            background: var(--bg);
            color: var(--text);
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* ── Top bar ───────────────────────────────────────────── */
        .topbar {
            height: 56px;
            background: var(--surface);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            padding: 0 24px;
            gap: 16px;
            flex-shrink: 0;
            z-index: 10;
        }
        .topbar-logo {
            display: flex; align-items: center; gap: 10px;
            font-size: 15px; font-weight: 700; color: var(--text);
        }
        .topbar-logo-icon {
            width: 30px; height: 30px;
            background: var(--accent); border-radius: 7px;
            display: flex; align-items: center; justify-content: center;
            font-size: 14px; font-weight: 800; color: white;
        }
        .topbar-divider { width: 1px; height: 24px; background: var(--border); }
        .topbar-title {
            font-size: 14px; color: var(--text-muted);
            display: flex; align-items: center; gap: 8px;
        }
        .topbar-title strong { color: var(--text); }
        .topbar-right { margin-left: auto; display: flex; align-items: center; gap: 12px; }
        .topbar-stats {
            font-size: 12px; color: var(--text-muted);
            background: var(--surface-2);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 4px 12px;
            display: flex; gap: 16px;
        }
        .topbar-stats span { color: var(--accent); font-weight: 600; }
        .expiry-badge {
            font-size: 12px;
            background: rgba(251,191,36,0.1);
            border: 1px solid rgba(251,191,36,0.3);
            color: var(--orange);
            border-radius: 6px;
            padding: 4px 10px;
            display: flex; align-items: center; gap: 6px;
        }

        /* ── Main layout ───────────────────────────────────────── */
        .main {
            display: flex;
            flex: 1;
            overflow: hidden;
        }

        /* ── Sidebar ───────────────────────────────────────────── */
        .sidebar {
            width: var(--sidebar-w);
            background: var(--surface);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
            overflow-y: auto;
        }
        .sidebar-header {
            padding: 16px 16px 8px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            color: var(--text-muted);
        }
        .sidebar-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 16px;
            cursor: pointer;
            font-size: 13px;
            color: var(--text-muted);
            border-left: 3px solid transparent;
            transition: all 0.15s;
            user-select: none;
        }
        .sidebar-item:hover {
            background: var(--surface-2);
            color: var(--text);
        }
        .sidebar-item.active {
            background: var(--accent-glow);
            color: var(--accent);
            border-left-color: var(--accent);
        }
        .sidebar-item svg { flex-shrink: 0; opacity: 0.7; }
        .sidebar-item span:nth-child(2) { flex: 1; }
        .sidebar-count {
            background: var(--surface-2);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 1px 7px;
            font-size: 11px;
            font-weight: 600;
            color: var(--text-muted);
        }
        .sidebar-item.active .sidebar-count {
            background: rgba(79,143,255,0.2);
            border-color: rgba(79,143,255,0.3);
            color: var(--accent);
        }
        .sidebar-divider {
            height: 1px;
            background: var(--border);
            margin: 8px 16px;
        }

        /* ── Docs area ─────────────────────────────────────────── */
        .docs-area {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        /* ── Search bar ────────────────────────────────────────── */
        .search-wrap {
            position: relative;
            margin-bottom: 4px;
        }
        .search-wrap svg {
            position: absolute;
            left: 12px; top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            pointer-events: none;
        }
        .search-input {
            width: 100%;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 10px 12px 10px 38px;
            font-size: 14px;
            color: var(--text);
            font-family: var(--font);
            outline: none;
            transition: border-color 0.2s;
        }
        .search-input:focus { border-color: var(--accent); }
        .search-input::placeholder { color: var(--text-muted); }

        /* ── Doc section ───────────────────────────────────────── */
        .doc-section {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            overflow: hidden;
            transition: border-color 0.2s;
        }
        .doc-section:hover { border-color: #3d4460; }

        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid var(--border);
            background: var(--surface-2);
        }
        .section-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text);
            margin-bottom: 2px;
        }
        .section-meta {
            font-family: var(--mono);
            font-size: 11px;
            color: var(--text-muted);
        }

        /* ── Doc item ──────────────────────────────────────────── */
        .doc-item {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 14px 20px;
            border-bottom: 1px solid var(--border);
            transition: background 0.15s;
        }
        .doc-item:last-child { border-bottom: none; }
        .doc-item:hover { background: var(--surface-2); }

        .doc-icon {
            width: 38px; height: 38px;
            border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; font-weight: 700;
            color: white; flex-shrink: 0;
        }
        .fi-pdf   { background: #e74c3c; }
        .fi-img   { background: #9b59b6; }
        .fi-doc   { background: #3498db; }
        .fi-xls   { background: #27ae60; }
        .fi-zip   { background: #f39c12; }
        .fi-txt   { background: #95a5a6; }
        .fi-other { background: #7f8c8d; }

        .doc-info { flex: 1; min-width: 0; }
        .doc-name {
            font-size: 14px;
            font-weight: 500;
            color: var(--text);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .doc-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

        .doc-actions { display: flex; gap: 8px; flex-shrink: 0; }

        .action-btn {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
            text-decoration: none;
            white-space: nowrap;
        }
        .preview-btn {
            background: rgba(79,143,255,0.1);
            border: 1px solid rgba(79,143,255,0.25);
            color: var(--accent);
        }
        .preview-btn:hover {
            background: rgba(79,143,255,0.2);
            border-color: var(--accent);
        }
        .download-btn {
            background: var(--surface-2);
            border: 1px solid var(--border);
            color: var(--text);
        }
        .download-btn:hover {
            border-color: var(--accent);
            color: var(--accent);
        }

        /* ── Badge ─────────────────────────────────────────────── */
        .badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
        }
        .badge-ok   { background: rgba(52,211,153,0.1); color: #34d399; }
        .badge-warn { background: rgba(251,191,36,0.1);  color: #fbbf24; }

        /* ── Empty state ───────────────────────────────────────── */
        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--text-muted);
            text-align: center;
            padding: 60px;
        }
        .empty-icon { font-size: 48px; opacity: 0.3; margin-bottom: 16px; }
        .empty-title { font-size: 18px; color: var(--text); margin-bottom: 8px; }

        /* ── Scrollbar ─────────────────────────────────────────── */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #4a4f6a; }

        /* ── Responsive ────────────────────────────────────────── */
        @media (max-width: 680px) {
            :root { --sidebar-w: 200px; }
            .topbar-stats { display: none; }
            .doc-actions { flex-direction: column; gap: 4px; }
        }
    </style>
</head>
<body>

    <!-- Top bar -->
    <div class="topbar">
        <div class="topbar-logo">
            <div class="topbar-logo-icon">G</div>
            Gharda CRM
        </div>
        <div class="topbar-divider"></div>
        <div class="topbar-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            My Documents
        </div>
        <div class="topbar-right">
            <div class="topbar-stats">
                <span>${totalFiles}</span> files &nbsp;·&nbsp; <span>${totalSize}</span>
            </div>
            <div class="expiry-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Link expires in 15 min
            </div>
        </div>
    </div>

    <!-- Main -->
    <div class="main">

        <!-- Sidebar -->
        <div class="sidebar">
            <div class="sidebar-header">Documents</div>
            ${sidebarItems}
            <div class="sidebar-divider"></div>
            <div class="sidebar-header" style="margin-top:4px;">Account</div>
            <div class="sidebar-item" style="cursor:default; opacity:0.6;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
                <span style="font-family:var(--mono);font-size:11px;color:var(--text-muted);">
                    ${escapeHtml(folderName)}
                </span>
            </div>
        </div>

        <!-- Docs area -->
        <div class="docs-area" id="docsArea">

            <!-- Search -->
            <div class="search-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                    class="search-input"
                    id="searchInput"
                    type="text"
                    placeholder="Search documents by name…"
                    oninput="searchDocs(this.value)"
                    autocomplete="off"
                />
            </div>

            <!-- No results -->
            <div id="noResults" class="empty-state" style="display:none;">
                <div class="empty-icon">🔍</div>
                <div class="empty-title">No documents found</div>
                <p style="font-size:13px;">Try a different search term.</p>
            </div>

            <!-- Document sections -->
            ${docSections}

        </div>
    </div>

    <script>
        // ── Filter by sidebar category ────────────────────────────────────
        function filterSection(target, el) {
            // Update active state
            document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
            el.classList.add('active');

            // Clear search
            document.getElementById('searchInput').value = '';

            const sections = document.querySelectorAll('.doc-section');
            sections.forEach(s => {
                s.style.display = (target === 'all' || s.id === target) ? '' : 'none';
            });

            document.getElementById('noResults').style.display = 'none';
        }

        // ── Search docs ───────────────────────────────────────────────────
        function searchDocs(query) {
            const q = query.toLowerCase().trim();

            // Reset sidebar selection to "All" when searching
            if (q) {
                document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
                document.querySelector('[data-target="all"]').classList.add('active');
            }

            let anyVisible = false;

            document.querySelectorAll('.doc-section').forEach(section => {
                let sectionHasMatch = false;

                section.querySelectorAll('.doc-item').forEach(item => {
                    const name = item.querySelector('.doc-name').textContent.toLowerCase();
                    const show = !q || name.includes(q);
                    item.style.display = show ? '' : 'none';
                    if (show) sectionHasMatch = true;
                });

                section.style.display = sectionHasMatch ? '' : 'none';
                if (sectionHasMatch) anyVisible = true;
            });

            document.getElementById('noResults').style.display = anyVisible || !q ? 'none' : 'flex';
        }
    </script>

</body>
</html>`;
}


// ── Empty state when no files exist ──────────────────────────────────────────
function renderDocsEmpty(folderName) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>No Documents — Gharda CRM</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', sans-serif;
            background: #0f1117; color: #e4e6ef;
            min-height: 100vh; display: flex; align-items: center; justify-content: center;
        }
        .wrap {
            text-align: center; max-width: 420px; padding: 48px 32px;
            background: #1a1d27; border-radius: 16px;
            border: 1px solid #2e3346;
        }
        .icon { font-size: 48px; opacity: 0.3; margin-bottom: 20px; }
        h1 { font-size: 18px; font-weight: 700; margin-bottom: 10px; }
        p  { font-size: 13px; color: #8b8fa3; line-height: 1.6; }
        .footer { margin-top: 32px; font-size: 11px; color: #4a4e63; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="icon">📂</div>
        <h1>No Documents Found</h1>
        <p>No files have been synced yet for this account.<br>Please contact your administrator.</p>
        <div class="footer">Gharda Chemicals — Zoho CRM Integration</div>
    </div>
</body>
</html>`;
}