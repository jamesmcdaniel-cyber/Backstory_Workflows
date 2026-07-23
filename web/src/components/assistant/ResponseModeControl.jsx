const MODES = [
  { id: 'brief', label: 'Brief' },
  { id: 'guided', label: 'Guided' },
  { id: 'technical', label: 'Technical' },
];

export function ResponseModeControl({ value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-ac-light-gray p-0.5" role="group" aria-label="Assistant response detail">
      {MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          onClick={() => onChange(mode.id)}
          aria-pressed={value === mode.id}
          className={`rounded-md px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.04em] ${value === mode.id ? 'bg-white text-ac-ink' : 'text-ac-med-gray hover:text-ac-dark'}`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
