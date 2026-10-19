import { useRef, forwardRef, useImperativeHandle, useEffect, useState, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, FolderOpen, FileText } from 'lucide-react';
import { PageRenderer } from './PageRenderer';
import { ZoomControls } from './ZoomControls';
import { useUIStore } from '../../store/uiStore';
import { useToolStore } from '../../store/toolStore';
import './PDFViewer.css';

interface PDFViewerProps {
  pdf: pdfjs.PDFDocumentProxy | null;
  fileData: Uint8Array | null;
  fileName: string;
  onOpenFile?: () => void;
  onOpenRecent?: (path: string) => void;
}

export interface PDFViewerHandle {
  goNext: () => void;
  goPrev: () => void;
  scrollToPage: (pageNum: number) => void;
  focusJumpInput?: () => void;
}

export const PDFViewer = forwardRef<PDFViewerHandle, PDFViewerProps>(({ pdf, fileData, fileName, onOpenFile, onOpenRecent }, ref) => {
  const { zoom, zoomIn, zoomOut, resetZoom, setZoom, currentPage, totalPages, setCurrentPage, nightMode, recentDocs } = useUIStore();
  const { selectedTool } = useToolStore();
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState<{x: number, y: number} | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Removed the useEffect that was overwriting pageRefs.current and breaking navigation

  const [pageDimensions, setPageDimensions] = useState<{ [pageNum: number]: { width: number; height: number } }>({});
  const [defaultRatio, setDefaultRatio] = useState<number>(1.414);
  const [nativePageSize, setNativePageSize] = useState<{ width: number; height: number }>({ width: 595, height: 842 });

  const [isEditingPage, setIsEditingPage] = useState(false);
  const [jumpInput, setJumpInput] = useState('');
  const jumpInputRef = useRef<HTMLInputElement>(null);

  // Measure initial page ratio for seamless placeholder heights & fit to width/page
  useEffect(() => {
    if (!pdf) {
      setPageDimensions({});
      return;
    }
    pdf.getPage(1).then(page => {
      const vp = page.getViewport({ scale: 1 });
      if (vp.width > 0 && vp.height > 0) {
        setDefaultRatio(vp.height / vp.width);
        setNativePageSize({ width: vp.width, height: vp.height });
      }
    }).catch(() => {});
  }, [pdf]);

  const handleDimensionsMeasured = (pageNum: number, w: number, h: number) => {
    setPageDimensions(prev => {
      if (prev[pageNum]?.width === w && prev[pageNum]?.height === h) return prev;
      return { ...prev, [pageNum]: { width: w, height: h } };
    });
  };

  // Support Ctrl + MouseWheel to zoom
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          useUIStore.getState().zoomIn();
        } else {
          useUIStore.getState().zoomOut();
        }
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

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
  }, [pdf, totalPages, setCurrentPage]);

  const scrollToPage = (pageNum: number) => {
    const el = pageRefs.current[pageNum - 1];
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleStartJump = useCallback(() => {
    setJumpInput(String(currentPage));
    setIsEditingPage(true);
    setTimeout(() => jumpInputRef.current?.select(), 50);
  }, [currentPage]);

  const handleFinishJump = useCallback(() => {
    setIsEditingPage(false);
    const target = parseInt(jumpInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      scrollToPage(target);
    }
  }, [jumpInput, totalPages]);

  const handleJumpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleFinishJump();
    } else if (e.key === 'Escape') {
      setIsEditingPage(false);
    }
  };

  const handleFitWidth = useCallback(() => {
    if (!scrollContainerRef.current || !nativePageSize.width) return;
    const containerWidth = scrollContainerRef.current.clientWidth - 48;
    const targetZoom = Math.max(0.25, Math.min(3, Math.round((containerWidth / nativePageSize.width) * 100) / 100));
    setZoom(targetZoom);
  }, [nativePageSize.width, setZoom]);

  const handleFitPage = useCallback(() => {
    if (!scrollContainerRef.current || !nativePageSize.width || !nativePageSize.height) return;
    const containerWidth = scrollContainerRef.current.clientWidth - 48;
    const containerHeight = scrollContainerRef.current.clientHeight - 48;
    const zoomW = containerWidth / nativePageSize.width;
    const zoomH = containerHeight / nativePageSize.height;
    const targetZoom = Math.max(0.25, Math.min(3, Math.round(Math.min(zoomW, zoomH) * 100) / 100));
    setZoom(targetZoom);
  }, [nativePageSize, setZoom]);

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
    focusJumpInput: handleStartJump,
  }), [currentPage, totalPages, handleStartJump]);

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
      <div className="pdf-viewer empty-viewer-container">
        <div 
          className="viewer-empty-card" 
          onClick={onOpenFile}
        >
          <div className="viewer-empty-icon-wrapper">
            <FolderOpen size={48} className="empty-icon-svg" />
          </div>
          <h2>Open a PDF Document</h2>
          <p className="viewer-empty-subtitle">
            Drag and drop your file here, or click to browse
          </p>
          <button 
            type="button"
            className="viewer-open-btn" 
            onClick={(e) => { 
              e.stopPropagation(); 
              onOpenFile?.(); 
            }}
          >
            <FolderOpen size={18} />
            <span>Select PDF File</span>
            <kbd className="shortcut-hint">Ctrl + O</kbd>
          </button>
          <div className="viewer-features-badge">
            <span>⚡ Ultra-Fast 60fps</span>
            <span>•</span>
            <span>🔍 Crisp HiDPI</span>
            <span>•</span>
            <span>✏️ Markup & Draw</span>
          </div>

          {recentDocs.length > 0 && (
            <div className="viewer-recent-container" onClick={e => e.stopPropagation()}>
              <span className="recent-title">Recent Documents</span>
              <div className="recent-chips">
                {recentDocs.map(doc => (
                  <button
                    key={doc.path}
                    type="button"
                    className="recent-chip"
                    onClick={() => onOpenRecent?.(doc.path)}
                    title={doc.path}
                  >
                    <FileText size={13} />
                    <span className="recent-chip-name">{doc.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`pdf-viewer ${nightMode ? 'night-mode' : ''}`}>
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
              const isVisible = totalPages <= 30 || Math.abs(pageNum - currentPage) <= 5;
              const measured = pageDimensions[pageNum];
              const approxWidth = Math.min(window.innerWidth - 360, 800) * zoom;
              const placeholderHeight = measured ? measured.height : Math.round(approxWidth * defaultRatio);
              const placeholderWidth = measured ? measured.width : Math.round(approxWidth);

              return (
                <div 
                  key={pageNum} 
                  ref={el => pageRefs.current[index] = el}
                  data-page={pageNum}
                  className="pdf-page-wrapper"
                  style={{ minHeight: `${placeholderHeight}px` }}
                >
                  {isVisible ? (
                    <PageRenderer 
                      pdf={pdf} 
                      pageNum={pageNum} 
                      zoom={zoom} 
                      onDimensionsMeasured={handleDimensionsMeasured}
                    />
                  ) : (
                    <div 
                      className="pdf-page-placeholder"
                      style={{ 
                        height: `${placeholderHeight}px`, 
                        width: `${placeholderWidth}px`, 
                        backgroundColor: 'white',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: 'var(--shadow-paper)',
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'var(--text-muted)',
                        gap: '8px'
                      }}
                    >
                      <div className="spinner-loader" style={{ width: 20, height: 20, borderWidth: 2 }} />
                      <span style={{ fontSize: '12px', fontWeight: 500 }}>Page {pageNum}</span>
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
            {isEditingPage ? (
              <div className="page-indicator page-jump-box">
                <input
                  ref={jumpInputRef}
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpInput}
                  onChange={e => setJumpInput(e.target.value)}
                  onBlur={handleFinishJump}
                  onKeyDown={handleJumpKeyDown}
                  className="page-jump-input"
                  autoFocus
                />
                <span className="page-jump-total">/ {totalPages}</span>
              </div>
            ) : (
              <button
                type="button"
                className="page-indicator page-indicator-btn"
                onClick={handleStartJump}
                title="Click to jump to page (Ctrl+G)"
              >
                <strong>{currentPage}</strong> / {totalPages}
              </button>
            )}
            <button onClick={goNext} disabled={currentPage >= totalPages} className="icon-btn" aria-label="Next page">
              <ChevronRight size={20} />
            </button>
          </div>
          
          <div className="control-divider" />
          
          <ZoomControls 
            zoom={zoom} 
            onZoomIn={zoomIn} 
            onZoomOut={zoomOut} 
            onResetZoom={resetZoom}
            onFitWidth={handleFitWidth}
            onFitPage={handleFitPage}
          />
        </div>
      </div>
    </div>
  );
});
