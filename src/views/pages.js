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
        --bg:          #f7f6f3;
        --surface:     #ffffff;
        --surface-2:   #f0efe9;
        --border:      #e2e0d8;
        --text:        #1a1916;
        --text-muted:  #78756a;
        --accent:      #b07d3a;
        --accent-glow: rgba(176, 125, 58, 0.12);
        --green:       #2d7a3e;
        --red:         #b83c35;
        --orange:      #b86b2a;
        --radius:      6px;
        --font:        'Instrument Sans', 'Segoe UI', -apple-system, sans-serif;
        --mono:        'JetBrains Mono', 'Fira Code', Consolas, monospace;
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


// ════════════════════════════════════════════════════════════════════════════
//  PAGE: Health Check
// ════════════════════════════════════════════════════════════════════════════

export function renderHealthPage(data = {}) {
    const isOk = data.status === 'ok';
    const rows = [
        { k: 'status',    v: data.status,    hi: isOk },
        { k: 'version',   v: data.version    },
        { k: 'env',       v: data.env        },
        { k: 'node',      v: data.node       },
        { k: 'uptime',    v: data.uptime     },
        { k: 'memory',    v: data.memory     },
        { k: 'timestamp', v: data.timestamp  },
    ].filter(r => r.v !== undefined);

    const rowsHtml = rows.map(r => `
        <div class="row">
            <div class="key">${r.k}</div>
            <div class="val${r.hi ? ' ok' : ''}">${escapeHtml(String(r.v))}</div>
        </div>`).join('');

    const body = `
        <style>
            .health-card{
                background:var(--surface);border:1px solid var(--border);
                border-radius:var(--radius);overflow:hidden;
                max-width:560px;margin:0 auto;
            }
            .health-head{
                padding:16px 20px;border-bottom:1px solid var(--border);
                display:flex;align-items:center;gap:12px;
            }
            .status-badge{
                display:inline-flex;align-items:center;gap:6px;
                padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;
            }
            .status-badge.ok{background:rgba(106,175,122,.15);color:var(--green)}
            .status-badge.err{background:rgba(212,100,90,.15);color:var(--red)}
            .pulse{width:6px;height:6px;border-radius:50%;background:currentColor;animation:hb 2s ease infinite}
            @keyframes hb{0%,100%{opacity:1}50%{opacity:.3}}
            .health-title{font-size:15px;font-weight:600}
            .row{
                display:flex;align-items:center;
                padding:11px 20px;border-bottom:1px solid var(--border);
                font-size:13px;
            }
            .row:last-child{border-bottom:none}
            .key{font-family:var(--mono);font-size:11px;color:var(--text-muted);width:110px;flex-shrink:0}
            .val{font-family:var(--mono);font-size:12px;color:var(--text)}
            .val.ok{color:var(--green);font-weight:600}
            .ts{margin-top:20px;text-align:center;font-size:11px;color:var(--text-muted);font-family:var(--mono)}
        </style>
        <div style="max-width:600px;margin:0 auto">
            <h1 style="font-size:22px;margin-bottom:20px">API Health</h1>
            <div class="health-card">
                <div class="health-head">
                    <span class="status-badge ${isOk ? 'ok' : 'err'}">
                        <span class="pulse"></span>
                        ${isOk ? 'Operational' : 'Degraded'}
                    </span>
                    <span class="health-title">Gharda CRM API</span>
                </div>
                ${rowsHtml}
            </div>
            <div class="ts">Checked at ${escapeHtml(new Date().toLocaleString('en-IN'))}</div>
        </div>
    `;

    return layout('Health', [
        { label: 'Home', href: '/pages/accounts' },
        { label: 'Health' },
    ], body);
}

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

// ════════════════════════════════════════════════════════════════════════════
//  REPLACE the existing renderDashboard function in src/views/pages.js
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
//  REPLACE the existing renderDashboard function in src/views/pages.js
// ════════════════════════════════════════════════════════════════════════════

