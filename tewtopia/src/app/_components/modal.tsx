'use client';

import { useEffect, useRef } from 'react';

type ModalProps = {
  // id of the element that names the dialog (for screen readers)
  labelledBy: string;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Native <dialog> shell: Esc, focus trapping and the backdrop come from the browser.
 * Closes on ✕, Esc, or a click on the backdrop.
 */
export function Modal({ labelledBy, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      onClose={onClose}
      // The dialog element itself only receives clicks outside the inner panel (the backdrop).
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-[1.75rem] bg-white p-0 text-ink shadow-[0_24px_60px_rgba(46,36,51,0.25)] backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-7">
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="-mr-2 -mt-2 flex h-9 w-9 items-center justify-center rounded-full text-xl text-muted outline-none hover:bg-cream hover:text-ink focus-visible:ring-2 focus-visible:ring-primary"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
