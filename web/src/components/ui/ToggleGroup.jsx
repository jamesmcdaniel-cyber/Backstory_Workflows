import * as RTG from '@radix-ui/react-toggle-group';
import { cn } from '../../lib/cn';

// Single-select toggle group used for category filters.
export function ToggleGroup({ value, onValueChange, items }) {
  return (
    <RTG.Root
      type="single"
      value={value}
      onValueChange={(v) => onValueChange(v || 'all')}
      className="flex flex-wrap items-center gap-2"
    >
      {items.map((it) => (
        <RTG.Item
          key={it.value}
          value={it.value}
          className={cn(
            'rounded-full border px-3.5 py-1.5 font-mono text-[12px] font-medium transition-colors cursor-pointer',
            'border-ac-light-gray bg-ac-card text-ac-dark-secondary hover:border-ac-coral hover:text-ac-coral-dark',
            'data-[state=on]:border-ac-coral data-[state=on]:bg-ac-coral data-[state=on]:text-ac-ink',
          )}
        >
          {it.label}
        </RTG.Item>
      ))}
    </RTG.Root>
  );
}
