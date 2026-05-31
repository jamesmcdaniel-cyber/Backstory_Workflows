import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const port = 4173;
const baseUrl = `http://127.0.0.1:${port}`;

async function waitForServer(timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/workflows.json`, { cache: 'no-store' });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Timed out waiting for the local preview server.');
}

async function main() {
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: repoRoot,
    stdio: 'ignore',
  });

  let browser;
  try {
    await waitForServer();

    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/#/workflow/04-opportunity-discovery`, { waitUntil: 'networkidle' });

    const publicBadge = await page.locator('.rollout-chip').first().textContent();
    if (!publicBadge || !/public/i.test(publicBadge)) {
      throw new Error('Public workflow detail view did not render a public rollout badge.');
    }

    const workatoHref = await page.locator('#platform-download-04-opportunity-discovery a.btn').first().getAttribute('href');
    if (!workatoHref || !workatoHref.endsWith('.json')) {
      throw new Error('Default public workflow platform did not render a downloadable asset.');
    }

    await page.locator('.platform-pill[data-platform="workato"]').click();
    const workatoPdfHref = await page.locator('#platform-download-04-opportunity-discovery a.btn').first().getAttribute('href');
    if (!workatoPdfHref || !workatoPdfHref.endsWith('workato-guide.pdf')) {
      throw new Error('Workato platform download did not resolve to a PDF.');
    }

    await page.goto(`${baseUrl}/#/workflow/01-sales-digest`, { waitUntil: 'networkidle' });
    const blockerItems = await page.locator('.rollout-blocker-list li').count();
    if (blockerItems < 1) {
      throw new Error('Legacy workflow detail view did not render rollout blockers.');
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          publicBadge,
          workatoPdfHref,
          legacyBlockers: blockerItems,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser?.close();
    server.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
