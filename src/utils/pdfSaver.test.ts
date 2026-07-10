import { describe, it, expect } from 'vitest';
import { saveAnnotatedPDF } from './pdfSaver';

describe('pdfSaver', () => {
  it('should have a saveAnnotatedPDF function', () => {
    expect(typeof saveAnnotatedPDF).toBe('function');
  });
});
