import React, { useState, useRef, useEffect } from 'react';
import { useToolStore } from '../../store/toolStore';
import { useAnnotationStore } from '../../store/annotationStore';
import { useUIStore } from '../../store/uiStore';
import { TextFormatToolbar } from '../Toolbar/TextFormatToolbar';
import { Move } from 'lucide-react';
import './AnnotationLayer.css';

interface AnnotationLayerProps {
  pageNum: number;
  zoom: number;
  width: number;
  height: number;
}

export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({ pageNum, zoom, width, height }) => {
  const { selectedTool, selectedColor, selectedFont, selectedFontSize } = useToolStore();
  const { annotations, addAnnotation, removeAnnotation, updateAnnotation } = useAnnotationStore();
  
  const layerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const [currentPos, setCurrentPos] = useState<{x: number, y: number} | null>(null);
  const [currentPoints, setCurrentPoints] = useState<{x: number, y: number}[]>([]);
  
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{x: number, y: number} | null>(null);
  const dragCurrentPosRef = useRef<{x: number, y: number} | null>(null);
  
  const [textInput, setTextInput] = useState<{x: number, y: number, editId?: string} | null>(null);
  const [textValue, setTextValue] = useState('');
  const [hoveredAnn, setHoveredAnn] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const pageAnnotations = annotations.filter(a => a.page === pageNum);

  // Focus input when text tool creates a box
  useEffect(() => {
    if (textInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [textInput]);

  const getRelativeCoords = (e: React.PointerEvent) => {
    if (!layerRef.current) return { x: 0, y: 0 };
    const rect = layerRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (selectedTool === 'select' || selectedTool === 'hand') return;
    
    // Left click only
    if (e.button !== 0) return;
    
    // Don't trigger if clicking on an existing annotation, delete button, or input (let it handle its own events)
    const target = e.target as HTMLElement;
    if (
      target.closest('.annotation-item') || 
      target.closest('.delete-btn') || 
      target.tagName.toLowerCase() === 'textarea' || 
      target.tagName.toLowerCase() === 'input'
    ) {
      return;
    }

    const coords = getRelativeCoords(e);

    if (selectedTool === 'highlight') {
      setIsDrawing(true);
      setStartPos(coords);
      setCurrentPos(coords);
    } else if (selectedTool === 'pen') {
      setIsDrawing(true);
      setCurrentPoints([coords]);
    } else if (selectedTool === 'eraser') {
      setIsDrawing(true);
      eraseAt(coords);
    } else if (selectedTool === 'text') {
      if (textInput) {
        saveTextAnnotation(); // Save previous if clicking elsewhere
      } else {
        setTextInput(coords);
        setTextValue('');
      }
    } else if (selectedTool === 'signature') {
      useUIStore.getState().setSignatureModalOpen(true);
    }
  };

  const eraseAt = (coords: {x: number, y: number}) => {
    // Simple hit testing for eraser based on zoomed coordinates
    // We check all page annotations and if they intersect a small radius around coords, we remove them
    const radius = 10 / zoom;
    pageAnnotations.forEach(ann => {
      if (ann.type === 'highlight' && ann.width && ann.height) {
        if (coords.x > ann.x && coords.x < ann.x + ann.width && 
            coords.y > ann.y && coords.y < ann.y + ann.height) {
          removeAnnotation(ann.id);
        }
      } else if (ann.type === 'pen' && ann.points) {
        // check points
        for (const pt of ann.points) {
          if (Math.hypot(pt.x - coords.x, pt.y - coords.y) < radius) {
            removeAnnotation(ann.id);
            break;
          }
        }
      } else {
        // Text/Signature: bounding box check
        const w = ann.width || 100;
        const h = ann.height || 20;
        if (coords.x >= ann.x && coords.x <= ann.x + w &&
            coords.y >= ann.y && coords.y <= ann.y + h) {
          removeAnnotation(ann.id);
        }
      }
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const coords = getRelativeCoords(e);
    
    if (activeDragId && dragOffset) {
      dragCurrentPosRef.current = coords;
      const el = document.getElementById(`ann-${activeDragId}`);
      if (el) {
        el.style.left = scale(coords.x - dragOffset.x) + 'px';
        el.style.top = scale(coords.y - dragOffset.y) + 'px';
      }
      return;
    }

    if (!isDrawing) return;
    
    if (selectedTool === 'highlight') {
      setCurrentPos(coords);
    } else if (selectedTool === 'pen') {
      setCurrentPoints(prev => [...prev, coords]);
    } else if (selectedTool === 'eraser') {
      eraseAt(coords);
    }
  };

  const handlePointerUp = () => {
    if (activeDragId && dragOffset && dragCurrentPosRef.current) {
      updateAnnotation(activeDragId, {
        x: dragCurrentPosRef.current.x - dragOffset.x,
        y: dragCurrentPosRef.current.y - dragOffset.y,
      });
      setActiveDragId(null);
      setDragOffset(null);
      dragCurrentPosRef.current = null;
    } else if (activeDragId) {
      setActiveDragId(null);
      setDragOffset(null);
      dragCurrentPosRef.current = null;
    }

    if (!isDrawing) return;

    if (selectedTool === 'highlight' && startPos && currentPos) {
      const minX = Math.min(startPos.x, currentPos.x);
      const minY = Math.min(startPos.y, currentPos.y);
      const w = Math.abs(currentPos.x - startPos.x);
      const h = Math.abs(currentPos.y - startPos.y);
      
      // Only add if it's a real drag, not a tiny click
      if (w > 5 && h > 5) {
        addAnnotation({
          type: 'highlight',
          page: pageNum,
          x: minX,
          y: minY,
          width: w,
          height: h,
          color: selectedColor,
        });
      }
      setIsDrawing(false);
      setStartPos(null);
      setCurrentPos(null);
    } else if (selectedTool === 'pen' && currentPoints.length > 1) {
      addAnnotation({
        type: 'pen',
        page: pageNum,
        x: currentPoints[0].x,
        y: currentPoints[0].y,
        points: currentPoints,
        color: selectedColor,
        strokeWidth: 2,
      });
      setIsDrawing(false);
      setCurrentPoints([]);
    } else if (selectedTool === 'eraser') {
      setIsDrawing(false);
    }
  };

  const saveTextAnnotation = () => {
    if (textInput && textValue.trim()) {
      if (textInput.editId) {
        updateAnnotation(textInput.editId, {
          content: textValue,
          color: selectedColor,
          font: selectedFont,
          fontSize: selectedFontSize,
        });
      } else {
        addAnnotation({
          type: 'text',
          page: pageNum,
          x: textInput.x,
          y: textInput.y,
          content: textValue,
          color: selectedColor,
          font: selectedFont,
          fontSize: selectedFontSize,
        });
      }
    } else if (textInput?.editId) {
      // User emptied the text box while editing, so delete it
      removeAnnotation(textInput.editId);
    }
    setTextInput(null);
    setTextValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveTextAnnotation();
    }
    if (e.key === 'Escape') {
      setTextInput(null);
    }
  };

  // Convert un-zoomed coords back to zoomed for rendering
  const scale = (val: number) => val * zoom;

  return (
    <div 
      ref={layerRef}
      className={`annotation-layer tool-${selectedTool}`}
      style={{ width, height }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Render existing annotations */}
      {pageAnnotations.map(ann => {
        const isHovered = hoveredAnn === ann.id && selectedTool !== 'eraser' && selectedTool !== 'pen' && selectedTool !== 'highlight';


        const deleteButton = isHovered && (
          <div 
            className="delete-btn"
            style={{ position: 'absolute', top: -10, right: -10, background: 'red', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
            onClick={(e) => { e.stopPropagation(); removeAnnotation(ann.id); }}
            title="Delete"
          >
            ✕
          </div>
        );

        if (ann.type === 'highlight') {
          return (
            <div
              key={ann.id}
              id={`ann-${ann.id}`}
              className="annotation-item highlight-item"
              onMouseEnter={() => { if (!activeDragId) setHoveredAnn(ann.id); }}
              onMouseLeave={() => { if (!activeDragId) setHoveredAnn(null); }}
              style={{
                left: scale(ann.x),
                top: scale(ann.y),
                width: scale(ann.width || 0),
                height: scale(ann.height || 0),
                backgroundColor: ann.color || 'yellow',
                border: isHovered ? '1px dashed #666' : 'none',
              }}
              onDoubleClick={() => { if (window.confirm('Delete this highlight?')) removeAnnotation(ann.id); }}
            >
              {deleteButton}
            </div>
          );
        }
        
        if (ann.type === 'text') {
          // Hide text if it's currently being edited
          if (textInput?.editId === ann.id) return null;

          return (
            <div
              key={ann.id}
              id={`ann-${ann.id}`}
              className="annotation-item text-item"
              onMouseEnter={() => { if (!activeDragId) setHoveredAnn(ann.id); }}
              onMouseLeave={() => { if (!activeDragId) setHoveredAnn(null); }}
              style={{
                position: 'absolute',
                left: scale(ann.x),
                top: scale(ann.y),
                color: ann.color,
                fontFamily: ann.font,
                fontSize: scale(ann.fontSize || 16),
                border: isHovered ? '1px dashed #666' : '1px solid transparent',
                padding: '2px',
                cursor: (selectedTool === 'hand' || selectedTool === 'select') ? (activeDragId === ann.id ? 'grabbing' : 'grab') : 'default',
              }}
              onPointerDown={(e) => {
                if (selectedTool === 'hand' || selectedTool === 'select') {
                  e.stopPropagation();
                  setHoveredAnn(null);
                  const coords = getRelativeCoords(e);
                  setActiveDragId(ann.id);
                  setDragOffset({ x: coords.x - ann.x, y: coords.y - ann.y });
                  dragCurrentPosRef.current = coords;
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (selectedTool === 'text') {
                  setTextInput({ x: ann.x, y: ann.y, editId: ann.id });
                  setTextValue(ann.content || '');
                  useToolStore.getState().setSelectedFontSize(ann.fontSize || 16);
                  if (ann.font) useToolStore.getState().setSelectedFont(ann.font);
                  if (ann.color) useToolStore.getState().setSelectedColor(ann.color);
                } else if (window.confirm('Delete this text annotation?')) {
                  removeAnnotation(ann.id);
                }
              }}
              title={selectedTool === 'text' ? "Double click to edit" : "Double click to remove"}
            >
              {ann.content}
              {deleteButton}
            </div>
          );
        }

        if (ann.type === 'signature') {
          return (
            <div
              key={ann.id}
              id={`ann-${ann.id}`}
              className="annotation-item"
              onMouseEnter={() => { if (!activeDragId) setHoveredAnn(ann.id); }}
              onMouseLeave={() => { if (!activeDragId) setHoveredAnn(null); }}
              style={{
                pointerEvents: activeDragId === ann.id ? 'none' : 'auto',
                position: 'absolute',
                left: scale(ann.x),
                top: scale(ann.y),
                width: scale(ann.width || 200),
                height: scale(ann.height || 100),
                border: isHovered || activeDragId === ann.id ? '2px dashed #3b82f6' : '1px dashed transparent',
                opacity: activeDragId === ann.id ? 0.6 : 1,
              }}
              onDoubleClick={() => { if (window.confirm('Delete this signature?')) removeAnnotation(ann.id); }}
            >
              {(isHovered || activeDragId === ann.id) && (selectedTool === 'hand' || selectedTool === 'select') && (
                <div 
                  className="drag-handle"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setHoveredAnn(null);
                    const coords = getRelativeCoords(e);
                    setActiveDragId(ann.id);
                    setDragOffset({ x: coords.x - ann.x, y: coords.y - ann.y });
                    dragCurrentPosRef.current = coords;
                  }}
                  style={{
                    position: 'absolute',
                    top: -12,
                    left: -12,
                    background: '#3b82f6',
                    color: 'white',
                    borderRadius: '50%',
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: activeDragId === ann.id ? 'grabbing' : 'grab',
                    zIndex: 20,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                  title="Drag to move"
                >
                  <Move size={14} />
                </div>
              )}
              {ann.content && (ann.content.startsWith('data:image/png;base64,') || ann.content.startsWith('data:image/jpeg;base64,')) ? (
                <img src={ann.content} alt="Signature" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
              ) : (
                <div style={{ padding: 4, background: 'rgba(255,255,255,0.8)', border: '1px dashed #ccc', pointerEvents: 'none' }}>
                  {ann.content}
                </div>
              )}
              {deleteButton}
            </div>
          );
        }
        
        if (ann.type === 'pen' && ann.points) {
          const pathData = ann.points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scale(pt.x)} ${scale(pt.y)}`).join(' ');
          return (
            <div key={ann.id} id={`ann-${ann.id}`} onMouseEnter={() => { if (!activeDragId) setHoveredAnn(ann.id); }} onMouseLeave={() => { if (!activeDragId) setHoveredAnn(null); }}>
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                <path
                  d={pathData}
                  stroke={ann.color || 'black'}
                  strokeWidth={scale(ann.strokeWidth || 2)}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="annotation-item"
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  onDoubleClick={() => { if (window.confirm('Delete this drawing?')) removeAnnotation(ann.id); }}
                />
              </svg>
              {isHovered && ann.points.length > 0 && (
                <div 
                  className="delete-btn"
                  style={{ position: 'absolute', left: scale(ann.points[0].x), top: scale(ann.points[0].y) - 20, background: 'red', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
                  onClick={(e) => { e.stopPropagation(); removeAnnotation(ann.id); }}
                  title="Delete"
                >
                  ✕
                </div>
              )}
            </div>
          );
        }
        return null;
      })}

      {/* Render active highlight drawing */}
      {isDrawing && selectedTool === 'highlight' && startPos && currentPos && (
        <div 
          className="highlight-drawing"
          style={{
            left: scale(Math.min(startPos.x, currentPos.x)),
            top: scale(Math.min(startPos.y, currentPos.y)),
            width: scale(Math.abs(currentPos.x - startPos.x)),
            height: scale(Math.abs(currentPos.y - startPos.y)),
            backgroundColor: selectedColor,
          }}
        />
      )}

      {/* Render active pen drawing */}
      {isDrawing && selectedTool === 'pen' && currentPoints.length > 0 && (
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <path
            d={currentPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scale(pt.x)} ${scale(pt.y)}`).join(' ')}
            stroke={selectedColor}
            strokeWidth={scale(2)}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* Render active text input */}
      {textInput && (
        <>
          <TextFormatToolbar x={scale(textInput.x)} y={scale(textInput.y)} onSave={saveTextAnnotation} />
          <textarea
            ref={inputRef}
            className="text-input-active"
            style={{
              left: scale(textInput.x),
              top: scale(textInput.y),
              color: selectedColor,
              fontFamily: selectedFont,
              fontSize: scale(selectedFontSize || 16),
              position: 'absolute',
              zIndex: 100,
              background: 'transparent',
              border: '1px dashed #000',
              outline: 'none',
              resize: 'both',
              minWidth: 100,
              minHeight: 30,
            }}
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type here..."
            onPointerDown={(e) => e.stopPropagation()}
          />
        </>
      )}
    </div>
  );
};
