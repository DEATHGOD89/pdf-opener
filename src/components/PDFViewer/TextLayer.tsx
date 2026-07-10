import React, { useEffect, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';

interface TextLayerProps {
  page: pdfjs.PDFPageProxy;
  zoom: number;
}

export const TextLayer: React.FC<TextLayerProps> = ({ page, zoom }) => {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (!layerRef.current) return;
    const container = layerRef.current;
    
    // Clear previous text layer contents
    container.innerHTML = '';

    const renderLayer = async () => {
      try {
        const textContent = await page.getTextContent();
        if (cancelled) return;
        
        const viewport = page.getViewport({ scale: zoom });
        
        // This sets up the DOM elements that match text perfectly
        const textLayer = new pdfjs.TextLayer({
          textContentSource: textContent,
          container: container,
          viewport: viewport,
        });
        
        await textLayer.render();
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error("Failed to render text layer:", err);
        }
      }
    };

    renderLayer();

    return () => {
      cancelled = true;
    };
  }, [page, zoom]);

  return (
    <div 
      ref={layerRef}
      className="textLayer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        lineHeight: 1,
        '--scale-factor': zoom,
      } as React.CSSProperties}
    />
  );
};
