import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const logoSvg = fs.readFileSync(path.join(repoRoot, 'assets', 'backstory-logo.svg'), 'utf8');
const logoDataUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;

marked.setOptions({
  gfm: true,
  breaks: false,
});

function renderGuideHtml({ title, workflowId, platformLabel, markdown }) {
  const normalized = markdown.replace(/^#\s+.+$/m, '').trim();
  const bodyHtml = marked.parse(normalized);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #17252d;
        --muted: #56707a;
        --line: #d9e3df;
        --accent: #c96641;
        --surface: #f6fbf8;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Avenir Next", "Segoe UI", sans-serif;
        color: var(--ink);
        background: #ffffff;
      }
      .page {
        padding: 38px 46px 52px;
      }
      .header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 24px;
        padding-bottom: 18px;
        border-bottom: 1px solid var(--line);
        margin-bottom: 24px;
      }
      .header-copy {
        max-width: 70%;
      }
      .eyebrow {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--accent);
        margin-bottom: 10px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 29px;
        line-height: 1.08;
      }
      .subtitle {
        margin: 0;
        color: var(--muted);
        font-size: 13px;
      }
      .logo {
        width: 180px;
        height: auto;
      }
      .body {
        font-size: 13.5px;
        line-height: 1.6;
      }
      .body h2,
      .body h3,
      .body h4 {
        color: var(--ink);
        margin-top: 1.5em;
        margin-bottom: 0.55em;
        page-break-after: avoid;
      }
      .body h2 {
        font-size: 18px;
        padding-bottom: 6px;
        border-bottom: 1px solid rgba(201, 102, 65, 0.18);
      }
      .body h3 { font-size: 15px; }
      .body p,
      .body ul,
      .body ol,
      .body pre,
      .body table,
      .body blockquote {
        margin-top: 0;
        margin-bottom: 0.95em;
      }
      .body ul,
      .body ol {
        padding-left: 1.35em;
      }
      .body li + li {
        margin-top: 0.28em;
      }
      .body code {
        font-family: "SFMono-Regular", "Menlo", monospace;
        font-size: 0.92em;
        background: rgba(111, 158, 178, 0.12);
        padding: 0.1em 0.35em;
        border-radius: 4px;
      }
      .body pre {
        background: #13252b;
        color: #f1f6f3;
        padding: 14px 16px;
        border-radius: 10px;
        overflow: hidden;
        white-space: pre-wrap;
      }
      .body pre code {
        background: transparent;
        padding: 0;
        color: inherit;
      }
      .body blockquote {
        margin-left: 0;
        padding: 10px 14px;
        border-left: 4px solid rgba(201, 102, 65, 0.35);
        background: var(--surface);
      }
      .footer {
        margin-top: 26px;
        padding-top: 14px;
        border-top: 1px solid var(--line);
        font-size: 11px;
        color: var(--muted);
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      a {
        color: var(--accent);
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="header">
        <div class="header-copy">
          <div class="eyebrow">${platformLabel} guide</div>
          <h1>${title}</h1>
          <p class="subtitle">Workflow ID: ${workflowId} • Backstory public rollout asset</p>
        </div>
        <img class="logo" src="${logoDataUri}" alt="Backstory">
      </header>
      <section class="body">${bodyHtml}</section>
      <footer class="footer">
        <span>Backstory rollout guide PDF</span>
        <span>Generated from Markdown source in this repository</span>
      </footer>
    </main>
  </body>
</html>`;
}

async function renderPdf(browser, workflowDir, workflowId, sourceName, targetName, platformLabel) {
  const sourcePath = path.join(workflowDir, sourceName);
  if (!fs.existsSync(sourcePath)) return null;

  const markdown = fs.readFileSync(sourcePath, 'utf8');
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : `${workflowId} — ${platformLabel}`;
  const html = renderGuideHtml({ title, workflowId, platformLabel, markdown });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });

  const targetPath = path.join(workflowDir, targetName);
  await page.pdf({
    path: targetPath,
    format: 'Letter',
    printBackground: true,
    margin: {
      top: '12mm',
      right: '10mm',
      bottom: '12mm',
      left: '10mm',
    },
  });
  await page.close();
  return targetPath;
}

async function main() {
  const workflowDirs = fs
    .readdirSync(repoRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  let browser;
  try {
    browser = await chromium.launch();
  } catch (error) {
    throw new Error(
      `Playwright Chromium is not installed. Run "npx playwright install chromium" before generating PDFs.\n${error.message}`,
    );
  }

  const generated = [];
  try {
    for (const workflowId of workflowDirs) {
      const workflowDir = path.join(repoRoot, workflowId);
      const workatoPdf = await renderPdf(browser, workflowDir, workflowId, 'workato-guide.md', 'workato-guide.pdf', 'Workato');
      const zapierPdf = await renderPdf(browser, workflowDir, workflowId, 'zapier-guide.md', 'zapier-guide.pdf', 'Zapier');
      if (workatoPdf) generated.push(workatoPdf);
      if (zapierPdf) generated.push(zapierPdf);
    }
  } finally {
    await browser?.close();
  }

  console.log(
    JSON.stringify(
      {
        workflowCount: workflowDirs.length,
        generatedCount: generated.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
