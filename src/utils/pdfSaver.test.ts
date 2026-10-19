import { describe, it, expect } from 'vitest';
import { saveAnnotatedPDF } from './pdfSaver';
import { PDFDocument } from 'pdf-lib';
import { validatePdfData } from './validation';

describe('pdfSaver', () => {
  it('should have a saveAnnotatedPDF function', () => {
    expect(typeof saveAnnotatedPDF).toBe('function');
  });

  it('should burn annotations into a PDF and return valid modified PDF bytes', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([600, 800]);
    const pdfBytes = await doc.save();

    const annotations = [
      {
        id: '1',
        type: 'highlight' as const,
        page: 1,
        x: 50,
        y: 100,
        width: 200,
        height: 30,
        color: '#ffea00',
      },
      {
        id: '2',
        type: 'text' as const,
        page: 1,
        x: 50,
        y: 150,
        content: 'Hello World',
        color: '#000000',
      },
      {
        id: '3',
        type: 'pen' as const,
        page: 1,
        x: 50,
        y: 200,
        points: [{ x: 50, y: 200 }, { x: 80, y: 220 }, { x: 120, y: 200 }],
        color: '#ff0000',
        strokeWidth: 3,
      }
    ];

    const result = await saveAnnotatedPDF(pdfBytes, annotations);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(validatePdfData(result)).toBe(true);

    const reloaded = await PDFDocument.load(result);
    expect(reloaded.getPageCount()).toBe(1);
  });
});
