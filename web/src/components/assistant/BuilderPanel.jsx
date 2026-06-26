import { useState } from 'react';
import { Wrench, X } from 'lucide-react';
import { cn } from '../../lib/cn';

const PLATFORMS = {
  workflows: ['n8n', 'n8n-starter', 'Workato', 'Zapier', 'Claude workflow', 'OpenAI workflow', 'Recipe card'],
  skills: ['Claude', 'OpenAI', 'Any MCP assistant'],
};

export function BuilderPanel({ surface, onBuild, onCancel }) {
  const noun = surface === 'skills' ? 'skill' : 'workflow';
  const options = PLATFORMS[surface] || PLATFORMS.workflows;
  const [platform, setPlatform] = useState(options[0]);
  const [goal, setGoal] = useState('');
  const [trigger, setTrigger] = useState('');
  const [output, setOutput] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!goal.trim()) return;
    onBuild({ target: noun, platform, goal: goal.trim(), trigger: trigger.trim(), output: output.trim() });
  }

  const field =
    'w-full rounded-lg border border-ac-light-gray bg-ac-warm-white px-3 py-2 text-[13px] text-ac-dark outline-none transition-colors focus:border-ac-coral focus:bg-ac-cream';

  return (
    <form onSubmit={submit}>
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ac-med-gray">
          <Wrench size={12} /> /// Build a {noun}
        </div>
        <button type="button" onClick={onCancel} className="text-ac-med-gray hover:text-ac-dark">
          <X size={16} />
        </button>
      </div>

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
  );
}
