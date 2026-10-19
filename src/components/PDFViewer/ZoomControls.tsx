import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, ArrowLeftRight, Minimize2 } from 'lucide-react';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom?: () => void;
  onFitWidth?: () => void;
  onFitPage?: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitWidth,
  onFitPage,
}) => {
  return (
    <div className="zoom-controls" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
      <button
        onClick={onZoomOut}
        title="Zoom Out (Ctrl+-)"
        aria-label="Zoom Out"
        className="icon-btn"
      >
        <ZoomOut size={16} />
      </button>

      <span
        className="zoom-info"
        style={{
          minWidth: '46px',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-color)',
          userSelect: 'none',
        }}
        title="Current Zoom Level"
      >
        {Math.round(zoom * 100)}%
      </span>

      <button
        onClick={onZoomIn}
        title="Zoom In (Ctrl++)"
        aria-label="Zoom In"
        className="icon-btn"
      >
        <ZoomIn size={16} />
      </button>

      {onResetZoom && (
        <button
          onClick={onResetZoom}
          title="Reset Zoom to 100% (Ctrl+0)"
          aria-label="Reset Zoom"
          className="icon-btn"
        >
          <RotateCcw size={15} />
        </button>
      )}

      {onFitWidth && (
        <button
          onClick={onFitWidth}
          title="Fit Page to Window Width"
          aria-label="Fit to Width"
          className="icon-btn"
        >
          <ArrowLeftRight size={15} />
        </button>
      )}

      {onFitPage && (
        <button
          onClick={onFitPage}
          title="Fit Entire Page to Window"
          aria-label="Fit to Page"
          className="icon-btn"
        >
          <Minimize2 size={15} />
        </button>
      )}
    </div>
  );
};
