import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useAnnotationStore } from '../../store/annotationStore';
import { Upload, X, Check, Edit2, Image as ImageIcon, RotateCcw } from 'lucide-react';
import './Modals.css';

export const SignatureModal: React.FC = () => {
  const { signatureModalOpen, setSignatureModalOpen, currentPage } = useUIStore();
  const { addAnnotation } = useAnnotationStore();
  
  const [activeTab, setActiveTab] = useState<'upload' | 'draw'>('upload');
  
  // Upload State
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [threshold, setThreshold] = useState<number>(200);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processCanvasRef = useRef<HTMLCanvasElement>(null);

  // Draw State
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (signatureModalOpen && activeTab === 'draw') {
      initDrawCanvas();
    }
  }, [signatureModalOpen, activeTab]);

  const initDrawCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set fixed internal resolution for sharpness
    canvas.width = 600;
    canvas.height = 300;
    
    // Clear it
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        processImage(img, threshold);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const processImage = (img: HTMLImageElement, currentThreshold: number) => {
    const canvas = processCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Downsample large images to prevent OOM
    const MAX_WIDTH = 800;
    const MAX_HEIGHT = 800;
    let width = img.width;
    let height = img.height;
    
    if (width > MAX_WIDTH) {
      height = Math.round(height * (MAX_WIDTH / width));
      width = MAX_WIDTH;
    }
    if (height > MAX_HEIGHT) {
      width = Math.round(width * (MAX_HEIGHT / height));
      height = MAX_HEIGHT;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;

        if (brightness > currentThreshold) {
          data[i + 3] = 0;
        } else {
          data[i + 3] = 255; 
        }
      }

      ctx.putImageData(imageData, 0, 0);
      setProcessedImage(canvas.toDataURL('image/png'));
    } catch (err) {
      console.error("Failed to process signature image:", err);
      useUIStore.getState().addToast("Security Error: Cannot process cross-origin or tainted image.", "error");
      setProcessedImage(null);
    }
  };

  useEffect(() => {
    if (originalImage && activeTab === 'upload') {
      processImage(originalImage, threshold);
    }
  }, [threshold, originalImage]);

  // Drawing Handlers
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getDrawnImage = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  };

  const handleInsert = () => {
    const signatureImage = activeTab === 'upload' ? processedImage : getDrawnImage();
    
    if (signatureImage) {
      addAnnotation({
        type: 'signature',
        page: currentPage,
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        content: signatureImage,
      });
    }
    closeModal();
  };

  const closeModal = () => {
    setSignatureModalOpen(false);
    setProcessedImage(null);
    setOriginalImage(null);
    setHasDrawn(false);
  };

  const isReady = activeTab === 'upload' ? !!processedImage : hasDrawn;

  if (!signatureModalOpen) return null;

  return (
    <div className="modal-overlay" onClick={closeModal} style={{ zIndex: 1000 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, width: '90%' }}>
        <h2>Create Signature</h2>
        
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
          <button 
            onClick={() => setActiveTab('upload')} 
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', border: 'none', background: activeTab === 'upload' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'upload' ? 'white' : 'var(--text-color)', borderRadius: 20, cursor: 'pointer', fontWeight: 600 }}
          >
            <ImageIcon size={16} /> Upload Photo
          </button>
          <button 
            onClick={() => setActiveTab('draw')} 
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', border: 'none', background: activeTab === 'draw' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'draw' ? 'white' : 'var(--text-color)', borderRadius: 20, cursor: 'pointer', fontWeight: 600 }}
          >
            <Edit2 size={16} /> Draw Signature
          </button>
        </div>
        
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          
          {activeTab === 'upload' && (
            <>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleImageUpload}
              />

              {!processedImage ? (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '40px 60px', borderRadius: 12, border: '2px dashed var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}
                >
                  <Upload size={32} style={{ color: 'var(--primary-color)' }} />
                  <span>Upload Signature Image</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>We will automatically extract the ink.</span>
                </button>
              ) : (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: 'white', padding: 20, borderRadius: 8, border: '1px solid var(--border-color)', width: '100%', backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }}>
                    <img src={processedImage} alt="Processed Signature" style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 12 }}>
                      <span>Background Removal Strictness</span>
                      <span>{threshold}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="255" 
                      value={threshold} 
                      onChange={(e) => setThreshold(parseInt(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              )}
              <canvas ref={processCanvasRef} style={{ display: 'none' }} />
            </>
          )}

          {activeTab === 'draw' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div 
                style={{ 
                  width: '100%', 
                  height: 300, 
                  background: '#f8f9fa', 
                  borderRadius: 12, 
                  border: '2px solid var(--border-color)',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <canvas 
                  ref={drawCanvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={initDrawCanvas}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}
                >
                  <RotateCcw size={14} /> Clear Canvas
                </button>
              </div>
            </div>
          )}
          
        </div>

        <div className="modal-actions" style={{ marginTop: 32 }}>
          <button className="modal-close" onClick={closeModal}>
            <X size={16} style={{ marginRight: 8 }} /> Cancel
          </button>
          <button className="modal-confirm" onClick={handleInsert} disabled={!isReady} style={{ background: 'var(--primary-color)', opacity: !isReady ? 0.5 : 1 }}>
            <Check size={16} style={{ marginRight: 8 }} /> Insert Signature
          </button>
        </div>
      </div>
    </div>
  );
};
