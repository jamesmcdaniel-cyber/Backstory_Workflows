import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '../../lib/cn';

export function CopyButton({ text, label = 'Copy', className }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(text || '').then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        });
      }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-ac-light-gray bg-white px-2.5 py-1 text-[11px] font-semibold text-ac-dark-secondary transition-colors hover:bg-ac-cream hover:text-ac-dark',
        className,
      )}
    >
      {done ? <Check size={12} /> : <Copy size={12} />}
      {done ? 'Copied' : label}
    </button>
  );
}
