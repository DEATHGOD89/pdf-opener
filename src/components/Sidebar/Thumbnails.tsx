import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { Layers } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

interface ThumbnailsProps {
  totalPages: number;
  currentPage: number;
  pdf: pdfjs.PDFDocumentProxy | null;
  onPageSelect?: (page: number) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export const Thumbnails: React.FC<ThumbnailsProps> = ({
  totalPages,
  currentPage,
  pdf,
  onPageSelect,
  scrollContainerRef,
}) => {
  const [renderedMap, setRenderedMap] = useState<{ [pageNum: number]: string }>({});
  const [aspectRatio, setAspectRatio] = useState<number>(1.414);
  const thumbnailCache = useRef<Map<number, string>>(new Map());
  const itemRefs = useRef<{ [pageNum: number]: HTMLDivElement | null }>({});
  const queueRef = useRef<number[]>([]);
  const isRenderingRef = useRef<boolean>(false);
  const pdfRef = useRef<pdfjs.PDFDocumentProxy | null>(pdf);

  pdfRef.current = pdf;

  // Clear cache and queue when a new PDF is opened
  useEffect(() => {
    thumbnailCache.current.clear();
    queueRef.current = [];
    isRenderingRef.current = false;
    setRenderedMap({});

    if (!pdf) return;

    // Detect exact page aspect ratio from page 1
    pdf.getPage(1).then((page) => {
      const vp = page.getViewport({ scale: 1 });
      if (vp.width > 0 && vp.height > 0) {
        setAspectRatio(vp.height / vp.width);
      }
    }).catch(() => {});
  }, [pdf]);

  // Process rendering queue sequentially with priority given to currentPage
  const processQueue = useCallback(async () => {
    if (isRenderingRef.current || !pdfRef.current) return;
    if (queueRef.current.length === 0) return;

    // Sort queue by proximity to currentPage so visible/current pages render first
    const targetDoc = pdfRef.current;
    queueRef.current.sort((a, b) => Math.abs(a - currentPage) - Math.abs(b - currentPage));
    const pageNum = queueRef.current.shift();
    if (!pageNum) return;

    // If already in memory cache, skip render
    if (thumbnailCache.current.has(pageNum)) {
      setRenderedMap((prev) => ({
        ...prev,
        [pageNum]: thumbnailCache.current.get(pageNum)!,
      }));
      processQueue();
      return;
    }

    isRenderingRef.current = true;

    try {
      const page = await targetDoc.getPage(pageNum);
      // HiDPI crisp thumbnail scale
      const unscaledViewport = page.getViewport({ scale: 1 });
      const targetCssWidth = 190;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = (targetCssWidth / unscaledViewport.width) * dpr;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d', { alpha: false });

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        await page.render({
          canvasContext: ctx,
          viewport: viewport,
        }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        thumbnailCache.current.set(pageNum, dataUrl);

        // Only update state if still on the same document
        if (pdfRef.current === targetDoc) {
          setRenderedMap((prev) => ({
            ...prev,
            [pageNum]: dataUrl,
          }));
        }
      }
    } catch {
      // Ignore cancellation or page load errors
    } finally {
      isRenderingRef.current = false;
      // Continue processing next in queue
      setTimeout(processQueue, 16);
    }
  }, [currentPage]);

  const requestThumbnail = useCallback((pageNum: number) => {
    if (thumbnailCache.current.has(pageNum)) {
      setRenderedMap((prev) => {
        if (prev[pageNum]) return prev;
        return { ...prev, [pageNum]: thumbnailCache.current.get(pageNum)! };
      });
      return;
    }

    if (!queueRef.current.includes(pageNum)) {
      queueRef.current.push(pageNum);
      processQueue();
    }
  }, [processQueue]);

  // Pre-load current page thumbnail immediately
  useEffect(() => {
    if (pdf && currentPage >= 1 && currentPage <= totalPages) {
      requestThumbnail(currentPage);
    }
  }, [pdf, currentPage, totalPages, requestThumbnail]);

  // Observer to load thumbnails ahead of time (with 350px rootMargin prefetch)
  useEffect(() => {
    if (!pdf || totalPages === 0) return;

    const rootElement = scrollContainerRef?.current || null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageStr = entry.target.getAttribute('data-thumb-page');
            if (pageStr) {
              const p = parseInt(pageStr, 10);
              requestThumbnail(p);
            }
          }
        });
      },
      {
        root: rootElement,
        rootMargin: '350px 0px', // Prefetch pages before scrolling into view!
        threshold: 0.01,
      }
    );

    Object.values(itemRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [pdf, totalPages, scrollContainerRef, requestThumbnail]);

  // Auto-scroll active thumbnail into view smoothly
  useEffect(() => {
    const activeEl = itemRefs.current[currentPage];
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentPage]);

  if (totalPages === 0 || !pdf) {
    return (
      <div className="empty-state">
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Open a document to see thumbnails.</p>
      </div>
    );
  }

  // Pre-calculate estimated thumbnail card height using aspect ratio
  const estimatedHeight = Math.round(190 * aspectRatio);

  return (
    <div className="thumbnails-wrapper">
      <div className="thumbnails-header-info">
        <span>Pages ({currentPage} / {totalPages})</span>
        <button
          className="thumb-header-organize-btn"
          onClick={() => useUIStore.getState().setOrganizeModalOpen(true)}
          title="Edit & Organize Pages (Split, Delete, Combine)"
        >
          <Layers size={13} />
          <span>Edit</span>
        </button>
      </div>
      
      <div className="thumbnails-grid">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          const isActive = currentPage === page;
          const imageSrc = renderedMap[page] || thumbnailCache.current.get(page);

          return (
            <div
              key={page}
              ref={(el) => (itemRefs.current[page] = el)}
              data-thumb-page={page}
              className={`thumbnail-card ${isActive ? 'active' : ''}`}
              onClick={() => onPageSelect?.(page)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPageSelect?.(page);
                }
              }}
              title={`Go to page ${page}`}
            >
              <div 
                className="thumbnail-preview-frame"
                style={{ minHeight: `${estimatedHeight}px` }}
              >
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={`Page ${page}`}
                    className="thumbnail-image"
                    loading="lazy"
                  />
                ) : (
                  <div 
                    className="thumbnail-skeleton"
                    style={{ height: `${estimatedHeight}px` }}
                  >
                    <div className="thumbnail-skeleton-shimmer" />
                    <span className="thumbnail-skeleton-text">Page {page}</span>
                  </div>
                )}
              </div>
              
              <div className={`thumbnail-badge ${isActive ? 'badge-active' : ''}`}>
                {page}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
