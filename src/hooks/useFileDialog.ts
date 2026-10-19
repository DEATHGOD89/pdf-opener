import { useCallback } from 'react';
import { open } from '@tauri-apps/api/dialog';
import { readBinaryFile } from '@tauri-apps/api/fs';
import { invoke } from '@tauri-apps/api/tauri';

async function readFileBytes(path: string): Promise<Uint8Array> {
  try {
    const rawBytes = await invoke<number[]>('read_file_binary', { path });
    return new Uint8Array(rawBytes);
  } catch {
    return await readBinaryFile(path);
  }
}

/**
 * Ensures image data is standard PNG or JPG for lossless pdf-lib embedding.
 * Converts WEBP or other formats via canvas.
 */
async function normalizeImageForPdf(
  bytes: Uint8Array,
  fileName: string
): Promise<{ data: Uint8Array; format: 'png' | 'jpg' }> {
  // Check PNG magic bytes: 0x89 0x50 0x4E 0x47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return { data: bytes, format: 'png' };
  }
  // Check JPEG magic bytes: 0xFF 0xD8 0xFF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { data: bytes, format: 'jpg' };
  }

  // Convert via HTML Canvas for 100% compatibility (e.g. webp, bmp)
  return new Promise((resolve, reject) => {
    const blob = new Blob([bytes.buffer as ArrayBuffer]);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error(`Could not create canvas context for ${fileName}`));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(async (b) => {
        if (!b) {
          reject(new Error(`Failed to encode image ${fileName}`));
          return;
        }
        const arrayBuf = await b.arrayBuffer();
        resolve({ data: new Uint8Array(arrayBuf), format: 'png' });
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to decode image file ${fileName}`));
    };
    img.src = url;
  });
}

export function useFileDialog() {
  const pickPDF = useCallback(async (): Promise<{ path: string; data: Uint8Array } | null> => {
    const selected = await open({
      title: 'Open PDF',
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      multiple: false,
    });

    if (!selected) return null;

    const path = selected as string;
    const data = await readFileBytes(path);

    if (data.length > 50 * 1024 * 1024) {
      throw new Error(`File exceeds 50MB limit. Current size: ${(data.length / 1024 / 1024).toFixed(1)}MB`);
    }

    return { path, data };
  }, []);

  const pickPDFs = useCallback(async (): Promise<{ path: string; data: Uint8Array }[]> => {
    const selected = await open({
      title: 'Select PDF Files to Combine',
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      multiple: true,
    });

    if (!selected) return [];

    const paths = Array.isArray(selected) ? selected : [selected];
    const results: { path: string; data: Uint8Array }[] = [];

    for (const path of paths) {
      const data = await readFileBytes(path);
      results.push({ path, data });
    }

    return results;
  }, []);

  const pickImages = useCallback(async (): Promise<{ path: string; data: Uint8Array; format: 'png' | 'jpg' }[]> => {
    const selected = await open({
      title: 'Select Images to Combine into PDF',
      filters: [{ name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }],
      multiple: true,
    });

    if (!selected) return [];

    const paths = Array.isArray(selected) ? selected : [selected];
    const results: { path: string; data: Uint8Array; format: 'png' | 'jpg' }[] = [];

    for (const path of paths) {
      const rawBytes = await readFileBytes(path);
      const fileName = path.split('\\').pop() || path.split('/').pop() || path;
      const normalized = await normalizeImageForPdf(rawBytes, fileName);
      results.push({ path, ...normalized });
    }

    return results;
  }, []);

  const pickDirectory = useCallback(async (): Promise<string | null> => {
    const selected = await open({
      title: 'Select Folder to Save Split PDF Pages',
      directory: true,
      multiple: false,
    });

    if (!selected) return null;
    return selected as string;
  }, []);

  return { pickPDF, pickPDFs, pickImages, pickDirectory };
}
