import { useState } from 'react';
import { Download, Copy, Check, ChevronDown, ChevronRight, FileCode } from 'lucide-react';

const MIME = { json: 'application/json', markdown: 'text/markdown', md: 'text/markdown' };

export function ArtifactCard({ artifact }) {
  const { platform, filename, language, content } = artifact;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function download() {
    const blob = new Blob([content], { type: MIME[language] || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'workflow.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
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
            {platform && <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ac-med-gray">{platform}</div>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-md border border-ac-light-gray px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.06em] text-ac-dark-secondary hover:border-ac-coral">
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
          </button>
          <button type="button" onClick={download} className="inline-flex items-center gap-1 rounded-md bg-ac-coral px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-white shadow-card transition-colors hover:bg-ac-coral-dark">
            <Download size={12} /> Download
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ac-med-gray hover:text-ac-dark"
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />} {open ? 'Hide' : 'Preview'} {language || ''}
      </button>
      {open && (
        <pre className="max-h-72 overflow-auto border-t border-ac-light-gray bg-wf-bg p-3 font-mono text-[11.5px] leading-5 text-wf-text">
          <code>{content}</code>
        </pre>
      )}
    </div>
  );
}
