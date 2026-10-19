import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import './Modals.css';

interface PasswordModalProps {
  onSubmitPassword: (password: string) => void;
  onCancel: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({ onSubmitPassword, onCancel }) => {
  const { passwordPrompt } = useUIStore();
  const [password, setPassword] = useState('');

  if (!passwordPrompt.isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      onSubmitPassword(password);
      setPassword('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '50%', color: 'var(--primary)' }}>
              <Lock size={22} />
            </div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Password Required</h2>
          </div>
          <button
            onClick={onCancel}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
          This PDF document is encrypted. Please enter the password to view and edit its contents.
        </p>

        {passwordPrompt.error && (
          <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', fontSize: '13px', marginBottom: '16px' }}>
            {passwordPrompt.error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="setting-group">
            <input
              type="password"
              placeholder="Enter document password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'var(--surface)',
                color: 'var(--text-color)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button type="button" className="modal-close" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="modal-confirm" disabled={!password}>
              Unlock PDF
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
