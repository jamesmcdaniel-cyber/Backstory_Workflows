import React, { useRef, useState } from 'react';
import { FileUp, Wrench, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { readFileToAttachment } from '../../lib/assistant';
import { MAX_ATTACHMENT_COUNT, MAX_ATTACHMENT_TOTAL_BYTES, validateAttachments } from '../../lib/attachmentValidation';

const PLATFORMS = {
  workflows: ['Help me choose', 'n8n', 'Workato', 'Zapier', 'Claude workflow', 'OpenAI workflow'],
  skills: ['Help me choose', 'Claude', 'OpenAI', 'Any MCP assistant'],
};

const FORMAT_NOTE = {
  'Help me choose': 'The plan will recommend the best platform before anything is generated.',
  n8n: 'Produces importable n8n workflow JSON.',
  Workato: 'Produces a build guide, not a package ZIP. Workato ZIPs can only be exported from configured workspace assets.',
  Zapier: 'Produces a Zap editor/template guide, not workflow JSON. Zapier has no general workflow-JSON upload.',
  'Claude workflow': 'Produces portable Claude MCP workflow instructions in Markdown; there is no universal Claude workflow import package.',
  'OpenAI workflow': 'Produces portable OpenAI tool-workflow instructions in Markdown; there is no universal OpenAI workflow import package.',
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
  const [timezone, setTimezone] = useState('');
  const [sourceSystems, setSourceSystems] = useState('');
  const [retryPolicy, setRetryPolicy] = useState('');
  const [deduplication, setDeduplication] = useState('');
  const [platformConstraints, setPlatformConstraints] = useState('');
  const [formatExample, setFormatExample] = useState('');
  const [formatAttachments, setFormatAttachments] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const fileRef = useRef(null);

  async function addFormatExamples(fileList) {
    const files = Array.from(fileList || []);
    const available = Math.max(0, MAX_ATTACHMENT_COUNT - formatAttachments.length);
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
    const combined = [...formatAttachments, ...next];
    const validation = validateAttachments(combined);
    if (!validation.valid) setUploadError(validation.errors.join(' '));
    else setFormatAttachments(validation.attachments);
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
      timezone: timezone.trim(),
      sourceSystems: sourceSystems.trim(),
      retryPolicy: retryPolicy.trim(),
      deduplication: deduplication.trim(),
      platformConstraints: platformConstraints.trim(),
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
        <fieldset>
          <legend className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ac-med-gray">Target platform</legend>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {options.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                aria-pressed={p === platform}
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
        </fieldset>
        <p className="-mt-1 mb-3 text-[11.5px] leading-5 text-ac-med-gray">{FORMAT_NOTE[platform]}</p>
        <div className="flex flex-col gap-2">
          <label htmlFor="builder-goal" className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ac-dark-secondary">Workflow goal <span className="text-ac-coral-dark">— required</span></label>
          <textarea id="builder-goal" rows={2} className={field} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={`What should this ${noun} do?`} />
          <label htmlFor="builder-trigger" className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ac-dark-secondary">Trigger <span className="font-normal text-ac-med-gray">— optional</span></label>
          <input id="builder-trigger" className={field} value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="Every weekday at 6 AM, when a deal changes stage…" />
          <label htmlFor="builder-output" className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ac-dark-secondary">Output and delivery <span className="font-normal text-ac-med-gray">— optional</span></label>
          <input id="builder-output" className={field} value={output} onChange={(e) => setOutput(e.target.value)} placeholder="Slack message, email, CRM update…" />
          <details className="rounded-lg border border-ac-light-gray bg-ac-warm-white p-3">
            <summary className="cursor-pointer font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-ac-dark-secondary">Execution requirements <span className="font-normal text-ac-med-gray">— optional</span></summary>
            <p className="mt-1 text-[11.5px] leading-5 text-ac-med-gray">Add operational constraints now so the generated workflow does not guess.</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label htmlFor="builder-timezone" className="text-[11px] text-ac-dark-secondary">Timezone</label>
              <input id="builder-timezone" className={field} value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="America/Denver" />
              <label htmlFor="builder-sources" className="text-[11px] text-ac-dark-secondary">Source systems and connectors</label>
              <input id="builder-sources" className={field} value={sourceSystems} onChange={(e) => setSourceSystems(e.target.value)} placeholder="Salesforce, Outlook, Slack…" />
              <label htmlFor="builder-retries" className="text-[11px] text-ac-dark-secondary">Failure and retry behavior</label>
              <input id="builder-retries" className={field} value={retryPolicy} onChange={(e) => setRetryPolicy(e.target.value)} placeholder="Retry 3 times, then alert RevOps" />
              <label htmlFor="builder-dedupe" className="text-[11px] text-ac-dark-secondary">Duplicate prevention</label>
              <input id="builder-dedupe" className={field} value={deduplication} onChange={(e) => setDeduplication(e.target.value)} placeholder="One alert per deal per day" />
              <label htmlFor="builder-constraints" className="text-[11px] text-ac-dark-secondary">Platform version, plan, or credential constraints</label>
              <textarea id="builder-constraints" rows={2} className={field} value={platformConstraints} onChange={(e) => setPlatformConstraints(e.target.value)} placeholder="n8n 1.90+, no community nodes…" />
            </div>
          </details>
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
            <p className="mt-1 text-[11.5px] leading-5 text-ac-med-gray">Paste an example output or upload files for the Assistant to match.</p>
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
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.json,.txt,.md,.csv"
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
              disabled={uploading || formatAttachments.length >= MAX_ATTACHMENT_COUNT}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-ac-light-gray bg-white px-2.5 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.05em] text-ac-dark-secondary hover:border-ac-coral hover:text-ac-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileUp size={13} /> {uploading ? 'Attaching…' : 'Upload or drop format examples'}
            </button>
            <span className="ml-2 text-[10.5px] text-ac-med-gray">PDF, JPG, PNG, GIF, WebP, JSON, CSV, TXT, or MD · {MAX_ATTACHMENT_TOTAL_BYTES / 1024 / 1024} MB total</span>
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
