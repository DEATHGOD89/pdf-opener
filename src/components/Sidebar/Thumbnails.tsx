import React, { useEffect, useState, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { useIntersection } from '@mantine/hooks';

interface ThumbnailItemProps {
  pageNum: number;
  pdf: pdfjs.PDFDocumentProxy | null;
  isActive: boolean;
  onClick?: (page: number) => void;
}

const ThumbnailItem: React.FC<ThumbnailItemProps> = ({ pageNum, pdf, isActive, onClick }) => {
  const { ref, entry } = useIntersection({
    root: null,
    threshold: 0.1,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (entry?.isIntersecting && !rendered && pdf && canvasRef.current) {
      let renderTask: any;
      let cancelled = false;

      pdf.getPage(pageNum).then(page => {
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 0.2 });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        renderTask = page.render(renderContext);
        renderTask.promise.then(() => {
          if (!cancelled) setRendered(true);
        }).catch(() => {
          // Ignore cancellation errors
        });
      }).catch(() => {});

      return () => {
        cancelled = true;
        if (renderTask) renderTask.cancel();
      };
    }
  }, [entry?.isIntersecting, rendered, pdf, pageNum]);

  return (
    <div 
      ref={ref}
      className={`thumbnail-item ${isActive ? 'active' : ''}`}
      onClick={() => onClick?.(pageNum)}
      style={{ 
        border: isActive ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
        cursor: 'pointer',
        textAlign: 'center',
        backgroundColor: 'var(--surface-color)',
        minHeight: '120px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        borderRadius: '6px',
        overflow: 'hidden'
      }}
    >
      <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto', display: rendered ? 'block' : 'none' }} />
      {!rendered && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading...</span>}
      <span style={{ fontSize: '11px', marginTop: '8px', fontWeight: isActive ? 'bold' : 'normal', color: isActive ? 'var(--primary-color)' : 'var(--text-muted)' }}>{pageNum}</span>
    </div>
  );
};

interface ThumbnailsProps {
  totalPages: number;
  currentPage: number;
  pdf: pdfjs.PDFDocumentProxy | null;
  onPageSelect?: (page: number) => void;
}

export const Thumbnails: React.FC<ThumbnailsProps> = ({ totalPages, currentPage, pdf, onPageSelect }) => {
  return (
    <div className="thumbnails" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px' }}>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <ThumbnailItem 
          key={page} 
          pageNum={page} 
          pdf={pdf} 
          isActive={currentPage === page} 
          onClick={onPageSelect} 
        />
      ))}
      {totalPages === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>Open a document to see thumbnails.</p>}
    </div>
  );
};
