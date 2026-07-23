import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

// Compact filter dropdown for the catalogue pages. A styled native <select> so
// it stays keyboard- and screen-reader-friendly with no extra dependency.
export function Dropdown({ label, value, onChange, options, className }) {
  return (
    <label className={cn('flex items-center gap-2', className)}>
      {label && (
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ac-med-gray">{label}</span>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="cursor-pointer appearance-none rounded-full border border-ac-light-gray bg-ac-card py-1.5 pl-3.5 pr-8 font-mono text-[12px] font-medium text-ac-dark-secondary outline-none transition-colors hover:border-ac-coral focus:border-ac-coral focus:text-ac-dark"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="font-sans text-ac-dark">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ac-med-gray"
        />
      </div>
    </label>
  );
}
