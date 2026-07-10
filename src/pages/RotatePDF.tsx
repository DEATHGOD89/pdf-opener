import React, { useState } from 'react';

import { PDFDocument, degrees } from 'pdf-lib';
import { RefreshCw, Upload, Save, Loader2 } from 'lucide-react';
import { ToolPageLayout } from '../components/Common/ToolPageLayout';

export const RotatePDF: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [rotation, setRotation] = useState<number>(90);
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

  const handleRotate = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = pdf.getPages();

      for (const page of pages) {
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees(currentRotation + rotation));
      }

      const rotatedPdfBytes = await pdf.save();
      
      // Trigger download
      const blob = new Blob([new Uint8Array(rotatedPdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rotated_${rotation}deg.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
    } catch (err: any) {
      console.error(err);
      setError("Failed to rotate PDF. Please ensure the file is valid.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageLayout
      icon={<RefreshCw size={48} />}
      title="Rotate PDF"
      description="Rotate all pages or specific pages in a PDF document."
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
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Rotation Angle</label>
                <select 
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  style={{ width: 120, padding: '8px 12px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--surface-2)', color: 'white' }}
                >
                  <option value={90}>90° Right</option>
                  <option value={180}>180°</option>
                  <option value={270}>90° Left</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {error && <div style={{ color: '#ef4444', marginBottom: 24 }}>{error}</div>}

        <button 
          onClick={handleRotate}
          disabled={isProcessing || !file}
          style={{ 
            background: '#10b981', color: 'white', padding: '16px 32px', 
            borderRadius: 100, fontSize: 18, fontWeight: 600, border: 'none', 
            cursor: (isProcessing || !file) ? 'not-allowed' : 'pointer',
            opacity: (isProcessing || !file) ? 0.5 : 1,
            display: 'inline-flex', alignItems: 'center', gap: 12
          }}
        >
          {isProcessing ? <Loader2 className="spinner-loader" /> : <Save />}
          {isProcessing ? 'Rotating...' : 'Rotate PDF Now'}
        </button>
    </ToolPageLayout>
  );
};
