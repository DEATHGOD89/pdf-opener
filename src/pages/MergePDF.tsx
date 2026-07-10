import React, { useState } from 'react';

import { PDFDocument } from 'pdf-lib';
import { Layers, Upload, Save, Loader2 } from 'lucide-react';
import { ToolPageLayout } from '../components/Common/ToolPageLayout';

export const MergePDF: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      const oversized = selected.find(f => f.size > 50 * 1024 * 1024);
      if (oversized) {
        setError(`File "${oversized.name}" exceeds the 50MB limit.`);
        setFiles([]);
        return;
      }
      setFiles(selected);
    }
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      setError("Please select at least 2 PDF files to merge.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      
      // Trigger download
      const blob = new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'merged_document.pdf';
      a.click();
      URL.revokeObjectURL(url);
      
    } catch (err: any) {
      console.error(err);
      setError("Failed to merge PDFs. Please ensure they are valid PDF files.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageLayout
      icon={<Layers size={48} />}
      title="Merge PDF"
      description="Combine multiple PDFs into one unified document."
    >

        <div style={{ background: 'var(--surface-2)', border: '2px dashed var(--border-color)', borderRadius: 16, padding: 60, marginBottom: 24 }}>
          <Upload size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <h3 style={{ marginBottom: 16 }}>Select PDF files</h3>
          <input 
            type="file" 
            multiple 
            accept="application/pdf"
            onChange={handleFileChange}
            style={{ display: 'block', margin: '0 auto', color: 'var(--text-color)' }}
          />
        </div>

        {files.length > 0 && (
          <div style={{ textAlign: 'left', background: 'var(--surface-1)', padding: 24, borderRadius: 12, marginBottom: 24 }}>
            <h4 style={{ margin: '0 0 16px 0' }}>Files to merge ({files.length}):</h4>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {files.map((f, i) => (
                <li key={i} style={{ marginBottom: 8, color: 'var(--text-muted)' }}>{f.name}</li>
              ))}
            </ul>
          </div>
        )}

        {error && <div style={{ color: '#ef4444', marginBottom: 24 }}>{error}</div>}

        <button 
          onClick={handleMerge}
          disabled={isProcessing || files.length < 2}
          style={{ 
            background: '#f43f5e', color: 'white', padding: '16px 32px', 
            borderRadius: 100, fontSize: 18, fontWeight: 600, border: 'none', 
            cursor: (isProcessing || files.length < 2) ? 'not-allowed' : 'pointer',
            opacity: (isProcessing || files.length < 2) ? 0.5 : 1,
            display: 'inline-flex', alignItems: 'center', gap: 12
          }}
        >
          {isProcessing ? <Loader2 className="spinner-loader" /> : <Save />}
          {isProcessing ? 'Merging...' : 'Merge PDFs Now'}
        </button>
    </ToolPageLayout>
  );
};
