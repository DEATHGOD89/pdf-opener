import React from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';

interface ToolPageLayoutProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

export const ToolPageLayout: React.FC<ToolPageLayoutProps> = ({ icon, title, description, children }) => {
  const [, setLocation] = useLocation();

  return (
    <div style={{ padding: 40, color: 'var(--text-color)', minHeight: '100vh', background: 'var(--bg-color)', overflowY: 'auto' }}>
      <button 
        onClick={() => setLocation('/')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 32 }}
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', padding: 16, background: 'rgba(34, 139, 230, 0.15)', color: 'var(--primary-color)', borderRadius: 16, marginBottom: 24 }}>
          {icon}
        </div>
        <h1 style={{ fontSize: 36, marginBottom: 16 }}>{title}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 18, marginBottom: 40 }}>{description}</p>
        
        {children}
      </div>
    </div>
  );
};
