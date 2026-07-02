// web/src/components/HamburgerMenu.jsx
// All navigation lives here now — a right-side sheet at every viewport size.
// Radix Dialog supplies focus trap, Escape-to-close, and overlay dismissal.
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import * as RD from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import { cn } from '../lib/cn';

const ITEMS = [
  { to: '/', label: 'Assistant' },
  { to: '/library', label: 'Browse the library' },
  { to: '/flows', label: 'Auto flows' },
  { to: '/signals', label: 'Signals' },
  { to: '/mcp', label: 'MCP Capabilities' },
  { to: '/api-docs', label: 'API Docs' },
  { to: '/guides', label: 'Setup Guides' },
  { to: '/about', label: 'About' },
];

export function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // Close when navigation happens (NavLink click changes the route).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <RD.Root open={open} onOpenChange={setOpen}>
      <RD.Trigger
        className="grid h-10 w-10 place-items-center rounded-[10px] text-ac-dark transition-colors hover:bg-ac-cream"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </RD.Trigger>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-overlay-in" />
        <RD.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-ac-light-gray bg-ac-ink p-6 shadow-menu animate-fade-in sm:w-[320px]"
        >
          <div className="flex items-center justify-between">
            <RD.Title className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ac-med-gray">
              /// Menu
            </RD.Title>
            <RD.Close
              className="grid h-9 w-9 place-items-center rounded-lg text-ac-med-gray transition-colors hover:bg-ac-cream hover:text-ac-dark"
              aria-label="Close menu"
            >
              <X size={18} />
            </RD.Close>
          </div>
          <nav aria-label="Primary" className="mt-6 flex flex-col gap-1">
            {ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-[10px] px-3 py-2.5 font-mono text-[13px] font-medium no-underline transition-colors',
                    isActive ? 'bg-ac-coral/15 text-ac-coral-dark' : 'text-ac-dark hover:bg-ac-cream hover:text-ac-coral-dark',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
