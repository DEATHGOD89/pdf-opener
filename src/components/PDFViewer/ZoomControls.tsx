import React from 'react';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom?: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ zoom, onZoomIn, onZoomOut, onResetZoom }) => {
  return (
    <div className="zoom-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button onClick={onZoomOut} title="Zoom Out" aria-label="Zoom Out" className="mantine-ActionIcon-root" style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid var(--border-color, #ccc)', background: 'var(--surface-color, #fff)', color: 'var(--text-color, #000)' }}>-</button>
      <span className="zoom-info" style={{ minWidth: '48px', textAlign: 'center', fontSize: '14px', color: 'var(--text-color, #000)' }}>
        {Math.round(zoom * 100)}%
      </span>
      <button onClick={onZoomIn} title="Zoom In" aria-label="Zoom In" className="mantine-ActionIcon-root" style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid var(--border-color, #ccc)', background: 'var(--surface-color, #fff)', color: 'var(--text-color, #000)' }}>+</button>
      {onResetZoom && (
        <button onClick={onResetZoom} title="Reset Zoom" aria-label="Reset Zoom" className="mantine-ActionIcon-root" style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid var(--border-color, #ccc)', background: 'var(--surface-color, #fff)', color: 'var(--text-color, #000)', fontSize: '12px' }}>R</button>
      )}
    </div>
  );
};
