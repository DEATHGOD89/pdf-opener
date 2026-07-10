import React from 'react';
import { Type } from 'lucide-react';

interface TextToolProps {
  onClick: () => void;
  active?: boolean;
}

export const TextTool: React.FC<TextToolProps> = ({ onClick, active }) => {
  return (
    <button 
      className={`toolbar-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      title="Add Text"
    >
      <Type size={18} />
    </button>
  );
};
