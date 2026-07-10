import React, { useState } from 'react';

import { PDFDocument } from 'pdf-lib';
import { SplitSquareHorizontal, Upload, Save, Loader2 } from 'lucide-react';
import { ToolPageLayout } from '../components/Common/ToolPageLayout';

export const SplitPDF: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (f.size > 50 * 1024 * 1024) {
        setError(`File "${f.name}" exceeds the 50MB limit.`);
        setFile(null);
        return;
      }
      setFile(f);
    }
  };

  const handleSplit = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const totalPages = pdf.getPageCount();

      if (startPage < 1 || endPage > totalPages || startPage > endPage) {
        setError(`Invalid page range. The document has ${totalPages} pages.`);
        setIsProcessing(false);
        return;
      }

      const splitPdf = await PDFDocument.create();
      // getPageIndices expects 0-based array of indices
      const indices: number[] = [];
      for (let i = startPage - 1; i <= endPage - 1; i++) {
        indices.push(i);
      }

      const copiedPages = await splitPdf.copyPages(pdf, indices);
      copiedPages.forEach((page) => splitPdf.addPage(page));

      const splitPdfBytes = await splitPdf.save();
      
      // Trigger download
      const blob = new Blob([new Uint8Array(splitPdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `split_${startPage}_to_${endPage}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
    } catch (err: any) {
      console.error(err);
      setError("Failed to split PDF. Please ensure the file is valid.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageLayout
      icon={<SplitSquareHorizontal size={48} />}
      title="Split PDF"
      description="Extract specific pages into a new PDF document."
    >

        <div style={{ background: 'var(--surface-2)', border: '2px dashed var(--border-color)', borderRadius: 16, padding: 60, marginBottom: 24 }}>
          <Upload size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <h3 style={{ marginBottom: 16 }}>Select a PDF file</h3>
          <input 
            type="file" 
            accept="application/pdf"
            onChange={handleFileChange}
            style={{ display: 'block', margin: '0 auto', color: 'var(--text-color)' }}
          />
        </div>

        {file && (
          <div style={{ textAlign: 'left', background: 'var(--surface-1)', padding: 24, borderRadius: 12, marginBottom: 24, display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 8px 0' }}>Selected File:</h4>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>{file.name}</p>
            </div>
            
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Start Page</label>
                <input 
                  type="number" 
                  min={1} 
                  value={startPage} 
                  onChange={e => setStartPage(parseInt(e.target.value) || 1)}
                  style={{ width: 80, padding: 8, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--surface-2)', color: 'white' }}
                />
              </div>
              <span style={{ marginTop: 20 }}>to</span>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>End Page</label>
                <input 
                  type="number" 
                  min={1} 
                  value={endPage} 
                  onChange={e => setEndPage(parseInt(e.target.value) || 1)}
                  style={{ width: 80, padding: 8, borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--surface-2)', color: 'white' }}
                />
              </div>
            </div>
          </div>
        )}

        {error && <div style={{ color: '#ef4444', marginBottom: 24 }}>{error}</div>}

        <button 
          onClick={handleSplit}
          disabled={isProcessing || !file}
          style={{ 
            background: '#f43f5e', color: 'white', padding: '16px 32px', 
            borderRadius: 100, fontSize: 18, fontWeight: 600, border: 'none', 
            cursor: (isProcessing || !file) ? 'not-allowed' : 'pointer',
            opacity: (isProcessing || !file) ? 0.5 : 1,
            display: 'inline-flex', alignItems: 'center', gap: 12
          }}
        >
          {isProcessing ? <Loader2 className="spinner-loader" /> : <Save />}
          {isProcessing ? 'Splitting...' : 'Split PDF Now'}
        </button>
    </ToolPageLayout>
  );
};
