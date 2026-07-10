import { describe, it, expect } from 'vitest';
import { hexToRgb } from './colorUtils';

describe('hexToRgb', () => {
  it('should convert standard hex colors to rgb', () => {
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('should handle shorthand hex colors', () => {
    expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('should return null for invalid hex strings', () => {
    expect(hexToRgb('invalid')).toBeNull();
    expect(hexToRgb('#zzzzzz')).toBeNull();
    expect(hexToRgb('#12')).toBeNull();
  });
});
