import { cn } from '../../lib/cn';

const variants = {
  primary: 'bg-ac-coral text-ac-ink shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:bg-white/85',
  secondary: 'bg-ac-card text-ac-coral-dark border border-ac-light-gray hover:border-ac-coral',
  ghost: 'bg-transparent text-ac-dark hover:bg-ac-cream hover:text-ac-coral-dark',
  dark: 'bg-wf-surface text-wf-text hover:bg-ac-cream',
};

const sizes = {
  sm: 'px-3 py-1.5 text-[13px] rounded-[10px]',
  md: 'px-5 py-2.5 text-sm rounded-xl',
};

export function Button({ as: As = 'button', variant = 'primary', size = 'md', className, ...props }) {
  return (
    <As
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none no-underline',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
