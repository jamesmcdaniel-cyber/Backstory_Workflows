import { createHash } from 'node:crypto';
import { validateArtifact } from '../src/lib/artifactValidation.js';

function artifactHash(artifact) {
  return createHash('sha256').update(JSON.stringify(artifact)).digest('hex');
}

export async function verifyArtifactWithRunner(artifact, { env = process.env, fetchImpl = fetch } = {}) {
  const preflight = validateArtifact(artifact);
  if (!preflight.valid) {
    return { ...preflight, preflightValid: false, verified: false };
  }

  const verifierUrl = env.WORKFLOW_VERIFIER_URL;
  if (!verifierUrl) {
    return {
      ...preflight,
      valid: false,
      preflightValid: true,
      verified: false,
      status: 'verification_required',
      verification: { status: 'unavailable' },
      warnings: [...preflight.warnings, 'Execution verification is not configured. Download remains locked until a sandbox runner verifies the representative test.'],
    };
  }

  const hash = artifactHash(artifact);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetchImpl(verifierUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.WORKFLOW_VERIFIER_TOKEN ? { Authorization: `Bearer ${env.WORKFLOW_VERIFIER_TOKEN}` } : {}),
      },
      body: JSON.stringify({ artifact, artifactHash: hash, testPlan: artifact.testPlan }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Runner returned ${response.status}.`);
    const result = await response.json();
    const receiptValid = result?.verified === true &&
      result?.testPlanPassed === true &&
      typeof result?.receipt === 'string' && result.receipt.length >= 8 &&
      result?.artifactHash === hash &&
      result?.platform === preflight.platform &&
      !Number.isNaN(Date.parse(result?.executedAt));
    if (!receiptValid) throw new Error('Runner did not return a complete verification receipt for this artifact and test plan.');
    return {
      ...preflight,
      valid: true,
      preflightValid: true,
      verified: true,
      status: 'verified',
      checks: [
        ...preflight.checks,
        { name: 'Sandbox execution', passed: true, detail: result.summary || 'Representative test passed in the configured platform runner.' },
      ],
      verification: {
        status: 'verified',
        receipt: result.receipt,
        executedAt: result.executedAt,
        artifactHash: hash,
        platform: result.platform,
      },
    };
  } catch (error) {
    return {
      ...preflight,
      valid: false,
      preflightValid: true,
      verified: false,
      status: 'verification_failed',
      errors: [...preflight.errors, `Execution verification failed: ${error?.message || 'Unknown runner error'}`],
      checks: [...preflight.checks, { name: 'Sandbox execution', passed: false, detail: error?.message || 'Runner error.' }],
      verification: { status: 'failed' },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const artifact = req.body?.artifact;
  if (!artifact || typeof artifact.content !== 'string' || artifact.content.length > 750_000) {
    return res.status(400).json({ error: 'Invalid artifact' });
  }
  return res.status(200).json(await verifyArtifactWithRunner(artifact));
}
