import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', style, ...props }) => {
  const baseStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 500,
  };

  const variants = {
    primary: { backgroundColor: 'var(--primary-color, #228be6)', color: 'white' },
    secondary: { backgroundColor: 'var(--surface-color, #e9ecef)', color: 'var(--text-color, #495057)', border: '1px solid var(--border-color, #ced4da)' },
    danger: { backgroundColor: '#fa5252', color: 'white' },
  };

  return (
    <button style={{ ...baseStyle, ...variants[variant], ...style }} {...props}>
      {children}
    </button>
  );
};
