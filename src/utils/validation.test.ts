import { describe, it, expect } from 'vitest';
import { validatePdfData } from './validation';

describe('validatePdfData', () => {
  it('should return true for valid PDF bytes', () => {
    const validData = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]); // %PDF-
    expect(validatePdfData(validData)).toBe(true);
  });

  it('should return false for invalid data', () => {
    const invalidData = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    expect(validatePdfData(invalidData)).toBe(false);
  });

  it('should return false for empty or short data', () => {
    expect(validatePdfData(new Uint8Array([]))).toBe(false);
    expect(validatePdfData(new Uint8Array([0x25, 0x50]))).toBe(false);
  });
});
