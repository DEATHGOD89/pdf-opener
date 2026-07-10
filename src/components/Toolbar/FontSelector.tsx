import React from 'react';

interface FontSelectorProps {
  font: string;
  onChange: (font: string) => void;
}

export const FontSelector: React.FC<FontSelectorProps> = ({ font, onChange }) => {
  return (
    <select 
      value={font} 
      onChange={(e) => onChange(e.target.value)}
      style={{ 
        padding: '6px 12px', 
        borderRadius: 'var(--radius-sm)', 
        border: '1px solid var(--border-color)',
        background: 'var(--surface-1)',
        color: 'var(--text-color)',
        outline: 'none',
        fontFamily: 'inherit',
        cursor: 'pointer'
      }}
      title="Choose Font"
    >
      <option value="Inter">Inter</option>
      <option value="Arial">Arial</option>
      <option value="Times New Roman">Times New Roman</option>
      <option value="Courier New">Courier New</option>
    </select>
  );
};
