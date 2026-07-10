import React, { useEffect, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';

interface NativeLinksLayerProps {
  page: pdfjs.PDFPageProxy;
  zoom: number;
}

interface PdfLink {
  id: string;
  url?: string;
  dest?: string | any[];
  rect: number[];
}

export const NativeLinksLayer: React.FC<NativeLinksLayerProps> = ({ page, zoom }) => {
  const [links, setLinks] = useState<PdfLink[]>([]);
  const viewport = page.getViewport({ scale: zoom });

  useEffect(() => {
    let cancelled = false;
    const fetchAnnotations = async () => {
      try {
        const annotations = await page.getAnnotations();
        if (cancelled) return;
        
        const linkAnns = annotations.filter((ann: any) => ann.subtype === 'Link');
        setLinks(linkAnns);
      } catch (err) {
        console.error("Failed to load PDF links", err);
      }
    };
    fetchAnnotations();
    return () => { cancelled = true; };
  }, [page]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 4 }}>
      {links.map((link) => {
        const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(link.rect);
        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);
        
        return (
          <a
            key={link.id}
            href={link.url || '#'}
            target={link.url ? "_blank" : undefined}
            rel="noopener noreferrer"
            title={link.url}
            onClick={(e) => {
              if (!link.url) {
                // Internal PDF links (dest) aren't fully supported without a LinkService yet
                e.preventDefault();
              }
            }}
            style={{
              position: 'absolute',
              left,
              top,
              width,
              height,
              pointerEvents: 'auto',
              cursor: 'pointer',
              backgroundColor: 'transparent'
            }}
          />
        );
      })}
    </div>
  );
};