export function renderDashboard(accounts = []) {
    const totalFiles = accounts.reduce((s, a) => s + a.fileCount, 0);
    const totalSize  = accounts.reduce((s, a) => s + a.totalSize, 0);
    const withFiles  = accounts.filter(a => a.fileCount > 0).length;

    const rowsJson = JSON.stringify(accounts.map(a => ({
        sapId:     a.sapId,
        fileCount: a.fileCount,
        totalSize: a.totalSize,
        href:      `/pages/accounts/${encodeURIComponent(a.sapId)}`,
    })));

    const body = `
<style>
    :root {
        --bg:#f7f6f3;--bg2:#ffffff;--bg3:#f0efe9;
        --line:#e2e0d8;--line2:#d4d1c8;
        --text:#1a1916;--dim:#78756a;--faint:#a8a49a;
        --amber:#b07d3a;--amber2:#c8943e;
        --green:#2d7a3e;--red:#b83c35;--blue:#2d5fa8;
        --mono:'JetBrains Mono',monospace;
        --sans:'Instrument Sans',-apple-system,sans-serif;
    }
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{font-family:var(--sans);background:var(--bg);color:var(--text);min-height:100vh;font-size:14px}
    a{color:inherit;text-decoration:none}

    /* Topbar */
    .tb{height:48px;background:var(--bg2);border-bottom:1px solid var(--line);display:flex;align-items:center;padding:0 24px;gap:0;position:sticky;top:0;z-index:50}
    .tb-brand{font-family:var(--mono);font-size:12px;font-weight:600;color:var(--amber);letter-spacing:.08em;padding-right:20px;margin-right:20px;border-right:1px solid var(--line)}
    .tb-title{font-size:13px;font-weight:500;color:var(--dim);flex:1}
    .tb-nav{display:flex;gap:0}
    .tb-nav a{font-size:12px;color:var(--faint);padding:0 14px;height:48px;display:flex;align-items:center;border-right:1px solid var(--line);transition:color .15s}
    .tb-nav a:hover{color:var(--text)}
    .tb-nav a.on{color:var(--amber)}

    /* Wrap */
    .wrap{max-width:1100px;margin:0 auto;padding:28px 24px 60px}

    /* Stat strip */
    .stats{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--line);border-radius:6px;overflow:hidden;margin-bottom:24px}
    .stat{padding:18px 22px;border-right:1px solid var(--line);position:relative}
    .stat:last-child{border-right:none}
    .stat::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--sc,var(--line2))}
    .stat-n{font-family:var(--mono);font-size:26px;font-weight:600;line-height:1;color:var(--sv,var(--text));margin-bottom:6px}
    .stat-l{font-size:11px;color:var(--dim);letter-spacing:.04em;text-transform:uppercase}

    /* Table card */
    .tcard{background:var(--bg2);border:1px solid var(--line);border-radius:6px;overflow:hidden}

    /* Toolbar */
    .toolbar{padding:12px 16px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px;flex-wrap:wrap}
    .srch-wrap{position:relative;flex:1;min-width:180px}
    .srch-ico{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--faint)}
    .srch{width:100%;background:var(--bg3);border:1px solid var(--line2);border-radius:4px;padding:6px 10px 6px 32px;color:var(--text);font-size:12px;font-family:var(--mono);outline:none}
    .srch:focus{border-color:var(--amber)}
    .srch::placeholder{color:var(--faint)}
    .pp-wrap{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--dim);font-family:var(--mono)}
    .pp-sel{background:var(--bg3);border:1px solid var(--line2);border-radius:4px;padding:5px 8px;color:var(--text);font-size:11px;font-family:var(--mono);outline:none;cursor:pointer}
    .pp-sel:focus{border-color:var(--amber)}
    .filter-info{font-family:var(--mono);font-size:11px;color:var(--faint);margin-left:auto}

    /* Table */
    .tbl-wrap{overflow-x:auto;max-height:580px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--line2) transparent}
    table{width:100%;border-collapse:collapse;font-size:12px}
    thead th{
        padding:8px 14px;text-align:left;
        font-size:10px;font-weight:500;color:var(--faint);
        letter-spacing:.08em;text-transform:uppercase;
        border-bottom:1px solid var(--line);
        background:var(--bg3);
        position:sticky;top:0;z-index:2;
        cursor:pointer;user-select:none;white-space:nowrap;
    }
    thead th:hover{color:var(--dim)}
    thead th.sorted{color:var(--amber)}
    tbody td{padding:10px 14px;border-bottom:1px solid rgba(42,43,39,.5);vertical-align:middle}
    tbody tr:last-child td{border-bottom:none}
    tbody tr:hover td{background:var(--bg3)}
    .sap-link{font-family:var(--mono);font-size:12px;font-weight:500;color:var(--blue);transition:color .12s}
    .sap-link:hover{color:var(--amber)}
    .fc-badge{
        display:inline-flex;align-items:center;
        padding:2px 9px;border-radius:3px;
        font-family:var(--mono);font-size:10px;font-weight:600;
    }
    .fc-has{background:rgba(106,175,122,.15);color:var(--green)}
    .fc-nil{background:rgba(74,74,70,.2);color:var(--faint)}
    .sz{font-family:var(--mono);font-size:11px;color:var(--dim)}
    .browse-btn{
        padding:4px 12px;border-radius:3px;
        border:1px solid var(--line2);background:transparent;
        color:var(--dim);font-size:11px;font-family:var(--mono);
        cursor:pointer;transition:.12s;
    }
    .browse-btn:hover{border-color:var(--amber);color:var(--amber)}

    /* Pagination */
    .pagi{padding:10px 16px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
    .pagi-info{font-family:var(--mono);font-size:11px;color:var(--faint)}
    .pagi-btns{display:flex;gap:4px}
    .pb{
        padding:4px 9px;border-radius:3px;
        border:1px solid var(--line2);background:var(--bg3);
        color:var(--dim);font-size:11px;font-family:var(--mono);
        cursor:pointer;transition:.12s;
    }
    .pb:hover:not(:disabled){border-color:var(--amber);color:var(--amber)}
    .pb.cur{background:var(--amber);border-color:var(--amber);color:#fff;font-weight:600}
    .pb:disabled{opacity:.3;cursor:default}

    /* Empty */
    .nil{padding:40px;text-align:center;font-size:12px;color:var(--faint);font-family:var(--mono)}

    /* Fade in */
    .wrap>*{animation:fu .2s ease both}
    .stats{animation-delay:.04s}
    .tcard{animation-delay:.1s}
    @keyframes fu{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
</style>

<div class="tb">
    <div class="tb-brand">GHARDA</div>
    <div class="tb-title">File Manager</div>
    <nav class="tb-nav">
        <a href="/pages/accounts" class="on">Accounts</a>
        <a href="/pages/docs">API Docs</a>
        <a href="/health">Health</a>
        <a href="/debug/zoho">Debug</a>
    </nav>
</div>

<div class="wrap">

    <div class="stats">
        <div class="stat" style="--sc:var(--blue);--sv:var(--blue)">
            <div class="stat-n">${accounts.length}</div>
            <div class="stat-l">Accounts Synced</div>
        </div>
        <div class="stat" style="--sc:var(--green);--sv:var(--green)">
            <div class="stat-n">${withFiles}</div>
            <div class="stat-l">With Files</div>
        </div>
        <div class="stat" style="--sc:var(--amber)">
            <div class="stat-n">${totalFiles}</div>
            <div class="stat-l">Total Files</div>
        </div>
        <div class="stat">
            <div class="stat-n" style="font-size:18px;margin-top:4px">${formatSize(totalSize)}</div>
            <div class="stat-l">Total Size</div>
        </div>
    </div>

    <div class="tcard">
        <div class="toolbar">
            <div class="srch-wrap">
                <svg class="srch-ico" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input class="srch" id="srch" type="text" placeholder="search sap id…" oninput="applyFilter()">
            </div>
            <div class="pp-wrap">
                show
                <select class="pp-sel" id="ppSel" onchange="setPerPage(this.value)">
                    <option value="20">20</option>
                    <option value="50" selected>50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                </select>
                per page
            </div>
            <div class="filter-info" id="finfo"></div>
        </div>
        <div class="tbl-wrap">
            <table>
                <thead>
                    <tr>
                        <th onclick="sortBy('sapId')">SAP ID <span id="si">↕</span></th>
                        <th onclick="sortBy('fileCount')">Files <span id="sf">↕</span></th>
                        <th onclick="sortBy('totalSize')">Size <span id="ss">↕</span></th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="tbody"></tbody>
            </table>
        </div>
        <div class="pagi">
            <div class="pagi-info" id="pginfo"></div>
            <div class="pagi-btns" id="pgbtns"></div>
        </div>
    </div>

</div>

<script id="dd" type="application/json">${rowsJson}</script>
`;

    const script = `
<script>
(function(){
    var R=JSON.parse(document.getElementById('dd').textContent);
    var F=R.slice(),pg=1,pp=50,sk=null,sd=1;

    function sz(b){if(!b)return '0 B';var u=['B','KB','MB','GB'],i=Math.floor(Math.log(b)/Math.log(1024));return (b/Math.pow(1024,i)).toFixed(i>0?1:0)+' '+u[i];}

    window.applyFilter=function(){
        var q=document.getElementById('srch').value.toLowerCase().trim();
        F=R.filter(function(r){return !q||r.sapId.toLowerCase().indexOf(q)!==-1;});
        pg=1;render();
    };

    window.setPerPage=function(v){pp=Number(v);pg=1;render();};

    window.sortBy=function(k){
        if(sk===k)sd*=-1;else{sk=k;sd=1;}
        ['sapId','fileCount','totalSize'].forEach(function(x){
            var el=document.getElementById(x==='sapId'?'si':x==='fileCount'?'sf':'ss');
            if(el)el.textContent=x===sk?(sd===1?' ↑':' ↓'):' ↕';
        });
        var th=document.querySelectorAll('thead th');
        th.forEach(function(t){t.classList.remove('sorted')});
        var idx={sapId:0,fileCount:1,totalSize:2}[k];
        if(th[idx])th[idx].classList.add('sorted');
        F.sort(function(a,b){var av=a[k],bv=b[k];return(typeof av==='string'?av.localeCompare(bv):av-bv)*sd;});
        pg=1;render();
    };

    window.goPage=function(p){var tp=Math.ceil(F.length/pp);if(p<1||p>tp)return;pg=p;render();window.scrollTo({top:0,behavior:'smooth'});};

    function render(){
        var tot=F.length,tp=Math.max(1,Math.ceil(tot/pp));
        pg=Math.min(pg,tp);
        var st=(pg-1)*pp,slice=F.slice(st,st+pp);
        var tb=document.getElementById('tbody');if(!tb)return;

        if(slice.length===0){
            tb.innerHTML='<tr><td colspan="4" class="nil">no accounts found</td></tr>';
        } else {
            tb.innerHTML=slice.map(function(a){
                var badge=a.fileCount>0
                    ?'<span class="fc-badge fc-has">'+a.fileCount+' files</span>'
                    :'<span class="fc-badge fc-nil">empty</span>';
                return '<tr>'
                    +'<td><a class="sap-link" href="'+a.href+'">'+a.sapId+'</a></td>'
                    +'<td>'+badge+'</td>'
                    +'<td class="sz">'+sz(a.totalSize)+'</td>'
                    +'<td><button class="browse-btn" onclick="location.href=\''+a.href+'\' ">browse →</button></td>'
                    +'</tr>';
            }).join('');
        }

        var from=tot===0?0:st+1,to=Math.min(st+pp,tot);
        document.getElementById('pginfo').textContent=from+'–'+to+' of '+tot+' accounts';
        document.getElementById('finfo').textContent=tot!==R.length?'filtered from '+R.length:'';

        var html='',base='';
        html+='<button class="pb" onclick="goPage('+(pg-1)+')" '+(pg===1?'disabled':'')+'">‹ prev</button>';
        var prev=null;
        var range=[];
        for(var p=1;p<=tp;p++){if(p===1||p===tp||(p>=pg-2&&p<=pg+2))range.push(p);}
        range.forEach(function(p){
            if(prev!==null&&p-prev>1)html+='<button class="pb" disabled>…</button>';
            html+='<button class="pb'+(p===pg?' cur':'')+'" onclick="goPage('+p+')">'+p+'</button>';
            prev=p;
        });
        html+='<button class="pb" onclick="goPage('+(pg+1)+')" '+(pg===tp?'disabled':'')+'">next ›</button>';
        document.getElementById('pgbtns').innerHTML=html;
    }

    render();
})();
</script>`;

    // Return standalone page (not using layout wrapper — has its own topbar/styles)
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accounts — Gharda CRM</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
${body}
${script}
</body>
</html>`;
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
//    export function renderDocsViewer(recordId, folderName, data, signFileUrl) { ... }
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
//  REPLACE the existing renderDocsViewer and renderDocsEmpty functions
//  in src/views/pages.js with these two functions.
// ════════════════════════════════════════════════════════════════════════════

export function renderDocsViewer(recordId, folderName, data, signFileUrl) {

    if (!data || data.totalFiles === 0) {
        return renderDocsEmpty(folderName);
    }

    // ── Flatten all files ─────────────────────────────────────────────────
    const allFiles = [];
    if (data.fields && data.fields.length > 0) {
        for (const field of data.fields) {
            for (const file of field.files) {
                allFiles.push({
                    ...file,
                    fieldLabel:   field.fieldLabel,
                    fieldApiName: field.fieldApiName,
                    fieldType:    field.fieldType,
                });
            }
        }
    }

    const totalFiles = allFiles.length;
    const totalSize  = allFiles.reduce((s, f) => s + (f.size || 0), 0);

    // ── Sidebar categories ────────────────────────────────────────────────
    const categories = {};
    for (const f of allFiles) {
        const cat = f.fieldLabel || 'Other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(f);
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    function fileType(name) {
        const ext = (name || '').split('.').pop().toLowerCase();
        if (ext === 'pdf')                                         return { label: 'PDF',   color: '#C62828', bg: '#FFEBEE' };
        if (['jpg','jpeg','png','gif','bmp','webp'].includes(ext)) return { label: 'IMG',   color: '#6A1B9A', bg: '#F3E5F5' };
        if (['doc','docx'].includes(ext))                          return { label: 'DOC',   color: '#1565C0', bg: '#E3F2FD' };
        if (['xls','xlsx','csv'].includes(ext))                    return { label: 'XLS',   color: '#2E7D32', bg: '#E8F5E9' };
        if (['zip','rar','7z'].includes(ext))                      return { label: 'ZIP',   color: '#E65100', bg: '#FFF3E0' };
        return                                                            { label: 'FILE',  color: '#37474F', bg: '#ECEFF1' };
    }

    function fmtSize(bytes) {
        if (!bytes) return '—';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function fmtDate(d) {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function esc(s) {
        return String(s || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    const BASE = 'https://zoho.gharda.com:14443/production';

    // ── Sidebar ───────────────────────────────────────────────────────────
    const sidebarItems = [
        `<a class="nav-item active" href="#" onclick="return filterCat('__all__', this)">
            <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            <span class="nav-label">All Documents</span>
            <span class="nav-badge">${totalFiles}</span>
        </a>`,
        ...Object.entries(categories).map(([cat, files]) => `
        <a class="nav-item" href="#" onclick="return filterCat('${esc(cat)}', this)">
            <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="nav-label">${esc(cat)}</span>
            <span class="nav-badge">${files.length}</span>
        </a>`),
    ].join('');

    // ── File rows ─────────────────────────────────────────────────────────
    const fileRows = allFiles.map(file => {
        const ft      = fileType(file.name);
        const ext     = (file.name || '').split('.').pop().toUpperCase().slice(0, 4);
        const isImage = ft.label === 'IMG';
        // Use signed token URL if provided (secure), else fall back to direct (legacy)
        const absUrl  = signFileUrl ? signFileUrl(file.url) : (BASE + file.url);

        return `
        <tr class="file-row" data-cat="${esc(file.fieldLabel || '')}">
            <td class="col-icon">
                <div class="file-badge" style="background:${ft.bg};color:${ft.color};">${esc(ext)}</div>
            </td>
            <td class="col-name">
                <div class="file-name">${esc(file.name)}</div>
                <div class="file-cat">${esc(file.fieldLabel || '')}</div>
            </td>
            <td class="col-size">${fmtSize(file.size)}</td>
            <td class="col-date">${fmtDate(file.modified)}</td>
            <td class="col-actions">
                ${isImage ? `<a href="${esc(absUrl)}" target="_blank" class="btn-action btn-view">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>View</a>` : ''}
                <a href="${esc(absUrl)}" download class="btn-action btn-dl">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>Download</a>
            </td>
        </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Documents — Gharda Chemicals</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
            --blue:      #0078D4;
            --blue-dk:   #005A9E;
            --blue-lt:   #EFF6FC;
            --blue-mid:  #C7E0F4;
            --bg:        #F3F2F1;
            --surface:   #FFFFFF;
            --s2:        #F3F2F1;
            --s3:        #EDEBE9;
            --border:    #E1DFDD;
            --text:      #201F1E;
            --muted:     #605E5C;
            --light:     #A19F9D;
            --sw:        240px;
            --font:      'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        html, body { height: 100%; overflow: hidden; }
        body { font-family: var(--font); background: var(--bg); color: var(--text); font-size: 14px; display: flex; flex-direction: column; }

        /* Suite bar */
        .suite { height: 48px; background: var(--blue); display: flex; align-items: center; padding: 0 16px; gap: 10px; flex-shrink: 0; }
        .suite-box { width: 26px; height: 26px; background: #fff; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: var(--blue); }
        .suite-name { color: #fff; font-size: 15px; font-weight: 600; }
        .suite-div  { width: 1px; height: 20px; background: rgba(255,255,255,0.3); }
        .suite-app  { color: rgba(255,255,255,0.85); font-size: 13px; }
        .suite-right { margin-left: auto; }
        .expiry {
            background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);
            color: #fff; font-size: 12px; padding: 3px 10px; border-radius: 12px;
            display: flex; align-items: center; gap: 6px;
        }
        .expiry-dot { width: 6px; height: 6px; border-radius: 50%; background: #FFD700; animation: blink 2s infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.35} }

        /* Command bar */
        .cmdbar { height: 44px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 12px; gap: 2px; flex-shrink: 0; }
        .cmd { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 2px; font-size: 13px; color: var(--text); background: transparent; border: none; cursor: pointer; text-decoration: none; transition: background .1s; }
        .cmd:hover { background: var(--s3); color: var(--text); }
        .cmd svg { color: var(--blue); }
        .cmd-sep { width: 1px; height: 22px; background: var(--border); margin: 0 6px; }
        .search-wrap { margin-left: auto; position: relative; }
        .search-wrap svg { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: var(--light); pointer-events: none; }
        .search-wrap input { border: 1px solid var(--border); border-radius: 2px; padding: 5px 8px 5px 28px; font-size: 13px; font-family: var(--font); color: var(--text); background: var(--surface); outline: none; width: 220px; transition: border-color .15s, box-shadow .15s; }
        .search-wrap input:focus { border-color: var(--blue); box-shadow: 0 0 0 1px var(--blue); }
        .search-wrap input::placeholder { color: var(--light); }

        /* Layout */
        .layout { display: flex; flex: 1; overflow: hidden; }

        /* Sidebar */
        .sidebar { width: var(--sw); background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow-y: auto; flex-shrink: 0; }
        .sb-section { padding: 12px 8px 4px; }
        .sb-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .6px; color: var(--muted); padding: 0 8px; margin-bottom: 4px; }
        .nav-item { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 2px; font-size: 13px; color: var(--text); text-decoration: none; cursor: pointer; transition: background .1s; user-select: none; }
        .nav-item:hover { background: var(--s3); }
        .nav-item.active { background: var(--blue-lt); color: var(--blue-dk); font-weight: 600; }
        .nav-item.active .nav-icon { color: var(--blue); }
        .nav-icon { color: var(--muted); flex-shrink: 0; }
        .nav-label { flex: 1; }
        .nav-badge { font-size: 11px; font-weight: 600; color: var(--muted); background: var(--s3); padding: 1px 6px; border-radius: 10px; }
        .nav-item.active .nav-badge { background: var(--blue-mid); color: var(--blue-dk); }
        .sb-divider { height: 1px; background: var(--border); margin: 8px 12px; }
        .sb-info { padding: 10px 16px 16px; margin-top: auto; }
        .sb-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); padding: 3px 0; }
        .sb-row strong { color: var(--text); }

        /* Content */
        .content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .bcbar { background: var(--surface); border-bottom: 1px solid var(--border); padding: 8px 20px; display: flex; align-items: center; gap: 6px; font-size: 13px; flex-shrink: 0; }
        .bc { color: var(--muted); }
        .bc.cur { color: var(--text); font-weight: 500; }
        .bc-sep { color: var(--light); font-size: 11px; }

        /* File table */
        .tbl-wrap { flex: 1; overflow-y: auto; }
        .no-res { display: none; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; color: var(--muted); text-align: center; }
        .no-res svg { opacity: .3; margin-bottom: 16px; }
        .no-res h3 { font-size: 16px; color: var(--text); margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        thead { position: sticky; top: 0; z-index: 2; }
        th { background: var(--surface); border-bottom: 1px solid var(--border); padding: 8px 12px; font-weight: 600; font-size: 12px; color: var(--muted); text-align: left; white-space: nowrap; }
        td { padding: 8px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .file-row { background: var(--surface); transition: background .1s; }
        .file-row:hover { background: var(--blue-lt); }
        .file-row:hover .btn-action { opacity: 1; }
        .col-icon { width: 44px; }
        .col-name { min-width: 180px; }
        .col-size { width: 90px; color: var(--muted); white-space: nowrap; }
        .col-date { width: 120px; color: var(--muted); white-space: nowrap; }
        .col-actions { width: 170px; text-align: right; }
        .file-badge { width: 32px; height: 32px; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; letter-spacing: -.3px; }
        .file-name { font-weight: 500; color: var(--text); }
        .file-cat  { font-size: 11px; color: var(--light); margin-top: 1px; }
        .btn-action { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 2px; font-size: 12px; font-weight: 500; text-decoration: none; transition: all .1s; opacity: 0; margin-left: 4px; }
        .btn-view { color: var(--blue); background: var(--blue-lt); border: 1px solid var(--blue-mid); }
        .btn-view:hover { background: var(--blue-mid); }
        .btn-dl { color: var(--text); background: var(--surface); border: 1px solid var(--border); }
        .btn-dl:hover { background: var(--s3); border-color: var(--muted); color: var(--text); }

        /* Status bar */
        .statusbar { height: 24px; background: var(--surface); border-top: 1px solid var(--border); padding: 0 16px; display: flex; align-items: center; gap: 16px; font-size: 12px; color: var(--muted); flex-shrink: 0; }
        .statusbar span { color: var(--text); font-weight: 500; }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: var(--s2); }
        ::-webkit-scrollbar-thumb { background: #C8C6C4; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--light); }

        @media (max-width: 640px) {
            :root { --sw: 0px; }
            .sidebar, .col-date, .col-size { display: none; }
        }
    </style>
</head>
<body>

<div class="suite">
    <div class="suite-box">G</div>
    <span class="suite-name">Gharda Chemicals</span>
    <div class="suite-div"></div>
    <span class="suite-app">Document Library</span>
    <div class="suite-right">

    </div>
</div>

<div class="cmdbar">
    <a class="cmd" href="#" onclick="return downloadAll()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download All
    </a>
    <div class="cmd-sep"></div>
    <div class="search-wrap">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" id="srch" placeholder="Search documents" oninput="search(this.value)" autocomplete="off"/>
    </div>
</div>

<div class="layout">
    <div class="sidebar">
        <div class="sb-section">
            <div class="sb-label">Libraries</div>
            ${sidebarItems}
        </div>
        <div class="sb-divider"></div>
        <div class="sb-info">
            <div class="sb-row"><span>Total files</span><strong>${totalFiles}</strong></div>
            <div class="sb-row"><span>Total size</span><strong>${fmtSize(totalSize)}</strong></div>
            <div class="sb-row"><span>Account</span><strong style="font-size:11px;word-break:break-all;">${esc(folderName)}</strong></div>
        </div>
    </div>

    <div class="content">
        <div class="bcbar">
            <span class="bc">Document Library</span>
            <span class="bc-sep">›</span>
            <span class="bc cur" id="bcCur">All Documents</span>
        </div>
        <div class="tbl-wrap">
            <div class="no-res" id="noRes">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <h3>No documents found</h3>
                <p>Try a different search term or category.</p>
            </div>
            <table id="tbl">
                <thead>
                    <tr>
                        <th class="col-icon"></th>
                        <th class="col-name">Name</th>
                        <th class="col-size">Size</th>
                        <th class="col-date">Modified</th>
                        <th class="col-actions"></th>
                    </tr>
                </thead>
                <tbody>${fileRows}</tbody>
            </table>
        </div>
    </div>
</div>

<div class="statusbar">
    <span id="stCount">${totalFiles}</span> items &nbsp;·&nbsp;
    <span id="stSize">${fmtSize(totalSize)}</span>
</div>

<script>
    const rows = Array.from(document.querySelectorAll('.file-row'));
    let curCat = '__all__', curQ = '';

    function filterCat(cat, el) {
        curCat = cat; curQ = '';
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
        document.getElementById('bcCur').textContent = cat === '__all__' ? 'All Documents' : cat;
        document.getElementById('srch').value = '';
        apply(); return false;
    }

    function search(q) {
        curQ = q.toLowerCase().trim();
        if (curQ) {
            curCat = '__all__';
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            const allNav = document.querySelector('[onclick*="__all__"]');
            if (allNav) allNav.classList.add('active');
        }
        apply();
    }

    function apply() {
        let n = 0;
        rows.forEach(r => {
            const catOk  = curCat === '__all__' || r.dataset.cat === curCat;
            const searchOk = !curQ || r.querySelector('.file-name').textContent.toLowerCase().includes(curQ);
            const show   = catOk && searchOk;
            r.style.display = show ? '' : 'none';
            if (show) n++;
        });
        document.getElementById('noRes').style.display = n ? 'none' : 'flex';
        document.getElementById('tbl').style.display   = n ? '' : 'none';
        document.getElementById('stCount').textContent = n;
    }

    function downloadAll() {
        rows.filter(r => r.style.display !== 'none')
            .map(r => r.querySelector('.btn-dl')?.href)
            .filter(Boolean)
            .forEach((url, i) => setTimeout(() => {
                const a = document.createElement('a');
                a.href = url; a.download = '';
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
            }, i * 400));
        return false;
    }
</script>
</body>
</html>`;
}

function renderDocsEmpty(folderName) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>No Documents — Gharda Chemicals</title>
    <style>
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Segoe UI',-apple-system,sans-serif;background:#F3F2F1;color:#201F1E;min-height:100vh;display:flex;flex-direction:column;}
        .top{height:48px;background:#0078D4;display:flex;align-items:center;padding:0 16px;gap:8px;}
        .top-box{width:26px;height:26px;background:#fff;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#0078D4;}
        .top span{color:#fff;font-size:15px;font-weight:600;}
        .mid{flex:1;display:flex;align-items:center;justify-content:center;}
        .card{background:#fff;border:1px solid #E1DFDD;border-radius:4px;padding:48px 40px;text-align:center;max-width:400px;}
        .ico{font-size:48px;margin-bottom:16px;opacity:.4;}
        h2{font-size:18px;font-weight:600;margin-bottom:8px;}
        p{font-size:13px;color:#605E5C;line-height:1.6;}
    </style>
</head>
<body>
    <div class="top"><div class="top-box">G</div><span>Gharda Chemicals — Document Library</span></div>
    <div class="mid">
        <div class="card">
            <div class="ico">📂</div>
            <h2>No Documents Found</h2>
            <p>No files have been synced for this account yet.<br>Please contact your administrator.</p>
        </div>
    </div>
</body>
</html>`;
}
// ════════════════════════════════════════════════════════════════════════════
//  LOGS DASHBOARD
// ════════════════════════════════════════════════════════════════════════════

export function renderLogsPage({ analytics, entries, days, apiKey }) {
    const { totals, daily, topEndpoints, recentErrors, lastActivity } = analytics;
    const errorRate = totals.requests > 0
        ? ((totals.errors / totals.requests) * 100).toFixed(1)
        : '0.0';

    // ── Daily chart bars ────────────────────────────────────────────────────
    const maxReq  = Math.max(...daily.map(d => d.requests), 1);
    const chartBars = daily.map(d => {
        const reqPct = Math.round((d.requests / maxReq) * 100);
        const errPct = d.requests > 0 ? Math.round((d.errors / d.requests) * 100) : 0;
        return `<div class="bg">
            <div class="bw">
                <div class="b r" style="height:${reqPct}%" title="${d.requests} requests"></div>
                <div class="b e" style="height:${errPct}%" title="${d.errors} errors"></div>
            </div>
            <div class="bl">${d.date.slice(5)}</div>
        </div>`;
    }).join('');

    // ── Top endpoints ────────────────────────────────────────────────────────
    const maxEp = topEndpoints[0]?.count || 1;
    const epRows = topEndpoints.map(e => {
        const pct = Math.round((e.count / maxEp) * 100);
        return `<div class="ep">
            <div class="ep-path">${e.path}</div>
            <div class="ep-bar-bg"><div class="ep-bar-fill" style="width:${pct}%"></div></div>
            <div class="ep-ct">${e.count}</div>
        </div>`;
    }).join('') || '<div class="nil">no http logs found</div>';

    // ── Recent errors ────────────────────────────────────────────────────────
    const errRows = recentErrors.map(e => {
        const ts  = e.timestamp || '';
        const msg = e.message || '';
        const extra = e.error || e.stack || '';
        return `<div class="er">
            <div class="er-ts">${ts}</div>
            <div class="er-msg">${escH(msg)}${extra ? ` <em>— ${escH(String(extra).slice(0, 120))}</em>` : ''}</div>
        </div>`;
    }).join('') || '<div class="nil">no errors ✓</div>';

    // ── Log entries ──────────────────────────────────────────────────────────
    const entryRows = entries.slice(0, 300).map(e => {
        const lvl = (e.level || 'info').toLowerCase();
        const msg = e.message || '';
        const ts  = e.timestamp || '';
        const { level, message, timestamp, ...rest } = e;
        const extra = Object.keys(rest).length ? ' ' + JSON.stringify(rest) : '';
        return `<tr class="log-row" data-level="${lvl}" data-msg="${escH(msg).toLowerCase()}">
            <td class="ts">${ts}</td>
            <td><span class="lv lv-${lvl}">${lvl}</span></td>
            <td class="lm">${escH(msg)}<span class="lx">${escH(extra)}</span></td>
        </tr>`;
    }).join('');

    const dataUrl = `/logs/data?key=${encodeURIComponent(apiKey)}&days=${days || 30}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Logs — Gharda CRM API</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        :root{
            --bg:#f7f6f3;
            --bg2:#ffffff;
            --bg3:#f0efe9;
            --line:#e2e0d8;
            --line2:#d4d1c8;
            --text:#1a1916;
            --dim:#78756a;
            --faint:#a8a49a;
            --amber:#b07d3a;
            --amber2:#c8943e;
            --red:#b83c35;
            --green:#2d7a3e;
            --blue:#2d5fa8;
            --orange:#d4955a;
            --mono:'JetBrains Mono',monospace;
            --sans:'Instrument Sans',-apple-system,sans-serif;
        }
        html{font-size:14px}
        body{font-family:var(--sans);background:var(--bg);color:var(--text);min-height:100vh;line-height:1.5}

        /* ── Topbar ─────────────────────────────────────────────────────── */
        .tb{
            height:48px;
            background:var(--bg2);
            border-bottom:1px solid var(--line);
            display:flex;align-items:center;
            padding:0 24px;gap:0;
            position:sticky;top:0;z-index:50;
        }
        .tb-brand{
            font-family:var(--mono);font-size:12px;font-weight:600;
            color:var(--amber);letter-spacing:.08em;
            padding-right:20px;margin-right:20px;
            border-right:1px solid var(--line);
        }
        .tb-title{font-size:13px;font-weight:500;color:var(--dim);flex:1}
        .tb-right{display:flex;align-items:center;gap:10px}
        .tb-status{
            display:flex;align-items:center;gap:7px;
            font-family:var(--mono);font-size:11px;color:var(--dim);
        }
        .pulse{
            width:6px;height:6px;border-radius:50%;
            background:var(--green);
            box-shadow:0 0 0 0 var(--green);
            animation:heartbeat 2.5s ease infinite;
        }
        @keyframes heartbeat{
            0%{box-shadow:0 0 0 0 rgba(106,175,122,.5)}
            70%{box-shadow:0 0 0 5px rgba(106,175,122,0)}
            100%{box-shadow:0 0 0 0 rgba(106,175,122,0)}
        }
        select.tb-sel{
            background:var(--bg3);border:1px solid var(--line2);
            border-radius:4px;padding:4px 8px;
            color:var(--text);font-size:11px;
            font-family:var(--mono);outline:none;cursor:pointer;
        }
        select.tb-sel:focus{border-color:var(--amber)}

        /* ── Layout ─────────────────────────────────────────────────────── */
        .wrap{max-width:1320px;margin:0 auto;padding:24px 24px 48px}

        /* ── Stat strip ─────────────────────────────────────────────────── */
        .stats{
            display:grid;
            grid-template-columns:repeat(6,1fr);
            border:1px solid var(--line);
            border-radius:6px;
            overflow:hidden;
            margin-bottom:20px;
        }
        @media(max-width:1000px){.stats{grid-template-columns:repeat(3,1fr)}}
        .stat{
            padding:16px 20px;
            border-right:1px solid var(--line);
            position:relative;
        }
        .stat:last-child{border-right:none}
        .stat::before{
            content:'';position:absolute;top:0;left:0;right:0;height:2px;
            background:var(--accent-line,var(--line2));
        }
        .stat-n{
            font-family:var(--mono);font-size:24px;font-weight:600;
            line-height:1;color:var(--stat-col,var(--text));
            margin-bottom:6px;
        }
        .stat-l{font-size:11px;color:var(--dim);letter-spacing:.04em;text-transform:uppercase}

        /* ── Two-column main ─────────────────────────────────────────────── */
        .main-grid{display:grid;grid-template-columns:1fr 340px;gap:16px;margin-bottom:16px}
        @media(max-width:1100px){.main-grid{grid-template-columns:1fr}}

        /* ── Sections ────────────────────────────────────────────────────── */
        .sec{background:var(--bg2);border:1px solid var(--line);border-radius:6px;overflow:hidden}
        .sec-head{
            padding:11px 16px;
            border-bottom:1px solid var(--line);
            display:flex;align-items:center;justify-content:space-between;
        }
        .sec-title{
            font-family:var(--mono);font-size:11px;font-weight:500;
            color:var(--dim);letter-spacing:.08em;text-transform:uppercase;
        }
        .sec-body{padding:16px}

        /* ── Activity chart ──────────────────────────────────────────────── */
        .chart{display:flex;align-items:flex-end;gap:3px;height:80px;padding:0 2px}
        .bg{display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;min-width:0}
        .bw{display:flex;align-items:flex-end;gap:1px;width:100%;height:64px}
        .b{flex:1;border-radius:1px 1px 0 0;min-height:1px;transition:opacity .15s}
        .b:hover{opacity:1!important;filter:brightness(1.2)}
        .b.r{background:var(--blue);opacity:.7}
        .b.e{background:var(--red);opacity:.8}
        .bl{font-size:9px;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;text-align:center;font-family:var(--mono)}
        .chart-leg{display:flex;gap:14px;padding:10px 2px 4px;font-size:11px;color:var(--dim);font-family:var(--mono)}
        .dot{display:inline-block;width:7px;height:7px;border-radius:1px;margin-right:5px;vertical-align:middle}

        /* ── Level grid ──────────────────────────────────────────────────── */
        .lvl-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .lvl-tile{
            background:var(--bg3);border:1px solid var(--line);
            border-radius:4px;padding:12px 14px;
        }
        .lvl-n{font-family:var(--mono);font-size:20px;font-weight:600;line-height:1;margin-bottom:4px}
        .lvl-l{font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:.06em}
        .lvl-tile.e .lvl-n{color:var(--red)}
        .lvl-tile.w .lvl-n{color:var(--orange)}
        .lvl-tile.i .lvl-n{color:var(--blue)}
        .lvl-tile.h .lvl-n{color:var(--green)}

        /* ── Endpoint list ───────────────────────────────────────────────── */
        .ep{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--line)}
        .ep:last-child{border-bottom:none}
        .ep-path{font-family:var(--mono);font-size:11px;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .ep-bar-bg{width:80px;height:4px;background:var(--bg3);border-radius:2px;flex-shrink:0}
        .ep-bar-fill{height:100%;background:var(--amber);border-radius:2px;transition:width .3s}
        .ep-ct{font-family:var(--mono);font-size:11px;color:var(--dim);width:30px;text-align:right;flex-shrink:0}

        /* ── Error list ───────────────────────────────────────────────────── */
        .er{padding:8px 0;border-bottom:1px solid var(--line);font-size:12px}
        .er:last-child{border-bottom:none}
        .er-ts{font-family:var(--mono);font-size:10px;color:var(--faint);margin-bottom:3px}
        .er-msg{color:var(--red);line-height:1.4;word-break:break-word}
        .er-msg em{color:var(--dim);font-style:normal}

        /* ── Log viewer ───────────────────────────────────────────────────── */
        .log-ctrl{
            padding:10px 14px;border-bottom:1px solid var(--line);
            display:flex;align-items:center;gap:8px;flex-wrap:wrap;
        }
        .log-srch{
            flex:1;min-width:150px;
            background:var(--bg3);border:1px solid var(--line2);
            border-radius:4px;padding:6px 10px;
            color:var(--text);font-size:12px;font-family:var(--mono);
            outline:none;
        }
        .log-srch:focus{border-color:var(--amber)}
        .log-srch::placeholder{color:var(--faint)}
        .f{
            padding:4px 10px;border-radius:3px;
            border:1px solid var(--line2);background:transparent;
            color:var(--dim);font-size:11px;font-family:var(--mono);
            cursor:pointer;transition:.12s;letter-spacing:.02em;
        }
        .f:hover{color:var(--text);border-color:var(--line2)}
        .f.on{background:var(--amber);border-color:var(--amber);color:#fff}
        .f.fe.on{background:var(--red);border-color:var(--red);color:#fff}
        .f.fw.on{background:var(--orange);border-color:var(--orange);color:#fff}
        .f.fh.on{background:var(--green);border-color:var(--green);color:#fff}
        .log-tbl{width:100%;border-collapse:collapse;font-size:11px;font-family:var(--mono)}
        .log-tbl th{
            padding:7px 12px;text-align:left;
            font-size:10px;font-weight:500;color:var(--faint);
            letter-spacing:.06em;text-transform:uppercase;
            border-bottom:1px solid var(--line);
            background:var(--bg3);position:sticky;top:0;
        }
        .log-tbl td{padding:5px 12px;border-bottom:1px solid rgba(42,43,39,.6);vertical-align:top}
        .log-row:last-child td{border-bottom:none}
        .log-row:hover td{background:var(--bg3)}
        .ts{color:var(--faint);white-space:nowrap}
        .lm{color:var(--text);word-break:break-word;line-height:1.5}
        .lx{color:var(--faint)}
        .lv{display:inline-block;padding:1px 6px;border-radius:2px;font-size:9px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
        .lv-error{background:rgba(212,100,90,.18);color:var(--red)}
        .lv-warn{background:rgba(212,149,90,.18);color:var(--orange)}
        .lv-info{background:rgba(106,159,212,.15);color:var(--blue)}
        .lv-http{background:rgba(106,175,122,.15);color:var(--green)}
        .log-wrap{overflow-x:auto;max-height:480px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--line2) transparent}

        /* ── Refresh bar ──────────────────────────────────────────────────── */
        .rfb{display:flex;align-items:center;gap:10px}
        .rbtn{
            padding:4px 12px;border-radius:4px;
            border:1px solid var(--line2);background:var(--bg3);
            color:var(--dim);font-size:11px;font-family:var(--mono);
            cursor:pointer;transition:.12s;
        }
        .rbtn:hover{border-color:var(--amber);color:var(--amber)}
        .rbtn.pri{background:var(--amber);border-color:var(--amber);color:#fff;font-weight:600}
        .rbtn.pri:hover{background:var(--amber2);border-color:var(--amber2);color:#fff}
        .tog{display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none}
        .tog input{display:none}
        .tog-tr{
            width:30px;height:16px;border-radius:8px;
            background:var(--bg3);border:1px solid var(--line2);
            position:relative;transition:.2s;
        }
        .tog-th{
            position:absolute;top:2px;left:2px;
            width:10px;height:10px;border-radius:50%;
            background:var(--faint);transition:.2s;
        }
        input:checked ~ .tog-tr{background:var(--amber);border-color:var(--amber)}
        input:checked ~ .tog-tr .tog-th{left:16px;background:#fff}
        .cd{font-family:var(--mono);font-size:11px;color:var(--dim);min-width:25px}
        .upd{font-family:var(--mono);font-size:10px;color:var(--faint)}

        /* ── Side column ──────────────────────────────────────────────────── */
        .side{display:flex;flex-direction:column;gap:14px}

        /* ── Empty ────────────────────────────────────────────────────────── */
        .nil{padding:20px;text-align:center;font-size:12px;color:var(--faint);font-family:var(--mono)}

        /* ── Stagger animation ────────────────────────────────────────────── */
        .wrap>*{animation:fadeUp .25s ease both}
        .stats{animation-delay:.04s}
        .main-grid{animation-delay:.1s}
        .sec:last-child{animation-delay:.14s}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    </style>
</head>
<body>

<div class="tb">
    <div class="tb-brand">GHARDA</div>
    <div class="tb-title">Server Logs</div>
    <div class="tb-right">
        <div class="tb-status">
            <div class="pulse"></div>
            <span id="tbStatus">live</span>
        </div>
        <select class="tb-sel" id="daysSel" onchange="changeDays(this.value)">
            <option value="1" ${days===1?'selected':''}>today</option>
            <option value="7" ${days===7?'selected':''}>7d</option>
            <option value="14" ${days===14?'selected':''}>14d</option>
            <option value="30" ${days>=30?'selected':''}>30d</option>
            <option value="60" ${days===60?'selected':''}>60d</option>
        </select>
    </div>
</div>

<div class="wrap">

    <!-- Stat strip -->
    <div class="stats">
        <div class="stat" style="--accent-line:var(--blue);--stat-col:var(--blue)">
            <div class="stat-n" id="sReq">${totals.requests.toLocaleString()}</div>
            <div class="stat-l">Requests</div>
        </div>
        <div class="stat" style="--accent-line:var(--red);--stat-col:var(--red)">
            <div class="stat-n" id="sErr">${totals.errors.toLocaleString()}</div>
            <div class="stat-l">Errors</div>
        </div>
        <div class="stat" style="--accent-line:var(--orange);--stat-col:var(--orange)">
            <div class="stat-n" id="sWarn">${totals.warnings.toLocaleString()}</div>
            <div class="stat-l">Warnings</div>
        </div>
        <div class="stat" style="--accent-line:${parseFloat(errorRate)>5?'var(--red)':'var(--green)'};--stat-col:${parseFloat(errorRate)>5?'var(--red)':'var(--green)'}">
            <div class="stat-n" id="sRate">${errorRate}%</div>
            <div class="stat-l">Error Rate</div>
        </div>
        <div class="stat" style="--accent-line:var(--amber)">
            <div class="stat-n" id="sLines">${totals.allLines.toLocaleString()}</div>
            <div class="stat-l">Log Lines</div>
        </div>
        <div class="stat">
            <div class="stat-n" style="font-size:14px;margin-top:5px" id="sLast">${lastActivity ? lastActivity.slice(11,19) : '—'}</div>
            <div class="stat-l">Last Seen</div>
        </div>
    </div>

    <!-- Main: chart + side -->
    <div class="main-grid">

        <!-- Left: chart + endpoints + errors -->
        <div style="display:flex;flex-direction:column;gap:14px">

            <div class="sec">
                <div class="sec-head">
                    <span class="sec-title">Activity</span>
                    <div class="chart-leg">
                        <span><span class="dot" style="background:var(--blue)"></span>req</span>
                        <span><span class="dot" style="background:var(--red)"></span>err</span>
                    </div>
                </div>
                <div style="padding:14px 16px 8px">
                    <div class="chart" id="chart">${chartBars || '<div class="nil">no data for this period</div>'}</div>
                </div>
            </div>

            <div class="sec">
                <div class="sec-head"><span class="sec-title">Top Endpoints</span></div>
                <div class="sec-body" id="epList">${epRows}</div>
            </div>

            <div class="sec">
                <div class="sec-head"><span class="sec-title">Recent Errors</span></div>
                <div class="sec-body" id="errList">${errRows}</div>
            </div>

        </div>

        <!-- Right: levels -->
        <div class="side">
            <div class="sec">
                <div class="sec-head"><span class="sec-title">Level Breakdown</span></div>
                <div class="sec-body">
                    <div class="lvl-grid">
                        <div class="lvl-tile e"><div class="lvl-n" id="lvlErr">${totals.errors}</div><div class="lvl-l">Error</div></div>
                        <div class="lvl-tile w"><div class="lvl-n" id="lvlWarn">${totals.warnings}</div><div class="lvl-l">Warn</div></div>
                        <div class="lvl-tile i"><div class="lvl-n" id="lvlInfo">${totals.info}</div><div class="lvl-l">Info</div></div>
                        <div class="lvl-tile h"><div class="lvl-n" id="lvlHttp">${totals.requests}</div><div class="lvl-l">HTTP</div></div>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <!-- Log viewer -->
    <div class="sec">
        <div class="sec-head">
            <span class="sec-title">Log Viewer</span>
            <div class="rfb">
                <label class="tog">
                    <input type="checkbox" id="autoTog" onchange="toggleAuto(this.checked)">
                    <div class="tog-tr"><div class="tog-th"></div></div>
                </label>
                <span class="cd" id="cd"></span>
                <button class="rbtn pri" onclick="refreshNow()">↻ refresh</button>
                <span class="upd" id="upd"></span>
            </div>
        </div>
        <div class="log-ctrl">
            <input class="log-srch" id="logSrch" type="text" placeholder="search…" oninput="filterLogs()">
            <button class="f on"   id="f-all"   onclick="setF('all')">all</button>
            <button class="f fe"   id="f-error" onclick="setF('error')">error</button>
            <button class="f fw"   id="f-warn"  onclick="setF('warn')">warn</button>
            <button class="f"      id="f-info"  onclick="setF('info')">info</button>
            <button class="f fh"   id="f-http"  onclick="setF('http')">http</button>
        </div>
        <div class="log-wrap">
            <table class="log-tbl">
                <thead><tr>
                    <th style="width:148px">timestamp</th>
                    <th style="width:62px">level</th>
                    <th>message</th>
                </tr></thead>
                <tbody id="logBody">${entryRows}</tbody>
            </table>
        </div>
    </div>

</div>

<script>
    const DATA_URL = '${dataUrl}';
    let af = 'all', cdVal = 10, aiv = null, ctv = null;

    function setF(lvl) {
        af = lvl;
        document.querySelectorAll('.f').forEach(b => b.classList.remove('on'));
        document.getElementById('f-' + lvl).classList.add('on');
        filterLogs();
    }

    function filterLogs() {
        const q = document.getElementById('logSrch').value.toLowerCase();
        document.querySelectorAll('#logBody .log-row').forEach(r => {
            const lvl = r.dataset.level || '', msg = r.dataset.msg || '';
            const ml = af === 'all' || lvl === af;
            const mq = !q || msg.includes(q);
            r.style.display = ml && mq ? '' : 'none';
        });
    }

    function toggleAuto(on) {
        if (on) {
            cdVal = 10;
            document.getElementById('cd').textContent = cdVal + 's';
            aiv = setInterval(() => { refreshNow(); cdVal = 10; }, 10000);
            ctv = setInterval(() => { cdVal--; document.getElementById('cd').textContent = cdVal + 's'; if (cdVal <= 0) cdVal = 10; }, 1000);
        } else {
            clearInterval(aiv); clearInterval(ctv); aiv = ctv = null;
            document.getElementById('cd').textContent = '';
        }
    }

    async function refreshNow() {
        try {
            const r = await fetch(DATA_URL);
            if (!r.ok) return;
            applyData(await r.json());
            document.getElementById('upd').textContent = new Date().toLocaleTimeString();
        } catch(e) { console.error(e); }
    }

    function applyData({ analytics, entries }) {
        const { totals, daily, topEndpoints, recentErrors } = analytics;
        document.getElementById('sReq').textContent  = totals.requests.toLocaleString();
        document.getElementById('sErr').textContent  = totals.errors.toLocaleString();
        document.getElementById('sWarn').textContent = totals.warnings.toLocaleString();
        const rate = totals.requests > 0 ? ((totals.errors/totals.requests)*100).toFixed(1) : '0.0';
        document.getElementById('sRate').textContent  = rate + '%';
        document.getElementById('sLines').textContent = totals.allLines.toLocaleString();
        document.getElementById('lvlErr').textContent  = totals.errors;
        document.getElementById('lvlWarn').textContent = totals.warnings;
        document.getElementById('lvlInfo').textContent = totals.info;
        document.getElementById('lvlHttp').textContent = totals.requests;

        // Rebuild chart
        const mx = Math.max(...daily.map(d => d.requests), 1);
        document.getElementById('chart').innerHTML = daily.map(d => {
            const rp = Math.round((d.requests/mx)*100);
            const ep = d.requests > 0 ? Math.round((d.errors/d.requests)*100) : 0;
            return '<div class="bg"><div class="bw"><div class="b r" style="height:'+rp+'%" title="'+d.requests+' req"></div><div class="b e" style="height:'+ep+'%" title="'+d.errors+' err"></div></div><div class="bl">'+d.date.slice(5)+'</div></div>';
        }).join('') || '<div class="nil">no data</div>';

        // Rebuild endpoints
        const maxEp = topEndpoints[0]?.count || 1;
        document.getElementById('epList').innerHTML = topEndpoints.map(e =>
            '<div class="ep"><div class="ep-path">'+e.path+'</div><div class="ep-bar-bg"><div class="ep-bar-fill" style="width:'+Math.round((e.count/maxEp)*100)+'%"></div></div><div class="ep-ct">'+e.count+'</div></div>'
        ).join('') || '<div class="nil">no data</div>';

        // Rebuild errors
        document.getElementById('errList').innerHTML = recentErrors.slice(0,10).map(e =>
            '<div class="er"><div class="er-ts">'+(e.timestamp||'')+'</div><div class="er-msg">'+escH(e.message||'')+(e.error?'<em> — '+escH(String(e.error).slice(0,100))+'</em>':'')+'</div></div>'
        ).join('') || '<div class="nil">no errors ✓</div>';

        // Rebuild log table
        document.getElementById('logBody').innerHTML = entries.slice(0,300).map(e => {
            const lvl = (e.level||'info').toLowerCase();
            const {level,message,timestamp,...rest} = e;
            const ex = Object.keys(rest).length ? ' '+JSON.stringify(rest) : '';
            return '<tr class="log-row" data-level="'+lvl+'" data-msg="'+(message||'').toLowerCase()+'"><td class="ts">'+(timestamp||'')+'</td><td><span class="lv lv-'+lvl+'">'+lvl+'</span></td><td class="lm">'+escH(message||'')+'<span class="lx">'+escH(ex)+'</span></td></tr>';
        }).join('');
        filterLogs();
    }

    function escH(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function changeDays(v) {
        const u = new URL(window.location.href);
        u.searchParams.set('days', v);
        window.location.href = u.toString();
    }
</script>
</body>
</html>`

}

// ── HTML escape helper ────────────────────────────────────────────────────────
function escH(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}