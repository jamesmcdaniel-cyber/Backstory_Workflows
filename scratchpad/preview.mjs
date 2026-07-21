import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from './web/node_modules/playwright-core/index.js';

// Same logic as briefToHtml (DeliveryPreview.jsx) / mdToHtml (index.html)
function briefToHtml(md) {
  if (!md) return '';
  const inline = (s) => s
    .replace(/===(.+?)===/g, '<span class="slack-money">$1</span>')
    .replace(/@([\w.]+)/g, '<span class="slack-mention">@$1</span>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
  const lines = String(md).split('\n');
  let html = '', inList = false, sectionSeen = false;
  const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('<')) { closeList(); html += t; }
    else if (t.startsWith('## ')) { closeList(); html += `<div class="so-section${sectionSeen ? '' : ' so-section--first'}">${inline(t.slice(3))}</div>`; sectionSeen = true; }
    else if (t.startsWith('> ')) { closeList(); html += `<div class="so-callout">${inline(t.slice(2))}</div>`; }
    else if (t === '---') { closeList(); html += '<hr>'; }
    else if (t.startsWith('- ')) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${inline(t.slice(2))}</li>`; }
    else { closeList(); html += `<p>${inline(t)}</p>`; }
  }
  closeList();
  return html;
}

const skills = JSON.parse(readFileSync('skills/skills.json', 'utf8')).skills;
const s = skills.find((x) => x.id === '02-external-company-news-agent');
const so = s.sample_output;
const initial = (so.bot_name || 'A')[0].toUpperCase();

const page = `<!doctype html><html><head><meta charset="utf8"><style>
  @import url('https://fonts.googleapis.com/css2?family=Chivo+Mono:wght@400;500;700&family=Inter:wght@400;500;700;900&display=swap');
  :root{--ac-dark:#171721;--ac-dark-secondary:#55555E;--ac-med-gray:#8E8E92;--ac-light-gray:#E3E3E4;--ac-coral:#447C93;--ac-coral-dark:#2B6178;--ac-card:#fff;}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#F1F2F5;font-family:Inter,sans-serif;padding:32px;color:var(--ac-dark);}
  .surface-card{background:#fff;border:1px solid var(--ac-light-gray);border-radius:12px;box-shadow:0 2px 6px rgba(13,26,51,.05),0 1px 2px rgba(13,26,51,.05);padding:24px;max-width:720px;}
  .panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;}
  .eyebrow{font-family:'Chivo Mono',monospace;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ac-med-gray);}
  .panel-title{font-size:15px;font-weight:800;margin-top:2px;}
  .chip{border:1px solid var(--ac-light-gray);border-radius:999px;padding:4px 12px;font-family:'Chivo Mono',monospace;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--ac-coral-dark);}
  .card{border:1px solid var(--ac-light-gray);border-radius:12px;background:#fff;overflow:hidden;box-shadow:0 2px 6px rgba(13,26,51,.05);}
  .hdr{display:flex;align-items:center;gap:10px;padding:14px 14px 4px;}
  .avatar{height:36px;width:36px;border-radius:6px;background:var(--ac-coral);color:#fff;font-weight:800;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .botname{font-weight:900;font-size:14px;}
  .appbadge{background:var(--ac-light-gray);color:var(--ac-dark-secondary);font-family:'Chivo Mono',monospace;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px;margin-left:6px;}
  .time{margin-left:auto;font-family:'Chivo Mono',monospace;font-size:11px;color:var(--ac-med-gray);}
  /* ---- so-body (mirror of index.css) ---- */
  .so-body{padding:6px 14px 14px 60px;font-size:13px;line-height:1.55;color:var(--ac-dark);}
  .so-body p{margin-bottom:4px;}
  .so-body strong{font-weight:700;color:var(--ac-dark);}
  .so-body em{font-style:italic;color:var(--ac-dark-secondary);}
  .so-body ul{margin:0 0 6px;padding-left:18px;list-style:disc;}
  .so-body li{margin:2px 0;line-height:1.5;}
  .so-body hr{border:none;border-top:1px solid var(--ac-light-gray);margin:8px 0;}
  .so-body .slack-money{background:rgba(0,136,89,.12);color:#00734B;padding:1px 6px;border-radius:4px;font-weight:700;font-size:11px;border:1px solid rgba(0,136,89,.28);white-space:nowrap;}
  .so-body .slack-mention{background:rgba(68,124,147,.12);color:var(--ac-coral-dark);padding:1px 3px;border-radius:3px;font-weight:500;}
  .so-body .so-section{margin:12px 0 4px;padding-top:10px;border-top:1px solid var(--ac-light-gray);font-family:'Chivo Mono',monospace;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--ac-dark);}
  .so-body .so-section.so-section--first{margin-top:0;padding-top:0;border-top:none;}
  .so-body .so-callout{margin:4px 0;padding:1px 0 1px 10px;border-left:3px solid #447C93;color:var(--ac-dark-secondary);font-size:12.5px;}
</style></head><body>
  <div class="surface-card">
    <div class="panel-head">
      <div><div class="eyebrow">Sample Output</div><div class="panel-title">Delivery Preview</div></div>
      <div class="chip">${so.mockup || 'slack'}</div>
    </div>
    <div class="card">
      <div class="hdr">
        <div class="avatar">${initial}</div>
        <div style="display:flex;align-items:baseline;flex:1;">
          <span class="botname">${so.bot_name}</span>${so.bot_app ? '<span class="appbadge">APP</span>' : ''}
          <span class="time">7:21 AM</span>
        </div>
      </div>
      <div class="so-body">${briefToHtml(so.content)}</div>
    </div>
  </div>
</body></html>`;

writeFileSync('scratchpad/preview.html', page);
const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: 820, height: 200 }, deviceScaleFactor: 2 });
await pg.goto('file://' + process.cwd() + '/scratchpad/preview.html');
await pg.waitForTimeout(600);
const card = await pg.$('.surface-card');
await card.screenshot({ path: 'scratchpad/preview.png' });
await browser.close();
console.log('wrote scratchpad/preview.png');
