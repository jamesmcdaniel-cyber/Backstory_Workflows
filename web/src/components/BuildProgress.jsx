import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';
import { PHASES, estimateBuild, formatElapsed, formatRemaining } from '../lib/buildEstimate';

// Ticks once a second while a build runs, so the elapsed time and estimate move.
function useNow(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

const PHASE_TEXT = {
  design: () => 'Designing your plugin: its workflow, settings, file plan and script contracts',
  files: ({ done, total, stalled }) => (stalled ? 'Some files need a retry below' : `Writing ${total} files in parallel · ${done} of ${total} done`),
  tests: ({ done, total }) => `Testing the scripts in Python in your browser · ${done} of ${total} done`,
  ready: () => 'Checking the finished plugin',
};

/** A progress bar with the current phase, elapsed time and a time estimate. */
export function BuildProgress({ plugin = null, fileStatus, timing, className }) {
  const estimate = estimateBuild({ plugin, fileStatus, timing, now: useNow(true) });
  const { phase, elapsed, remaining, stalled } = estimate;
  // The bar only moves forward, even when an estimate grows (a test needs a fix).
  const best = useRef({ startedAt: null, value: 0 });
  if (best.current.startedAt !== timing?.startedAt) best.current = { startedAt: timing?.startedAt, value: 0 };
  const raw = elapsed + remaining > 0 ? elapsed / (elapsed + remaining) : 0;
  best.current.value = Math.min(0.97, Math.max(best.current.value, raw));
  const percent = Math.round(best.current.value * 100);
  const current = PHASES.findIndex((item) => item.id === phase);

  return (
    <div className={cn('rounded-lg border border-ac-light-gray bg-white p-4', className)} role="status" aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="flex items-center gap-2 text-[14px] font-medium text-ac-dark">
          <Loader2 size={15} className={cn('shrink-0 text-ac-coral', !stalled && 'animate-spin')} aria-hidden="true" />
          {PHASE_TEXT[phase](estimate)}
        </p>
        <p className="font-mono text-[12px] tabular-nums text-ac-dark-secondary">
          {stalled ? 'Paused' : formatRemaining(remaining)} · {formatElapsed(elapsed)} elapsed
        </p>
      </div>
      <div
        className="relative mt-3 h-2 overflow-hidden rounded-full bg-ac-cream"
        role="progressbar"
        aria-label="Plugin build progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="relative h-full overflow-hidden rounded-full bg-ac-coral transition-[width] duration-1000 ease-linear" style={{ width: `${Math.max(percent, 3)}%` }}>
          {!stalled && <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent motion-reduce:hidden" />}
        </div>
      </div>
      <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.08em]">
        {PHASES.map((item, index) => (
          <li key={item.id} className={cn('flex items-center gap-1.5', index < current ? 'text-ac-success' : index === current ? 'text-ac-coral-dark' : 'text-ac-med-gray')}>
            {index < current ? <Check size={12} aria-hidden="true" /> : <span className={cn('h-1.5 w-1.5 rounded-full', index === current ? 'bg-ac-coral' : 'bg-ac-light-gray')} />}
            {item.label}
          </li>
        ))}
      </ol>
      {phase === 'design' && (
        <p className="mt-3 text-[12.5px] leading-5 text-ac-med-gray">Most plugins are ready in five to seven minutes. You can leave this tab open and come back; the build keeps going.</p>
      )}
    </div>
  );
}
