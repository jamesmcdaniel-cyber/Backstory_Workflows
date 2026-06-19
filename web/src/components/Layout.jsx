import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TooltipProvider } from './ui/Tooltip';
import { Header } from './Header';

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <TooltipProvider>
      <Header />
      <main>
        <Outlet />
      </main>
    </TooltipProvider>
  );
}
