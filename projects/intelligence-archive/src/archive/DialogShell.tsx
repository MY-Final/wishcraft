import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from './useFocusTrap';
import './DialogShell.css';

interface DialogShellProps {
  kicker: string;
  titleId: string;
  onClose: () => void;
  children: ReactNode;
  variant?: 'model' | 'event';
  resetKey?: string;
}

/**
 * 详情浮层外壳：焦点管理（打开聚焦关闭按钮、Tab 循环、Esc 关闭、关闭后焦点回到触发元素）、
 * 背景滚动锁定、点击遮罩关闭。
 */
export function DialogShell({
  kicker,
  titleId,
  onClose,
  children,
  variant = 'model',
  resetKey,
}: DialogShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(panelRef, { onEscape: onClose, initialFocusRef: closeRef });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [resetKey]);

  return createPortal(
    <div className="arch-dialog">
      <div className="arch-dialog__backdrop" aria-hidden="true" onClick={onClose} />
      <div
        className="arch-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-variant={variant}
        ref={panelRef}
        tabIndex={-1}
      >
        <div className="arch-dialog__bar">
          <p className="arch-dialog__kicker u-meta">{kicker}</p>
          <button
            ref={closeRef}
            type="button"
            className="arch-dialog__close"
            onClick={onClose}
            aria-label="关闭详情浮层"
          >
            <span className="u-meta">CLOSE</span>
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div className="arch-dialog__scroll" ref={scrollRef}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
