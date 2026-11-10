import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from './store.jsx';

/* ---------- Toast ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  const show = useCallback((msg, type = 'ok') => {
    setToast({ msg, type, k: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2200);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div className={`toast ${toast.type}`} key={toast.k} role="status">
          {toast.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}
    </ToastCtx.Provider>
  );
}

/* ---------- Bottom-sheet modal ---------- */
export function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="close">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Field = ({ label, hint, children }) => (
  <label className="field">
    {label && <span className="field-label">{label}</span>}
    {children}
    {hint && <span className="field-hint">{hint}</span>}
  </label>
);

export function Avatar({ member, size = 36 }) {
  return (
    <div
      className="avatar"
      style={{ background: member?.color || '#64748b', width: size, height: size, fontSize: size * 0.42 }}
    >
      {(member?.name || '?').trim().charAt(0)}
    </div>
  );
}

export function ManagerBadge() {
  const { t } = useApp();
  return <span className="badge badge-accent">{t('manager')}</span>;
}

export function Empty({ text }) {
  return <div className="empty">{text}</div>;
}

export function SectionHead({ title, right }) {
  return (
    <div className="section-head">
      <h3>{title}</h3>
      {right}
    </div>
  );
}
