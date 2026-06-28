import { useState } from 'react';
import { Wrench, X, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { triageNotes } from '../../lib/assistant';

const PLATFORMS = {
  workflows: ['n8n', 'n8n-starter', 'Workato', 'Zapier', 'Claude workflow', 'OpenAI workflow', 'Recipe card'],
  skills: ['Claude', 'OpenAI', 'Any MCP assistant'],
};

const CONFIDENCE_COLORS = {
  high: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10',
  medium: 'text-amber-400 border-amber-400/40 bg-amber-400/10',
  low: 'text-ac-med-gray border-ac-light-gray bg-ac-light-gray/20',
};

function CandidateCard({ candidate, surface, onBuild }) {
  const options = PLATFORMS[surface] || PLATFORMS.workflows;
  const defaultPlatform = options.includes(candidate.suggestedPlatform) ? candidate.suggestedPlatform : options[0];
  const [platform, setPlatform] = useState(defaultPlatform);
  const noun = surface === 'skills' ? 'skill' : 'workflow';

  function handleBuild() {
    onBuild({
      target: noun,
      platform,
      goal: candidate.request,
      trigger: candidate.trigger || '',
      output: candidate.outputs || '',
    });
  }

  return (
    <div className="rounded-lg border border-ac-light-gray bg-ac-warm-white p-3">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="font-mono text-[12px] font-semibold text-ac-dark leading-snug">{candidate.title}</div>
        <span
          className={cn(
            'shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]',
            CONFIDENCE_COLORS[candidate.confidence] || CONFIDENCE_COLORS.low,
          )}
        >
          {candidate.confidence}
        </span>
      </div>
      <p className="mb-2 text-[12px] text-ac-dark-secondary leading-relaxed">{candidate.request}</p>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[10.5px] text-ac-med-gray">
        {candidate.customer && <span>Customer: {candidate.customer}</span>}
        {candidate.assignee && <span>Assignee: {candidate.assignee}</span>}
        {candidate.trigger && <span>Trigger: {candidate.trigger}</span>}
        {candidate.outputs && <span>Output: {candidate.outputs}</span>}
      </div>
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {options.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPlatform(p)}
            className={cn(
              'rounded-lg border px-2 py-0.5 font-mono text-[10.5px] transition-colors',
              p === platform
                ? 'border-ac-coral bg-ac-coral/12 text-ac-coral-dark'
                : 'border-ac-light-gray text-ac-dark-secondary hover:border-ac-coral',
            )}
          >
            {p}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={handleBuild}
        className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-white px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ac-ink hover:bg-ac-cream transition-colors"
      >
        Build this →
      </button>
    </div>
  );
}

export function BuilderPanel({ surface, onBuild, onCancel }) {
  const noun = surface === 'skills' ? 'skill' : 'workflow';
  const options = PLATFORMS[surface] || PLATFORMS.workflows;
  const [mode, setMode] = useState('describe'); // 'describe' | 'notes'

  // Describe mode state
  const [platform, setPlatform] = useState(options[0]);
  const [goal, setGoal] = useState('');
  const [trigger, setTrigger] = useState('');
  const [output, setOutput] = useState('');

  // Notes mode state
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState(null); // null = not yet run
  const [triageError, setTriageError] = useState(null);
  const [othersExpanded, setOthersExpanded] = useState(false);

  function submitDescribe(e) {
    e.preventDefault();
    if (!goal.trim()) return;
    onBuild({ target: noun, platform, goal: goal.trim(), trigger: trigger.trim(), output: output.trim() });
  }

  async function findWorkflows() {
    if (!notes.trim() || loading) return;
    setLoading(true);
    setTriageError(null);
    setCandidates(null);
    try {
      const result = await triageNotes(notes);
      setCandidates(result.candidates || []);
      if (result.error) setTriageError(result.error);
    } catch (err) {
      setTriageError('Could not reach the triage endpoint — check your connection.');
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }

  const field =
    'w-full rounded-lg border border-ac-light-gray bg-ac-warm-white px-3 py-2 text-[13px] text-ac-dark outline-none transition-colors focus:border-ac-coral focus:bg-ac-cream';

  const mineCandidates = candidates ? candidates.filter((c) => c.isMine) : [];
  const othersCandidates = candidates ? candidates.filter((c) => !c.isMine) : [];

  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ac-med-gray">
          <Wrench size={12} /> /// Build a {noun}
        </div>
        <button type="button" onClick={onCancel} className="text-ac-med-gray hover:text-ac-dark">
          <X size={16} />
        </button>
      </div>

      {/* Mode toggle */}
      <div className="mb-4 flex gap-1 rounded-lg border border-ac-light-gray bg-ac-warm-white p-0.5">
        <button
          type="button"
          onClick={() => setMode('describe')}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 font-mono text-[11px] tracking-[0.06em] transition-colors',
            mode === 'describe' ? 'bg-white text-ac-ink shadow-sm' : 'text-ac-med-gray hover:text-ac-dark',
          )}
        >
          Describe
        </button>
        <button
          type="button"
          onClick={() => setMode('notes')}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[11px] tracking-[0.06em] transition-colors',
            mode === 'notes' ? 'bg-white text-ac-ink shadow-sm' : 'text-ac-med-gray hover:text-ac-dark',
          )}
        >
          <FileText size={11} />
          From meeting notes
        </button>
      </div>

      {/* Describe mode */}
      {mode === 'describe' && (
        <form onSubmit={submitDescribe}>
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
          <div className="flex flex-col gap-2">
            <input className={field} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={`What should this ${noun} do?`} />
            <input className={field} value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="Trigger (e.g. every weekday 6 AM, on new deal…) — optional" />
            <input className={field} value={output} onChange={(e) => setOutput(e.target.value)} placeholder="Output / delivery (e.g. Slack message, email…) — optional" />
          </div>
          <button
            type="submit"
            disabled={!goal.trim()}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-ac-ink disabled:opacity-40"
          >
            Draft it
          </button>
        </form>
      )}

      {/* From meeting notes mode */}
      {mode === 'notes' && (
        <div>
          <textarea
            className={cn(field, 'min-h-[120px] resize-y')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={`Paste meeting notes here — the assistant will extract buildable ${noun} requests…`}
          />
          <button
            type="button"
            disabled={!notes.trim() || loading}
            onClick={findWorkflows}
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-ac-ink disabled:opacity-40 transition-opacity"
          >
            {loading ? 'Scanning notes…' : 'Find workflows'}
          </button>

          {/* Granola teaser */}
          <p className="mt-2 text-center font-mono text-[10px] text-ac-med-gray/70">
            Paste notes for now — one-click Granola auto-import is coming.
          </p>

          {triageError && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">
              {triageError}
            </p>
          )}

          {/* Results */}
          {candidates !== null && (
            <div className="mt-4">
              {candidates.length === 0 && !triageError && (
                <p className="text-center font-mono text-[12px] text-ac-med-gray">
                  No buildable workflow requests found in these notes.
                </p>
              )}

              {/* Mine */}
              {mineCandidates.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ac-med-gray">
                    Assigned to you ({mineCandidates.length})
                  </div>
                  {mineCandidates.map((c, i) => (
                    <CandidateCard key={i} candidate={c} surface={surface} onBuild={onBuild} />
                  ))}
                </div>
              )}

              {/* Others */}
              {othersCandidates.length > 0 && (
                <div className={cn('flex flex-col gap-2', mineCandidates.length > 0 && 'mt-4')}>
                  <button
                    type="button"
                    onClick={() => setOthersExpanded((v) => !v)}
                    className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ac-med-gray/60 hover:text-ac-med-gray transition-colors"
                  >
                    {othersExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    Not assigned to you ({othersCandidates.length})
                  </button>
                  {othersExpanded && (
                    <div className="flex flex-col gap-2 opacity-60">
                      {othersCandidates.map((c, i) => (
                        <CandidateCard key={i} candidate={c} surface={surface} onBuild={onBuild} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
