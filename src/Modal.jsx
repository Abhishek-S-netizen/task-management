import { useEffect } from 'react';

export default function Modal({ modal, onClose }) {
  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal, onClose]);

  if (!modal) return null;

  const isConfirm = Boolean(modal.onConfirm);

  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
        {modal.title && <h2 className="modal-title">{modal.title}</h2>}
        <p className="modal-message">{modal.message}</p>

        <div className="modal-actions">
          {isConfirm ? (
            <>
              <button type="button" className="btn" onClick={onClose}>
                {modal.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                className={`btn ${modal.danger ? 'danger-solid' : 'primary'}`}
                autoFocus
                onClick={() => {
                  modal.onConfirm();
                  onClose();
                }}
              >
                {modal.confirmText || 'Confirm'}
              </button>
            </>
          ) : (
            <button type="button" className="btn primary" autoFocus onClick={onClose}>
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
