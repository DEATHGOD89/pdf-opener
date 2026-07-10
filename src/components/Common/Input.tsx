import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, style, className, ...props }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', ...style }} className={className}>
      {label && <label style={{ fontSize: '14px', fontWeight: 500 }}>{label}</label>}
      <input 
        style={{ 
          padding: '8px', 
          borderRadius: '4px', 
          border: '1px solid var(--border-color, #ced4da)',
          background: 'var(--surface-color, #fff)',
          color: 'var(--text-color, #000)'
        }} 
        {...props} 
      />
    </div>
  );
};
