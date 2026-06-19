import { NavLink } from 'react-router-dom';
import { assetUrl, cn } from '../lib/cn';

const NAV = [
  { to: '/', label: 'Library', end: true },
  { to: '/api-docs', label: 'API Docs' },
  { to: '/opp-insights', label: 'Opp Insights Guide' },
  { to: '/skills', label: 'Skills' },
  { to: '/guides', label: 'Setup Guides' },
  { to: '/about', label: 'About' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 flex flex-col gap-3 border-b border-ac-light-gray bg-[#eeeef0] px-5 py-4 shadow-[0_8px_24px_rgba(31,34,48,0.06)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div className="flex items-center gap-4">
        <img src={assetUrl('assets/backstory-logo-lockup.png')} alt="Backstory" className="h-[42px] w-auto object-contain" />
        <div className="hidden h-8 w-px bg-ac-coral/25 sm:block" />
        <div>
          <div className="text-[22px] font-bold leading-none text-ac-dark">Automation Library</div>
          <div className="mt-0.5 text-[13px] text-ac-dark-secondary">
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
                'inline-flex items-center whitespace-nowrap rounded-[10px] px-3.5 py-2 text-sm font-semibold no-underline transition-colors',
                item.primary
                  ? 'bg-ac-coral text-white shadow-[0_10px_20px_rgba(111,158,178,0.2)] hover:bg-ac-coral-dark'
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
