import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  extractPagesToSinglePdf,
  extractPagesToSeparatePdfs,
  deletePagesFromPdf,
  combineWithPdf,
  combineWithImages,
  rotatePagesInPdf,
  reorderPagesInPdf,
} from './pdfPageOperations';
import { validatePdfData } from './validation';

async function createSamplePdf(numPages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= numPages; i++) {
    const page = doc.addPage([500, 700]);
    // Draw some page number info
    page.drawText(`Page ${i}`);
  }
  return await doc.save();
}

describe('pdfPageOperations', () => {
  it('extractPagesToSinglePdf: extracts selected pages into 1 PDF', async () => {
    const src = await createSamplePdf(5);
    const extracted = await extractPagesToSinglePdf(src, [2, 4]);

    expect(validatePdfData(extracted)).toBe(true);
    const resDoc = await PDFDocument.load(extracted);
    expect(resDoc.getPageCount()).toBe(2);
  });

  it('extractPagesToSeparatePdfs: splits selected pages into individual files', async () => {
    const src = await createSamplePdf(3);
    const results = await extractPagesToSeparatePdfs(src, [1, 3]);

    expect(results.length).toBe(2);
    expect(results[0].pageNum).toBe(1);
    expect(results[1].pageNum).toBe(3);

    const doc1 = await PDFDocument.load(results[0].data);
    expect(doc1.getPageCount()).toBe(1);

    const doc2 = await PDFDocument.load(results[1].data);
    expect(doc2.getPageCount()).toBe(1);
  });

  it('deletePagesFromPdf: removes selected pages and keeps remaining', async () => {
    const src = await createSamplePdf(4);
    const updated = await deletePagesFromPdf(src, [2, 3]);

    const resDoc = await PDFDocument.load(updated);
    expect(resDoc.getPageCount()).toBe(2);
  });

  it('deletePagesFromPdf: throws error when attempting to delete all pages', async () => {
    const src = await createSamplePdf(2);
    await expect(deletePagesFromPdf(src, [1, 2])).rejects.toThrow(
      'Cannot delete all pages'
    );
  });

  it('combineWithPdf: merges donor pages at the end of target', async () => {
    const target = await createSamplePdf(2);
    const donor = await createSamplePdf(3);

    const combined = await combineWithPdf(target, donor);
    const resDoc = await PDFDocument.load(combined);
    expect(resDoc.getPageCount()).toBe(5);
  });

  it('combineWithPdf: inserts donor pages after specified page', async () => {
    const target = await createSamplePdf(2);
    const donor = await createSamplePdf(1);

    const combined = await combineWithPdf(target, donor, 1);
    const resDoc = await PDFDocument.load(combined);
    expect(resDoc.getPageCount()).toBe(3);
  });

  it('rotatePagesInPdf: rotates specified pages by angle delta', async () => {
    const src = await createSamplePdf(2);
    const rotated = await rotatePagesInPdf(src, [1], 90);

    const resDoc = await PDFDocument.load(rotated);
    expect(resDoc.getPage(0).getRotation().angle).toBe(90);
    expect(resDoc.getPage(1).getRotation().angle).toBe(0);
  });

  it('combineWithImages: embeds images as new pages into PDF', async () => {
    const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const tinyPngBytes = Uint8Array.from(atob(tinyPngBase64), c => c.charCodeAt(0));

    const target = await createSamplePdf(1);
    const combined = await combineWithImages(target, [{ data: tinyPngBytes, format: 'png' }]);

    const resDoc = await PDFDocument.load(combined);
    expect(resDoc.getPageCount()).toBe(2);
  });

  it('reorderPagesInPdf: changes the order of pages correctly', async () => {
    const src = await createSamplePdf(3);
    const reordered = await reorderPagesInPdf(src, [3, 1, 2]);

    const resDoc = await PDFDocument.load(reordered);
    expect(resDoc.getPageCount()).toBe(3);
  });
});
