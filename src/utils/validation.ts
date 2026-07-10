export function validatePdfData(data: Uint8Array): boolean {
  if (data.length < 4) return false;
  // Check for %PDF- magic number
  return data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46;
}
