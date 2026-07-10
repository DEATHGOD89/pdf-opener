import React from 'react';
import { Check } from 'lucide-react';
import { useToolStore } from '../../store/toolStore';

const FONTS = [
  { name: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { name: 'Times Roman', value: '"Times New Roman", Times, serif' },
  { name: 'Courier', value: 'Courier, monospace' },
];

const COLORS = ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B'];

interface TextFormatToolbarProps {
  x: number;
  y: number;
  onSave: () => void;
}

export const TextFormatToolbar: React.FC<TextFormatToolbarProps> = ({ x, y, onSave }) => {
  const { selectedColor, setSelectedColor, selectedFont, setSelectedFont, selectedFontSize, setSelectedFontSize } = useToolStore();

  return (
    <div 
      style={{
        position: 'absolute',
        left: x,
        top: y - 50,
        background: 'var(--surface-color)',
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        padding: '6px 12px',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        zIndex: 1000,
        pointerEvents: 'auto',
      }}
      onPointerDown={e => e.stopPropagation()}
    >
      <select 
        value={selectedFont} 
        onChange={(e) => setSelectedFont(e.target.value)}
        style={{
          background: 'transparent',
          border: '1px solid var(--border-color)',
          borderRadius: 4,
          padding: '4px 8px',
          color: 'var(--text-color)',
          outline: 'none',
          cursor: 'pointer'
        }}
      >
        {FONTS.map(f => (
          <option key={f.name} value={f.value}>{f.name}</option>
        ))}
      </select>

      <input
        type="number"
        value={selectedFontSize}
        onChange={(e) => setSelectedFontSize(Number(e.target.value) || 16)}
        min={8}
        max={144}
        style={{
          width: 50,
          background: 'transparent',
          border: '1px solid var(--border-color)',
          borderRadius: 4,
          padding: '4px',
          color: 'var(--text-color)',
          outline: 'none',
        }}
        title="Font size"
      />

      <div style={{ display: 'flex', gap: 6, borderRight: '1px solid var(--border-color)', paddingRight: 16 }}>
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => setSelectedColor(c)}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: c,
              border: selectedColor === c ? '2px solid var(--primary-color)' : '1px solid rgba(0,0,0,0.1)',
              cursor: 'pointer',
              padding: 0
            }}
          />
        ))}
      </div>

      <button
        onClick={onSave}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'var(--primary-color)',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          padding: '4px 12px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 12
        }}
      >
        <Check size={14} /> Done
      </button>
    </div>
  );
};
