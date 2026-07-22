// web/src/components/Header.jsx
import { Link } from 'react-router-dom';
import { assetUrl } from '../lib/cn';
import { HamburgerMenu } from './HamburgerMenu';

export function Header() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ac-light-gray bg-ac-ink/95 px-5 py-4 shadow-card sm:px-8">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex-shrink-0">
          <img
            src={assetUrl('assets/backstory-logo-lockup-dark.png')}
            alt="Backstory"
            className="h-7 w-auto"
          />
        </Link>
        <div className="hidden h-8 w-px bg-ac-coral/25 sm:block" />
        <div className="hidden text-[13px] text-ac-dark-secondary sm:block">
          Automations, signals &amp; MCP capabilities powered by Backstory
        </div>
      </div>
      <HamburgerMenu />
    </header>
  );
}
