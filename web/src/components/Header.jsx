import { NavLink } from 'react-router-dom';
import { assetUrl, cn } from '../lib/cn';

const NAV = [
  { to: '/', label: 'Library', end: true },
  { to: '/skills', label: 'Skills' },
  { to: '/api-docs', label: 'API Docs' },
  { to: '/opp-insights', label: 'Opp Insights Guide' },
  { to: '/guides', label: 'Setup Guides' },
  { to: '/about', label: 'About' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 flex flex-col gap-3 border-b border-ac-light-gray bg-ac-ink/95 px-5 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div className="flex items-center gap-4">
        <img
          src={assetUrl('assets/backstory-logo-lockup-white.png')}
          alt="Backstory"
          className="h-[42px] w-auto object-contain"
        />
        <div className="hidden h-8 w-px bg-ac-coral/25 sm:block" />
        <div>
          <div className="font-display text-[18px] font-bold leading-none tracking-[-0.01em] text-ac-dark">Automation Library</div>
          <div className="mt-1 text-[13px] text-ac-dark-secondary">
            Ready-to-import workflow automations powered by Backstory
          </div>
        </div>
      </div>
      <nav aria-label="Primary" className="flex flex-wrap items-center gap-1 sm:justify-end">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'inline-flex items-center whitespace-nowrap rounded-[10px] px-3 py-2 font-mono text-[12.5px] font-medium no-underline transition-colors',
                item.primary
                  ? 'bg-ac-coral text-ac-ink shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:bg-white/85'
                  : isActive
                    ? 'bg-ac-coral/15 text-ac-coral-dark'
                    : 'text-ac-dark hover:bg-ac-cream hover:text-ac-coral-dark',
                item.primary && isActive && 'bg-ac-coral-dark',
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
