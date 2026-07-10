import React from 'react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  return (
    <input 
      type="color" 
      value={color} 
      onChange={(e) => onChange(e.target.value)} 
      style={{ width: '28px', height: '28px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      title="Choose Color"
    />
  );
};
