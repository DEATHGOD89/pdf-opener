import { useCallback } from 'react';
import { open } from '@tauri-apps/api/dialog';
import { readBinaryFile } from '@tauri-apps/api/fs';

export function useFileDialog() {
  const pickPDF = useCallback(async (): Promise<{ path: string; data: Uint8Array } | null> => {
    const selected = await open({
      title: 'Open PDF',
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      multiple: false,
    });

    if (!selected) return null;

    const path = selected as string;
    const data = await readBinaryFile(path);
    
    // Enforce 50MB limit to prevent V8 OOM
    if (data.length > 50 * 1024 * 1024) {
      throw new Error(`File exceeds 50MB limit. Current size: ${(data.length / 1024 / 1024).toFixed(1)}MB`);
    }
    
    return { path, data };
  }, []);

  return { pickPDF };
}
