import * as RTabs from '@radix-ui/react-tabs';
import { cn } from '../../lib/cn';

export function Tabs({ tabs, defaultValue, className }) {
  return (
    <RTabs.Root defaultValue={defaultValue || tabs[0]?.value} className={className}>
      <RTabs.List className="mb-5 flex flex-wrap gap-1 border-b border-ac-light-gray">
        {tabs.map((t) => (
          <RTabs.Trigger
            key={t.value}
            value={t.value}
            className={cn(
              'cursor-pointer px-4 py-2.5 font-mono text-[12.5px] font-medium uppercase tracking-[0.06em] text-ac-dark-secondary transition-colors',
              '-mb-px border-b-2 border-transparent hover:text-ac-coral-dark',
              'data-[state=active]:border-ac-coral data-[state=active]:text-ac-coral-dark',
            )}
          >
            {t.label}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {tabs.map((t) => (
        <RTabs.Content key={t.value} value={t.value} className="outline-none animate-fade-in">
          {t.content}
        </RTabs.Content>
      ))}
    </RTabs.Root>
  );
}
