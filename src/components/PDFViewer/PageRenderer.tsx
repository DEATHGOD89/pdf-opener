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
}

export const PageRenderer: React.FC<PageRendererProps> = ({ pdf, pageNum, zoom }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<pdfjs.RenderTask | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number, height: number }>({ width: 0, height: 0 });
  const [pageData, setPageData] = useState<pdfjs.PDFPageProxy | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderPage = async () => {
      if (!canvasRef.current) return;

      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
      }

      try {
        const page = await pdf.getPage(pageNum);
        if (cancelled) return;
        
        setPageData(page);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) { console.error('PageRenderer: canvas 2d context unavailable'); return; }

        const viewport = page.getViewport({ scale: zoom });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setDimensions({ width: viewport.width, height: viewport.height });

        const renderTask = page.render({
          canvasContext: ctx,
          viewport,
        });
        renderTaskRef.current = renderTask;
        
        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Render error:', err);
        }
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
      }
    };
  }, [pdf, pageNum, zoom]);

  return (
    <div className="page-container" style={{ position: 'relative', display: 'inline-block' }}>
      <canvas ref={canvasRef} className="pdf-canvas" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.1)', backgroundColor: 'white' }} />
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
