import React, { useState, useRef } from 'react';
import { LayoutGrid, MessageSquare } from 'lucide-react';
import { Thumbnails } from './Thumbnails';
import { useAnnotationStore } from '../../store/annotationStore';
import { useUIStore } from '../../store/uiStore';
import './Sidebar.css';

import * as pdfjs from 'pdfjs-dist';

interface SidebarProps {
  pdf: pdfjs.PDFDocumentProxy | null;
  onPageSelect?: (page: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ pdf, onPageSelect }) => {
  const [activeTab, setActiveTab] = useState<'thumbnails' | 'annotations'>('thumbnails');
  const { annotations, removeAnnotation } = useAnnotationStore();
  const { currentPage, totalPages } = useUIStore();
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={activeTab === 'thumbnails' ? 'active' : ''}
          onClick={() => setActiveTab('thumbnails')}
          title="Thumbnails"
        >
          <LayoutGrid size={18} />
          <span style={{ fontSize: '12px', fontWeight: 600 }}>Pages</span>
        </button>
        <button
          className={activeTab === 'annotations' ? 'active' : ''}
          onClick={() => setActiveTab('annotations')}
          title="Annotations"
          style={{ position: 'relative' }}
        >
          <MessageSquare size={18} />
          <span style={{ fontSize: '12px', fontWeight: 600 }}>Annotations</span>
          {annotations.length > 0 && (
            <span className="annotations-count-pill">{annotations.length}</span>
          )}
        </button>
      </div>
      
      <div className="sidebar-content" ref={contentRef}>
        {activeTab === 'thumbnails' && (
          <Thumbnails 
            pdf={pdf} 
            totalPages={totalPages} 
            currentPage={currentPage} 
            onPageSelect={onPageSelect}
            scrollContainerRef={contentRef}
          />
        )}
        {activeTab === 'annotations' && (
          <div className="annotations-list">
            {annotations.length === 0 ? (
              <div className="empty-state">
                <MessageSquare size={32} opacity={0.3} />
                <p>No annotations yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {annotations.map(ann => (
                  <div key={ann.id} style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{ann.type.toUpperCase()}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Page {ann.page}</span>
                    </div>
                    {ann.content && <div style={{ fontSize: '13px', marginTop: '4px' }}>{ann.content}</div>}
                    <button 
                      onClick={() => removeAnnotation(ann.id)}
                      style={{ marginTop: '8px', fontSize: '12px', color: 'red', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
