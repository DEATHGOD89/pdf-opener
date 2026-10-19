import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { Annotation } from '../store/annotationStore';

function hexToRgb(hex?: string) {
  if (!hex || hex === 'transparent') return rgb(0, 0, 0);
  const clean = hex.replace('#', '');
  if (clean.length < 6) return rgb(0, 0, 0);
  return rgb(
    parseInt(clean.substring(0, 2), 16) / 255,
    parseInt(clean.substring(2, 4), 16) / 255,
    parseInt(clean.substring(4, 6), 16) / 255
  );
}

export const saveAnnotatedPDF = async (originalBytes: Uint8Array, annotations: Annotation[]) => {
  const pdfDoc = await PDFDocument.load(originalBytes);
  const pages = pdfDoc.getPages();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const ann of annotations) {
    const pageIndex = ann.page - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    
    const page = pages[pageIndex];
    const { width, height } = page.getSize(); // Gets logical size
    const rotation = page.getRotation().angle;
    
    // Convert UI coordinates (top-left) to PDF internal coordinates (bottom-left)
    // Basic mapping handling 0 degrees. Advanced mapping can be expanded here.
    let pdfX = ann.x;
    let pdfY = height - ann.y;

    if (rotation === 90) {
      pdfX = ann.y;
      pdfY = ann.x;
    } else if (rotation === 180) {
      pdfX = width - ann.x;
      pdfY = ann.y;
    } else if (rotation === 270) {
      pdfX = height - ann.y;
      pdfY = width - ann.x;
    }

    try {
      if (ann.type === 'text' && ann.content) {
        page.drawText(ann.content, {
          x: pdfX,
          y: pdfY - 16,
          size: 16,
          font: helveticaFont,
          color: hexToRgb(ann.color),
          rotate: degrees(-rotation),
        });
      } else if (ann.type === 'highlight' && ann.width && ann.height) {
        page.drawRectangle({
          x: pdfX,
          y: pdfY - ann.height,
          width: ann.width,
          height: ann.height,
          color: hexToRgb(ann.color || '#ffff00'),
          opacity: 0.3,
          rotate: degrees(-rotation),
        });
      } else if (ann.type === 'signature' && ann.content && (ann.content.startsWith('data:image/png;base64,') || ann.content.startsWith('data:image/jpeg;base64,'))) {
        const imageBytes = await fetch(ann.content).then(res => res.arrayBuffer());
        let image;
        if (ann.content.includes('image/png')) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          image = await pdfDoc.embedJpg(imageBytes);
        }
        
        page.drawImage(image, {
          x: pdfX,
          y: pdfY - (ann.height || 100),
          width: ann.width || 200,
          height: ann.height || 100,
          rotate: degrees(-rotation),
        });
      } else if (ann.type === 'pen' && ann.points && ann.points.length > 0) {
        const startPoint = ann.points[0];
        let svgPath = `M ${startPoint.x} ${height - startPoint.y}`;
        for (let i = 1; i < ann.points.length; i++) {
          const p = ann.points[i];
          svgPath += ` L ${p.x} ${height - p.y}`;
        }
        page.drawSvgPath(svgPath, {
          borderColor: hexToRgb(ann.color),
          borderWidth: ann.strokeWidth || 2,
        });
      }
    } catch (err: any) {
      console.error(`Failed to burn annotation ${ann.id} into PDF:`, err);
      // Re-throw so the UI can catch and display exactly why it failed (e.g. Unsupported Unicode characters)
      throw new Error(`Failed to save annotation: ${err.message || err}`);
    }
  }

  const modifiedBytes = await pdfDoc.save();
  return new Uint8Array(modifiedBytes);
};
