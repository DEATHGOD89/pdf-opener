import React, { useEffect, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { open as openBrowser } from '@tauri-apps/api/shell';

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

function isSafeExternalUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('mailto:');
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
        
        const isSafe = isSafeExternalUrl(link.url);

        return (
          <a
            key={link.id}
            href={isSafe ? link.url : undefined}
            title={link.url}
            onClick={async (e) => {
              e.preventDefault();
              if (link.url && isSafe) {
                try {
                  await openBrowser(link.url);
                } catch (err) {
                  console.error("Failed to open external link:", err);
                }
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
