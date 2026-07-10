import React from 'react';
import { useUIStore } from '../../store/uiStore';
import './Modals.css';

export const SettingsModal: React.FC = () => {
  const { settingsModalOpen, setSettingsModalOpen, theme, setZoom, zoom } = useUIStore();

  if (!settingsModalOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setSettingsModalOpen(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Settings</h2>
        <div className="modal-body">
          <div className="setting-group">
            <label>Theme</label>
            <select value={theme} onChange={(e) => {
              const desired = e.target.value as 'light' | 'dark';
              useUIStore.getState().setTheme(desired);
            }}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="setting-group">
            <label>Default Zoom: {Math.round(zoom * 100)}%</label>
            <input type="range" min="25" max="300" value={Math.round(zoom * 100)} onChange={(e) => setZoom(parseInt(e.target.value, 10) / 100)} />
          </div>
        </div>
        <button className="modal-close" onClick={() => setSettingsModalOpen(false)}>Close</button>
      </div>
    </div>
  );
};
