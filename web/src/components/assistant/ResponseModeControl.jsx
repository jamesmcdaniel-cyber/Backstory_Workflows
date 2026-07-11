import React from 'react';

export const RESPONSE_MODES = [
  { id: 'brief', label: 'Brief', description: 'Short, direct answer' },
  { id: 'guided', label: 'Guided', description: 'Answer plus next decision' },
  { id: 'technical', label: 'Technical', description: 'More implementation detail' },
];

export function ResponseModeControl({ value, onChange }) {
  const selected = RESPONSE_MODES.find((mode) => mode.id === value) || RESPONSE_MODES[0];

  return (
    <div className="w-full">
      <div className="mb-1.5 flex min-h-4 items-baseline justify-between gap-3">
        <span id="response-detail-label" className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-ac-dark-secondary">
          Response detail
        </span>
        <span className="truncate text-[10.5px] text-ac-med-gray" aria-live="polite">
          {selected.description}
        </span>
      </div>
      <div
        className="grid w-full grid-cols-3 rounded-lg border border-ac-light-gray bg-ac-warm-white p-0.5"
        role="group"
        aria-labelledby="response-detail-label"
      >
        {RESPONSE_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            aria-label={`${mode.label}: ${mode.description}`}
            aria-pressed={value === mode.id}
            className={`min-w-0 rounded-md px-2 py-1.5 text-center font-mono text-[9.5px] uppercase tracking-[0.04em] transition-colors ${value === mode.id ? 'bg-white text-ac-ink shadow-sm' : 'text-ac-med-gray hover:bg-white/60 hover:text-ac-dark'}`}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}
