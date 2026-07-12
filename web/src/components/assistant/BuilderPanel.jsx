import React, { useRef, useState } from 'react';
import { FileUp, Wrench, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { readFileToAttachment } from '../../lib/assistant';

const PLATFORMS = {
  workflows: ['Help me choose', 'n8n', 'Workato', 'Zapier', 'Claude workflow', 'OpenAI workflow'],
  skills: ['Help me choose', 'Claude', 'OpenAI', 'Any MCP assistant'],
};

const FORMAT_NOTE = {
  'Help me choose': 'The plan will recommend the best platform before anything is generated.',
  n8n: 'Produces importable n8n workflow JSON.',
  Workato: 'Produces a native implementation guide; Workato creates package ZIPs from real workspace exports.',
  Zapier: 'Produces an editor/template implementation guide; Zapier has no general workflow-JSON upload.',
  'Claude workflow': 'Produces Claude orchestrator instructions in Markdown.',
  'OpenAI workflow': 'Produces OpenAI orchestrator instructions in Markdown.',
  Claude: 'Produces Claude instructions in Markdown.',
  OpenAI: 'Produces OpenAI instructions in Markdown.',
  'Any MCP assistant': 'Produces portable MCP-assistant instructions in Markdown.',
};

function formatBytes(value) {
  if (!Number.isFinite(value) || value <= 0) return '';
  return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function FormatAttachmentPreview({ attachment }) {
  const isImage = attachment.kind === 'image';
  const isPdf = attachment.kind === 'document';
  return (
    <details className="mt-1 w-full rounded-md bg-ac-cream px-2 py-1.5 text-[11px] text-ac-dark-secondary">
      <summary className="cursor-pointer font-mono uppercase tracking-[0.04em]">Preview · {attachment.mediaType || 'file'} {formatBytes(attachment.size)}</summary>
      {isImage ? (
        <img src={`data:${attachment.mediaType};base64,${attachment.data}`} alt={`Preview of ${attachment.name}`} className="mt-2 max-h-44 max-w-full rounded border border-ac-light-gray object-contain" />
      ) : isPdf ? (
        <object data={`data:${attachment.mediaType || 'application/pdf'};base64,${attachment.data}`} type="application/pdf" className="mt-2 h-44 w-full rounded border border-ac-light-gray">
          <p>PDF preview is unavailable in this browser.</p>
        </object>
      ) : (
        <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-2 font-mono text-[10.5px] leading-4">{String(attachment.data || '').slice(0, 2000)}</pre>
      )}
    </details>
  );
}

export function BuilderPanel({ surface, onBuild, onCancel }) {
  const noun = surface === 'skills' ? 'skill' : 'workflow';
  const options = PLATFORMS[surface] || PLATFORMS.workflows;
  const [platform, setPlatform] = useState(options[0]);
  const [goal, setGoal] = useState('');
  const [trigger, setTrigger] = useState('');
  const [output, setOutput] = useState('');
  const [formatExample, setFormatExample] = useState('');
  const [formatAttachments, setFormatAttachments] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const fileRef = useRef(null);

  async function addFormatExamples(fileList) {
    const files = Array.from(fileList || []);
    const available = Math.max(0, 4 - formatAttachments.length);
    setUploadError('');
    if (!available) {
      setUploadError('You can attach up to four format examples.');
      return;
    }
    if (files.length > available) setUploadError(`Only the first ${available} file${available === 1 ? '' : 's'} will be attached.`);
    setUploading(true);
    setPrivacyAccepted(false);
    const next = [];
    for (const file of files.slice(0, available)) {
      try {
        next.push(await readFileToAttachment(file));
      } catch (error) {
        setUploadError(error?.message || `Could not attach ${file.name}.`);
      }
    }
    setFormatAttachments((current) => [...current, ...next]);
    setUploading(false);
  }

  function submit(e) {
    e.preventDefault();
    if (!goal.trim() || uploading || (formatAttachments.length > 0 && !privacyAccepted)) return;
    onBuild({
      target: noun,
      platform,
      goal: goal.trim(),
      trigger: trigger.trim(),
      output: output.trim(),
      formatExample: formatExample.trim(),
      formatExamples: formatAttachments.map((attachment) => attachment.name),
    }, formatAttachments);
  }

  const field =
    'w-full rounded-lg border border-ac-light-gray bg-ac-warm-white px-3 py-2 text-[13px] text-ac-dark outline-none transition-colors focus:border-ac-coral focus:bg-ac-cream';

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ac-med-gray">
          <Wrench size={12} /> <span aria-hidden className="text-ac-coral">///</span> Build a {noun}
        </div>
        <button type="button" onClick={onCancel} aria-label={`Close ${noun} builder`} className="text-ac-med-gray hover:text-ac-dark">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={submit}>
        <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ac-med-gray">Target platform</div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {options.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={cn(
                'rounded-lg border px-2.5 py-1 font-mono text-[11px] transition-colors',
                p === platform
                  ? 'border-ac-coral bg-ac-coral/12 text-ac-coral-dark'
                  : 'border-ac-light-gray text-ac-dark-secondary hover:border-ac-coral',
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <p className="-mt-1 mb-3 text-[11.5px] leading-5 text-ac-med-gray">{FORMAT_NOTE[platform]}</p>
        <div className="flex flex-col gap-2">
          <input className={field} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={`What should this ${noun} do?`} />
          <input className={field} value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="Trigger (e.g. every weekday 6 AM, on new deal…) — optional" />
          <input className={field} value={output} onChange={(e) => setOutput(e.target.value)} placeholder="Output / delivery (e.g. Slack message, email…) — optional" />
          <div
            className={cn('rounded-lg border bg-ac-warm-white p-3 focus-within:border-ac-coral focus-within:bg-ac-cream', dragging ? 'border-ac-coral bg-ac-cream' : 'border-ac-light-gray')}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFormatExamples(event.dataTransfer.files);
            }}
          >
            <label htmlFor="builder-format-example" className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-ac-dark-secondary">
              Format example <span className="font-normal text-ac-med-gray">— optional</span>
            </label>
            <p className="mt-1 text-[11.5px] leading-5 text-ac-med-gray">Paste an example output or upload files for the Librarian to match.</p>
            <textarea
              id="builder-format-example"
              rows={3}
              value={formatExample}
              onChange={(e) => setFormatExample(e.target.value)}
              placeholder="Paste an example response, report, message, or schema…"
              className="mt-2 w-full resize-y rounded-md border border-ac-light-gray bg-white px-3 py-2 text-[13px] text-ac-dark outline-none focus:border-ac-coral"
            />
            {formatAttachments.length > 0 && (
              <div className="mt-2 flex flex-col gap-1.5">
                {formatAttachments.map((attachment, index) => (
                  <div key={`${attachment.name}-${index}`} className="rounded-md border border-ac-light-gray bg-white px-2 py-1">
                    <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-ac-dark-secondary">
                      <span className="min-w-0 truncate">{attachment.name}</span>
                      <button
                        type="button"
                        onClick={() => setFormatAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        aria-label={`Remove format example ${attachment.name}`}
                        className="shrink-0 text-ac-med-gray hover:text-ac-dark"
                      >
                        <X size={11} />
                      </button>
                    </div>
                    <FormatAttachmentPreview attachment={attachment} />
                  </div>
                ))}
              </div>
            )}
            {uploadError && <p className="mt-2 text-[11px] text-ac-coral-dark">{uploadError}</p>}
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.json,.txt,.md,.csv"
              className="hidden"
              aria-label="Choose format example files"
              onChange={(e) => {
                addFormatExamples(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || formatAttachments.length >= 4}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-ac-light-gray bg-white px-2.5 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.05em] text-ac-dark-secondary hover:border-ac-coral hover:text-ac-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileUp size={13} /> {uploading ? 'Attaching…' : 'Upload or drop format examples'}
            </button>
            <span className="ml-2 text-[10.5px] text-ac-med-gray">PDF, image, JSON, CSV, TXT, or MD · 3 MB each</span>
            {formatAttachments.length > 0 && (
              <label className="mt-3 flex items-start gap-2 text-[11px] leading-4 text-ac-dark-secondary">
                <input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} className="mt-0.5 accent-ac-coral" />
                <span>I removed secrets and unnecessary customer data. These files will be sent to the configured AI provider for this build.</span>
              </label>
            )}
          </div>
        </div>
        <button
          type="submit"
          disabled={!goal.trim() || uploading || (formatAttachments.length > 0 && !privacyAccepted)}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-ac-coral px-3 py-2 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-ac-coral-dark disabled:opacity-40"
        >
          Review plan
        </button>
      </form>
    </div>
  );
}
