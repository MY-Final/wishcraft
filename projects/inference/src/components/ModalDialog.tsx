import { useEffect, useRef, type ReactNode } from 'react';
import { CloseIcon } from './icons';

interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  variant?: 'drawer' | 'paper' | 'notes' | 'sheet';
  children: ReactNode;
}

export default function ModalDialog({
  open,
  onClose,
  labelledBy,
  variant = 'paper',
  children,
}: ModalDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      className={`dialog dialog--${variant}`}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog__scroll" onClick={(event) => event.stopPropagation()}>
        <button className="dialog__close" type="button" onClick={onClose} autoFocus aria-label="关闭">
          <CloseIcon width="16" height="16" />
          <span className="mono">ESC</span>
        </button>
        {children}
      </div>
    </dialog>
  );
}
