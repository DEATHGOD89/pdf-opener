import React from 'react';
import './Spinner.css';

export const Spinner: React.FC = () => {
  return (
    <div className="spinner-overlay">
      <div className="spinner"></div>
    </div>
  );
};
