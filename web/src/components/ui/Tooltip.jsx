import * as RT from '@radix-ui/react-tooltip';

export function TooltipProvider({ children }) {
  return <RT.Provider delayDuration={250}>{children}</RT.Provider>;
}

export function Tooltip({ content, children, side = 'top' }) {
  return (
    <RT.Root>
      <RT.Trigger asChild>{children}</RT.Trigger>
      <RT.Portal>
        <RT.Content
          side={side}
          sideOffset={6}
          className="z-50 rounded-lg border border-ac-light-gray bg-ac-ink px-2.5 py-1.5 text-xs font-medium text-ac-dark shadow-menu animate-fade-in"
        >
          {content}
          <RT.Arrow className="fill-ac-ink" />
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  );
}
