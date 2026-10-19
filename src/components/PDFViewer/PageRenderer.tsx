import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { AnnotationLayer } from './AnnotationLayer';
import { SearchHighlightLayer } from './SearchHighlightLayer';
import { TextLayer } from './TextLayer';
import { NativeLinksLayer } from './NativeLinksLayer';

interface PageRendererProps {
  pdf: pdfjs.PDFDocumentProxy;
  pageNum: number;
  zoom: number;
  onDimensionsMeasured?: (pageNum: number, width: number, height: number) => void;
}

export const PageRenderer: React.FC<PageRendererProps> = ({
  pdf,
  pageNum,
  zoom,
  onDimensionsMeasured,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<pdfjs.RenderTask | null>(null);
  const activePageRef = useRef<pdfjs.PDFPageProxy | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [pageData, setPageData] = useState<pdfjs.PDFPageProxy | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderPage = async () => {
      if (!canvasRef.current) return;

      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }

      try {
        const page = await pdf.getPage(pageNum);
        if (cancelled) return;

        activePageRef.current = page;
        setPageData(page);

        const canvas = canvasRef.current;
        const visibleCtx = canvas.getContext('2d', { alpha: false });
        if (!visibleCtx) return;

        // HiDPI / Retina crisp rendering
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        const cssViewport = page.getViewport({ scale: zoom });
        const cssWidth = Math.floor(cssViewport.width);
        const cssHeight = Math.floor(cssViewport.height);

        const renderViewport = page.getViewport({ scale: zoom * dpr });

        // Update canvas sizing
        canvas.width = renderViewport.width;
        canvas.height = renderViewport.height;
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        // 1. Immediately paint white so canvas NEVER flashes black
        visibleCtx.fillStyle = '#ffffff';
        visibleCtx.fillRect(0, 0, canvas.width, canvas.height);
        visibleCtx.imageSmoothingEnabled = true;
        visibleCtx.imageSmoothingQuality = 'high';

        setDimensions({ width: cssWidth, height: cssHeight });
        onDimensionsMeasured?.(pageNum, cssWidth, cssHeight);

        // 2. Offscreen double-buffering: render in background to prevent partial frame redraws
        const offscreen = document.createElement('canvas');
        offscreen.width = renderViewport.width;
        offscreen.height = renderViewport.height;
        const offCtx = offscreen.getContext('2d', { alpha: false });
        if (!offCtx) return;

        offCtx.fillStyle = '#ffffff';
        offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
        offCtx.imageSmoothingEnabled = true;
        offCtx.imageSmoothingQuality = 'high';

        const renderTask = page.render({
          canvasContext: offCtx,
          viewport: renderViewport,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        renderTaskRef.current = null;

        // 3. Blit offscreen buffer to visible canvas in 0ms atomically
        if (!cancelled && canvasRef.current) {
          visibleCtx.drawImage(offscreen, 0, 0);
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Render error on page', pageNum, err);
        }
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
      try {
        activePageRef.current?.cleanup();
      } catch {}
    };
  }, [pdf, pageNum, zoom, onDimensionsMeasured]);

  return (
    <div className="page-container" style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        className="pdf-canvas"
        style={{
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          backgroundColor: 'white',
        }}
      />
      {dimensions.width > 0 && (
        <>
          <SearchHighlightLayer
            pageNum={pageNum}
            zoom={zoom}
            width={dimensions.width}
            height={dimensions.height}
          />
          {pageData && <TextLayer page={pageData} zoom={zoom} />}
          {pageData && <NativeLinksLayer page={pageData} zoom={zoom} />}
          <AnnotationLayer
            pageNum={pageNum}
            zoom={zoom}
            width={dimensions.width}
            height={dimensions.height}
          />
        </>
      )}
    </div>
  );
};
