import type { ReactElement } from "react";
import * as Dialog from "@radix-ui/react-dialog";

export const AppDialogTitle = Dialog.Title;
export const AppDialogDescription = Dialog.Description;

/** The caller owns visibility and presentation; Radix owns modal behaviour. */
export function AppDialog({
  onClose,
  returnFocusTo,
  dismissOnOutside = false,
  overlayClassName,
  children,
}: {
  onClose: () => void;
  returnFocusTo: HTMLButtonElement;
  dismissOnOutside?: boolean;
  overlayClassName: string;
  children: ReactElement;
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClassName}>
          <Dialog.Content
            asChild
            aria-modal="true"
            onPointerDownOutside={(event) => {
              if (!dismissOnOutside) event.preventDefault();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (returnFocusTo.isConnected)
                returnFocusTo.focus({ preventScroll: true });
            }}
          >
            {children}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
