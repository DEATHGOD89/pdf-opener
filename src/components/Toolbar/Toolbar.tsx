import React from 'react';
import { MousePointer2, Hand, Pen, Eraser, Highlighter, Menu, FolderOpen, Save, Settings, Signature, Layers, Printer, Moon, Sun } from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import { FontSelector } from './FontSelector';
import { TextTool } from './TextTool';
import { useToolStore, ToolType } from '../../store/toolStore';
import { useUIStore } from '../../store/uiStore';
import './Toolbar.css';

interface ToolbarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onOpenFile: () => void;
  onSaveFile?: () => void;
  onPrint?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onToggleSidebar, isSidebarOpen, onOpenFile, onSaveFile, onPrint }) => {
  const { selectedTool, setSelectedTool, selectedColor, setSelectedColor, selectedFont, setSelectedFont } = useToolStore();
  const { setSignatureModalOpen, setSettingsModalOpen, setOrganizeModalOpen, nightMode, toggleNightMode } = useUIStore();

  const tools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <MousePointer2 size={18} />, label: 'Select' },
    { id: 'hand', icon: <Hand size={18} />, label: 'Hand' },
    { id: 'highlight', icon: <Highlighter size={18} />, label: 'Highlight' },
    { id: 'pen', icon: <Pen size={18} />, label: 'Pen' },
    { id: 'eraser', icon: <Eraser size={18} />, label: 'Eraser' },
  ];

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button 
          className={`toolbar-btn ${isSidebarOpen ? 'active' : ''}`}
          onClick={onToggleSidebar}
          title="Toggle Sidebar"
          aria-label="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>
        <div className="toolbar-divider" />
        
        <div className="tool-group">
          {tools.map(tool => (
          <button
            key={tool.id}
            className={`tool-btn ${selectedTool === tool.id ? 'active' : ''}`}
            title={tool.label}
            aria-label={tool.label}
            onClick={() => setSelectedTool(tool.id)}
          >
            {tool.icon}
          </button>
        ))}
        </div>

        <div className="toolbar-divider" />

        <div className="tool-group">
          <button 
            className="tool-btn" 
            title="Add Signature"
            aria-label="Add Signature"
            onClick={() => setSignatureModalOpen(true)}
          >
            <Signature size={18} />
          </button>
          <TextTool active={selectedTool === 'text'} onClick={() => setSelectedTool('text')} />
        </div>

        <div className="toolbar-divider" />
        
        <div className="tool-group options-group">
          <ColorPicker color={selectedColor} onChange={setSelectedColor} />
          <FontSelector font={selectedFont} onChange={setSelectedFont} />
        </div>
      </div>
      
      <div className="toolbar-right">
        <button 
          className="toolbar-btn" 
          title="Edit & Organize Pages (Split, Delete, Combine, Rotate)" 
          aria-label="Edit Pages" 
          onClick={() => setOrganizeModalOpen(true)}
        >
          <Layers size={18} />
          <span>Edit Pages</span>
        </button>
        <div className="toolbar-divider" />
        <button className="toolbar-btn primary-btn" title="Open PDF (Ctrl+O)" aria-label="Open PDF" onClick={onOpenFile}>
          <FolderOpen size={18} />
          <span>Open</span>
        </button>
        <button className="toolbar-btn" title="Save PDF (Ctrl+S)" aria-label="Save PDF" onClick={onSaveFile}>
          <Save size={18} />
        </button>
        <button className="toolbar-btn" title="Print Document (Ctrl+P)" aria-label="Print Document" onClick={onPrint}>
          <Printer size={18} />
        </button>
        <div className="toolbar-divider" />
        <button 
          className={`toolbar-btn ${nightMode ? 'active' : ''}`} 
          title="Toggle Night Reading Mode (Ctrl+N)" 
          aria-label="Toggle Night Reading Mode" 
          onClick={toggleNightMode}
        >
          {nightMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="toolbar-divider" />
        <button className="toolbar-btn" title="Settings" aria-label="Settings" onClick={() => setSettingsModalOpen(true)}>
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
};
