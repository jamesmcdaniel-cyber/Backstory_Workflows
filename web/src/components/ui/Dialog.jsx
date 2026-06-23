import * as RD from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export const Dialog = RD.Root;
export const DialogTrigger = RD.Trigger;
export const DialogClose = RD.Close;

export function DialogContent({ children, className = '' }) {
  return (
    <RD.Portal>
      <RD.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-overlay-in" />
      <RD.Content
        className={
          'fixed left-1/2 top-1/2 z-50 w-[min(720px,calc(100vw-32px))] max-h-[88vh] -translate-x-1/2 -translate-y-1/2 ' +
          'overflow-y-auto rounded-2xl border border-ac-light-gray bg-ac-card p-7 shadow-menu animate-content-in ' +
          className
        }
      >
        {children}
        <RD.Close
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-ac-med-gray hover:bg-ac-cream hover:text-ac-dark"
          aria-label="Close"
        >
          <X size={18} />
        </RD.Close>
      </RD.Content>
    </RD.Portal>
  );
}
