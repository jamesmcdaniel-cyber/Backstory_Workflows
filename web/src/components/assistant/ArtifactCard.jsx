import { useEffect, useState } from 'react';
import { Download, Copy, Check, ChevronDown, ChevronRight, FileCode, ShieldCheck, Loader2, XCircle } from 'lucide-react';
import { platformDeliverable, validateArtifact } from '../../lib/artifactValidation';
import { recordAssistantEvent } from '../../lib/assistant';

const MIME = { json: 'application/json', markdown: 'text/markdown', md: 'text/markdown' };

export function ArtifactCard({ artifact }) {
  const { platform, filename, language, content } = artifact;
  const deliverable = platformDeliverable(platform);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setHealth(null);
  }, [platform, filename, language, content]);

  async function runHealthCheck() {
    setChecking(true);
    recordAssistantEvent('health_check_started', { platform: platform || 'unknown' });
    const local = validateArtifact(artifact);
    if (!local.valid) {
      setHealth(local);
      recordAssistantEvent('health_check_result', { platform: platform || 'unknown', valid: false, errorCount: local.errors.length, warningCount: local.warnings.length });
      setChecking(false);
      return;
    }
    try {
      const response = await fetch('/api/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifact }),
      });
      if (!response.ok) throw new Error('Health-check service unavailable.');
      const result = await response.json();
      setHealth(result);
      recordAssistantEvent('health_check_result', { platform: platform || 'unknown', valid: !!result.valid, errorCount: result.errors?.length || 0, warningCount: result.warnings?.length || 0 });
    } catch (error) {
      setHealth({ valid: false, status: 'failed', errors: [error.message], warnings: [], checks: [] });
      recordAssistantEvent('health_check_result', { platform: platform || 'unknown', valid: false, serviceError: true });
    } finally {
      setChecking(false);
    }
  }

  function download() {
    if (!health?.verified) return;
    const blob = new Blob([content], { type: MIME[language] || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'workflow.txt';
    document.body.appendChild(a);
    a.click();
    recordAssistantEvent('artifact_download', { platform: platform || 'unknown', healthStatus: health.status || 'passed' });
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    if (!health?.verified) return;
    try {
      await navigator.clipboard.writeText(content);
      recordAssistantEvent('artifact_copy', { platform: platform || 'unknown', healthStatus: health.status || 'passed' });
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-ac-light-gray bg-ac-warm-white">
      <div className="flex items-center justify-between gap-3 border-b border-ac-light-gray px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <FileCode size={15} className="shrink-0 text-ac-med-gray" />
          <div className="min-w-0">
            <div className="truncate font-mono text-[12.5px] text-ac-dark">{filename}</div>
            {deliverable && <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ac-med-gray">{deliverable.label}</div>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={copy} disabled={!health?.verified} title={health?.verified ? 'Copy verified artifact' : 'Pass sandbox execution verification first'} className="inline-flex items-center gap-1 rounded-md border border-ac-light-gray px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.06em] text-ac-dark-secondary hover:border-ac-coral disabled:cursor-not-allowed disabled:opacity-40">
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
          </button>
          <button type="button" onClick={download} disabled={!health?.verified} title={health?.verified ? 'Download verified artifact' : 'Pass sandbox execution verification first'} className="inline-flex items-center gap-1 rounded-md bg-ac-coral px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-white shadow-card transition-colors hover:bg-ac-coral-dark disabled:cursor-not-allowed disabled:opacity-40">
            <Download size={12} /> Download
          </button>
        </div>
      </div>

      {deliverable && (
        <div className="border-b border-ac-light-gray bg-ac-cream/70 px-3.5 py-2 text-[11px] leading-4 text-ac-dark-secondary">
          <strong className="text-ac-dark">{deliverable.nativeImport ? 'Native import artifact.' : 'Implementation deliverable.'}</strong> {deliverable.disclosure}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ac-med-gray hover:text-ac-dark"
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />} {open ? 'Hide' : 'Preview'} {language || ''}
      </button>
      <div className="border-t border-ac-light-gray px-3.5 py-2.5 text-[11.5px]">
        <div className="flex items-center justify-between gap-3">
          <span className={health?.verified ? 'text-ac-success' : health?.status === 'verification_required' ? 'text-ac-warning' : health ? 'text-ac-coral-dark' : 'text-ac-med-gray'}>
            {checking ? <><Loader2 size={12} className="mr-1 inline animate-spin" />Running preflight and sandbox test…</>
              : health?.verified ? <><ShieldCheck size={12} className="mr-1 inline" />Sandbox execution verified</>
                : health?.status === 'verification_required' ? <><XCircle size={12} className="mr-1 inline" />Preflight passed; execution verification unavailable</>
                  : health ? <><XCircle size={12} className="mr-1 inline" />{health.preflightValid ? 'Sandbox execution failed' : 'Static preflight failed'}</>
                    : 'Static preflight and sandbox execution required before download'}
          </span>
          <button type="button" onClick={runHealthCheck} disabled={checking} className="rounded-md border border-ac-light-gray px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.05em] text-ac-dark-secondary disabled:opacity-40">
            {health ? 'Run again' : 'Verify workflow'}
          </button>
        </div>
        {health?.checks?.length > 0 && (
          <ul className="mt-2 space-y-1 text-ac-dark-secondary">
            {health.checks.map((item) => <li key={item.name}>{item.passed ? '✓' : '×'} {item.name}: {item.detail}</li>)}
          </ul>
        )}
        {health?.errors?.length > 0 && <p className="mt-2 text-ac-coral-dark">{health.errors.join(' ')}</p>}
        {health?.warnings?.length > 0 && <p className="mt-1 text-ac-med-gray">Setup required: {health.warnings.join(' ')}</p>}
        {health?.verification?.receipt && <p className="mt-1 break-all font-mono text-[10px] text-ac-med-gray">Verification receipt: {health.verification.receipt}</p>}
      </div>
      {open && (
        <pre className="max-h-72 overflow-auto border-t border-ac-light-gray bg-wf-bg p-3 font-mono text-[11.5px] leading-5 text-wf-text">
          <code>{content}</code>
        </pre>
      )}
      {artifact.testPlan && (
        <details className="border-t border-ac-light-gray px-3.5 py-2.5 text-[11.5px] text-ac-dark-secondary">
          <summary className="cursor-pointer font-mono uppercase tracking-[0.06em] text-ac-med-gray">Representative test scenario</summary>
          <p className="mt-2"><strong>Sample input:</strong> {artifact.testPlan.sampleInput}</p>
          <p className="mt-1"><strong>Expected outcome:</strong> {artifact.testPlan.expectedOutcome}</p>
          <ol className="mt-1 list-decimal pl-5">{artifact.testPlan.steps?.map((step) => <li key={step}>{step}</li>)}</ol>
        </details>
      )}
    </div>
  );
}
