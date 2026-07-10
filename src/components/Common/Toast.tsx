import React, { useEffect } from 'react';
import { useUIStore, ToastMessage } from '../../store/uiStore';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import './Toast.css';

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 4000); // Auto-dismiss after 4 seconds
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const Icon = toast.type === 'error' ? AlertCircle : toast.type === 'success' ? CheckCircle : Info;

  return (
    <div className={`toast-item toast-${toast.type}`}>
      <Icon size={18} className="toast-icon" />
      <span className="toast-message">{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="toast-close">
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};
