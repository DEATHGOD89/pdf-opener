import React from 'react';
import { useLocation } from 'wouter';
import { 
  FileEdit, SplitSquareHorizontal, RotateCw, Layers 
} from 'lucide-react';
import './Dashboard.css';

interface ToolCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  color: string;
  isNew?: boolean;
  isPopular?: boolean;
}

export const Dashboard: React.FC = () => {
  const [, setLocation] = useLocation();

  const tools: ToolCard[] = [
    {
      id: 'edit',
      title: 'Edit PDF',
      description: 'Edit the real text inside your PDF — fix typos, replace words, white-out content and highlight sections.',
      icon: FileEdit,
      route: '/editor',
      color: '#10b981',
      isNew: true
    },
    {
      id: 'merge',
      title: 'Merge PDF',
      description: 'Combine multiple PDFs into one document.',
      icon: Layers,
      route: '/merge',
      color: '#f43f5e',
      isPopular: true
    },
    {
      id: 'split',
      title: 'Split PDF',
      description: 'Separate PDF pages into individual files or page ranges.',
      icon: SplitSquareHorizontal,
      route: '/split',
      color: '#f43f5e',
      isPopular: true
    },
    {
      id: 'rotate',
      title: 'Rotate PDF',
      description: 'Rotate PDF pages 90°, 180°, or 270°.',
      icon: RotateCw,
      route: '/rotate',
      color: '#f43f5e'
    }
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-brand">
          <img src="/logo.png" alt="PDF Opener Pro Logo" className="brand-logo-img" />
          <h1>PDF Opener Pro</h1>
        </div>
        <p className="dashboard-subtitle">Most used tools — start here</p>
      </div>

      <div className="tools-grid">
        {tools.map((tool) => (
          <div 
            key={tool.id} 
            className="tool-card" 
            onClick={() => setLocation(tool.route)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLocation(tool.route); } }}
          >
            <div className="tool-card-header">
              <div className="tool-icon" style={{ backgroundColor: `${tool.color}15`, color: tool.color }}>
                <tool.icon size={24} />
              </div>
              <div className="tool-badges">
                {tool.isPopular && <span className="badge badge-popular">Popular</span>}
                {tool.isNew && <span className="badge badge-new">New</span>}
              </div>
            </div>
            <h3 className="tool-title">{tool.title}</h3>
            <p className="tool-desc">{tool.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
