import { PDFDocument, degrees } from 'pdf-lib';

/**
 * Extracts specified pages from a PDF and returns a single PDF containing only those pages.
 */
export async function extractPagesToSinglePdf(
  sourcePdfBytes: Uint8Array,
  pageNumbers1Based: number[]
): Promise<Uint8Array> {
  if (!pageNumbers1Based || pageNumbers1Based.length === 0) {
    throw new Error('No pages selected to extract.');
  }

  const srcDoc = await PDFDocument.load(sourcePdfBytes.slice());
  const newDoc = await PDFDocument.create();
  const totalPages = srcDoc.getPageCount();

  // Validate and deduplicate indices
  const validIndices = Array.from(new Set(pageNumbers1Based))
    .filter(p => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b)
    .map(p => p - 1);

  if (validIndices.length === 0) {
    throw new Error('Selected pages are out of document range.');
  }

  const copiedPages = await newDoc.copyPages(srcDoc, validIndices);
  copiedPages.forEach(page => newDoc.addPage(page));

  return await newDoc.save();
}

/**
 * Extracts specified pages into separate individual single-page PDFs.
 */
export async function extractPagesToSeparatePdfs(
  sourcePdfBytes: Uint8Array,
  pageNumbers1Based: number[]
): Promise<{ pageNum: number; data: Uint8Array }[]> {
  if (!pageNumbers1Based || pageNumbers1Based.length === 0) {
    throw new Error('No pages selected to split.');
  }

  const srcDoc = await PDFDocument.load(sourcePdfBytes.slice());
  const totalPages = srcDoc.getPageCount();

  const validPages = Array.from(new Set(pageNumbers1Based))
    .filter(p => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  if (validPages.length === 0) {
    throw new Error('Selected pages are out of document range.');
  }

  const results: { pageNum: number; data: Uint8Array }[] = [];

  for (const pageNum of validPages) {
    const singleDoc = await PDFDocument.create();
    const [copiedPage] = await singleDoc.copyPages(srcDoc, [pageNum - 1]);
    singleDoc.addPage(copiedPage);
    const data = await singleDoc.save();
    results.push({ pageNum, data });
  }

  return results;
}

/**
 * Deletes specified pages from a PDF document.
 * Must leave at least one page in the document.
 */
export async function deletePagesFromPdf(
  sourcePdfBytes: Uint8Array,
  pageNumbers1Based: number[]
): Promise<Uint8Array> {
  if (!pageNumbers1Based || pageNumbers1Based.length === 0) {
    throw new Error('No pages selected to delete.');
  }

  const doc = await PDFDocument.load(sourcePdfBytes.slice());
  const totalPages = doc.getPageCount();

  const validIndices = Array.from(new Set(pageNumbers1Based))
    .filter(p => p >= 1 && p <= totalPages)
    .sort((a, b) => b - a) // Descending order so index shifts don't affect subsequent deletions!
    .map(p => p - 1);

  if (validIndices.length === 0) {
    throw new Error('Selected pages are out of document range.');
  }

  if (validIndices.length >= totalPages) {
    throw new Error('Cannot delete all pages. A PDF must have at least one page.');
  }

  for (const idx of validIndices) {
    doc.removePage(idx);
  }

  return await doc.save();
}

/**
 * Combines another PDF into the current PDF at the specified position.
 */
export async function combineWithPdf(
  targetPdfBytes: Uint8Array | null,
  donorPdfBytes: Uint8Array,
  insertAfterPage1Based?: number
): Promise<Uint8Array> {
  const donorDoc = await PDFDocument.load(donorPdfBytes.slice());

  if (!targetPdfBytes) {
    return await donorDoc.save();
  }

  const targetDoc = await PDFDocument.load(targetPdfBytes.slice());
  const copiedPages = await targetDoc.copyPages(donorDoc, donorDoc.getPageIndices());
  const currentTotal = targetDoc.getPageCount();

  if (insertAfterPage1Based === 0) {
    // Insert at beginning
    let insertIdx = 0;
    for (const page of copiedPages) {
      targetDoc.insertPage(insertIdx++, page);
    }
  } else if (
    insertAfterPage1Based === undefined ||
    insertAfterPage1Based >= currentTotal
  ) {
    // Append at end
    for (const page of copiedPages) {
      targetDoc.addPage(page);
    }
  } else {
    // Insert after the specified page
    let insertIdx = insertAfterPage1Based;
    for (const page of copiedPages) {
      targetDoc.insertPage(insertIdx++, page);
    }
  }

  return await targetDoc.save();
}

/**
 * Inserts one or more image files as new pages into the PDF document.
 */
export async function combineWithImages(
  targetPdfBytes: Uint8Array | null,
  images: { data: Uint8Array; format: 'png' | 'jpg' | 'jpeg' }[],
  insertAfterPage1Based?: number
): Promise<Uint8Array> {
  if (!images || images.length === 0) {
    throw new Error('No images provided to combine.');
  }

  let doc: PDFDocument;
  if (targetPdfBytes) {
    doc = await PDFDocument.load(targetPdfBytes.slice());
  } else {
    doc = await PDFDocument.create();
  }

  const currentTotal = doc.getPageCount();
  let insertIdx =
    insertAfterPage1Based === 0
      ? 0
      : insertAfterPage1Based === undefined || insertAfterPage1Based >= currentTotal
      ? currentTotal
      : insertAfterPage1Based;

  for (const img of images) {
    let embeddedImg;
    if (img.format === 'png') {
      embeddedImg = await doc.embedPng(img.data);
    } else {
      embeddedImg = await doc.embedJpg(img.data);
    }

    const { width, height } = embeddedImg.scale(1);
    const newPage =
      insertIdx >= doc.getPageCount()
        ? doc.addPage([width, height])
        : doc.insertPage(insertIdx, [width, height]);

    newPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width,
      height,
    });

    insertIdx++;
  }

  return await doc.save();
}

/**
 * Rotates specified pages by angleDelta (e.g. +90 or -90).
 */
export async function rotatePagesInPdf(
  sourcePdfBytes: Uint8Array,
  pageNumbers1Based: number[],
  angleDelta: number
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(sourcePdfBytes.slice());
  const totalPages = doc.getPageCount();

  const validPages = Array.from(new Set(pageNumbers1Based)).filter(
    p => p >= 1 && p <= totalPages
  );

  for (const pageNum of validPages) {
    const page = doc.getPage(pageNum - 1);
    const currentAngle = page.getRotation().angle;
    const newAngle = ((currentAngle + angleDelta) % 360 + 360) % 360;
    page.setRotation(degrees(newAngle));
  }

  return await doc.save();
}

/**
 * Reorders the pages in a PDF document based on a new 1-based order array.
 */
export async function reorderPagesInPdf(
  sourcePdfBytes: Uint8Array,
  newOrder1Based: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(sourcePdfBytes.slice());
  const totalPages = srcDoc.getPageCount();

  const validIndices = newOrder1Based
    .filter(p => p >= 1 && p <= totalPages)
    .map(p => p - 1);

  if (validIndices.length !== totalPages) {
    throw new Error('New page order must include all pages in the document.');
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, validIndices);
  copiedPages.forEach(page => newDoc.addPage(page));

  return await newDoc.save();
}
