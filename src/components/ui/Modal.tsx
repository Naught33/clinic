import type { MouseEvent, ReactNode } from "react";
import { Card } from "./Card";
import { Icon } from "./Icon";

interface ModalProps {
  title?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export function Modal({ title, onClose, children, wide }: ModalProps) {
  function handleOverlayMouseDown(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="overlay" onMouseDown={handleOverlayMouseDown}>
      <Card
        className={`modal${wide ? " modal--wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal__head">
          {title && <h3 className="modal__title">{title}</h3>}
          <button type="button" onClick={onClose} aria-label="Close" className="modal__close">
            <Icon name="x" size={16} />
          </button>
        </div>
        {children}
      </Card>
    </div>
  );
}