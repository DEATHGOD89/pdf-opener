import { useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, FileX } from 'lucide-react';
import { PageRenderer } from './PageRenderer';
import { ZoomControls } from './ZoomControls';
import { useUIStore } from '../../store/uiStore';
import { useToolStore } from '../../store/toolStore';
import { useState } from 'react';
import './PDFViewer.css';

interface PDFViewerProps {
  pdf: pdfjs.PDFDocumentProxy | null;
  fileData: Uint8Array | null;
  fileName: string;
  onOpenFile?: () => void;
}

export interface PDFViewerHandle {
  goNext: () => void;
  goPrev: () => void;
  scrollToPage: (pageNum: number) => void;
}

export const PDFViewer = forwardRef<PDFViewerHandle, PDFViewerProps>(({ pdf, fileData, fileName, onOpenFile }, ref) => {
  const { zoom, zoomIn, zoomOut, resetZoom, currentPage, totalPages, setCurrentPage } = useUIStore();
  const { selectedTool } = useToolStore();
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState<{x: number, y: number} | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Removed the useEffect that was overwriting pageRefs.current and breaking navigation

  // Use IntersectionObserver to update currentPage based on scroll
  useEffect(() => {
    if (!pdf) return;
    const container = scrollContainerRef.current;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const pageStr = entry.target.getAttribute('data-page');
          if (pageStr) {
            const p = parseInt(pageStr, 10);
            setCurrentPage(p);
          }
        }
      });
    }, {
      root: container,
      rootMargin: '0px',
      threshold: 0.5 // Page is "current" when 50% visible
    });

    for (const ref of pageRefs.current) {
      if (ref) observer.observe(ref);
    }

    return () => observer.disconnect();
  }, [pdf, totalPages]);

  const scrollToPage = (pageNum: number) => {
    const el = pageRefs.current[pageNum - 1];
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useImperativeHandle(ref, () => ({
    goPrev: () => {
      const p = Math.max(currentPage - 1, 1);
      scrollToPage(p);
    },
    goNext: () => {
      const p = Math.min(currentPage + 1, totalPages);
      scrollToPage(p);
    },
    scrollToPage,
  }), [currentPage, totalPages]);

  const goPrev = () => {
    const p = Math.max(currentPage - 1, 1);
    scrollToPage(p);
  };
  
  const goNext = () => {
    const p = Math.min(currentPage + 1, totalPages);
    scrollToPage(p);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (selectedTool === 'hand') {
      setIsPanning(true);
      setLastPanPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning && lastPanPos && scrollContainerRef.current) {
      const dx = e.clientX - lastPanPos.x;
      const dy = e.clientY - lastPanPos.y;
      scrollContainerRef.current.scrollBy(-dx, -dy);
      setLastPanPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = () => {
    setIsPanning(false);
    setLastPanPos(null);
  };

  if (!fileData) {
    return (
      <div className="pdf-viewer">
        <div 
          className="viewer-empty" 
          onClick={onOpenFile}
          style={{ cursor: 'pointer' }}
        >
          <FileX size={64} className="empty-icon-svg" />
          <h2>Drop a PDF here</h2>
          <p>Or click here to select a file</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-viewer">
      <div 
        className="viewer-body" 
        ref={scrollContainerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ cursor: selectedTool === 'hand' ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
      >
        {!pdf && fileData && <div className="viewer-loading"><div className="spinner-loader" /> Loading PDF...</div>}
        {pdf && (
          <div className="pdf-document-scroll">
            {Array.from({ length: totalPages }).map((_, index) => {
              const pageNum = index + 1;
              const isVisible = Math.abs(pageNum - currentPage) <= 3;

              return (
                <div 
                  key={pageNum} 
                  ref={el => pageRefs.current[index] = el}
                  data-page={pageNum}
                  className="pdf-page-wrapper"
                  style={{ minHeight: `${1000 * zoom}px` }} // Fallback min height for smooth scrolling
                >
                  {isVisible ? (
                    <PageRenderer pdf={pdf} pageNum={pageNum} zoom={zoom} />
                  ) : (
                    <div style={{ height: `${1000 * zoom}px`, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
                      Page {pageNum}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Controls Overlay */}
      <div className="floating-controls">
        <div className="floating-controls-panel glass-panel">
          <div className="file-info-pill" title={fileName}>
            {fileName}
          </div>
          
          <div className="control-divider" />
          
          <div className="pagination-group">
            <button onClick={goPrev} disabled={currentPage <= 1} className="icon-btn" aria-label="Previous page">
              <ChevronLeft size={20} />
            </button>
            <span className="page-indicator">
              <strong>{currentPage}</strong> / {totalPages}
            </span>
            <button onClick={goNext} disabled={currentPage >= totalPages} className="icon-btn" aria-label="Next page">
              <ChevronRight size={20} />
            </button>
          </div>
          
          <div className="control-divider" />
          
          <ZoomControls zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onResetZoom={resetZoom} />
        </div>
      </div>
    </div>
  );
});
