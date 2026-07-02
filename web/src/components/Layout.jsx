import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TooltipProvider } from './ui/Tooltip';
import { Header } from './Header';
import { GlobalAssistant } from './GlobalAssistant';
import { ChatProvider } from '../lib/chatStore';

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <TooltipProvider>
      <ChatProvider>
        <Header />
        <main>
          <Outlet />
        </main>
        <GlobalAssistant />
      </ChatProvider>
    </TooltipProvider>
  );
}
