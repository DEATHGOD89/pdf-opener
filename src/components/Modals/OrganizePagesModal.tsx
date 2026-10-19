import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import {
  X,
  Scissors,
  Trash2,
  Plus,
  RotateCw,
  RotateCcw,
  CheckSquare,
  Square,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Check,
  ChevronDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useFileDialog } from '../../hooks/useFileDialog';
import {
  extractPagesToSinglePdf,
  extractPagesToSeparatePdfs,
  deletePagesFromPdf,
  combineWithPdf,
  combineWithImages,
  rotatePagesInPdf,
  reorderPagesInPdf,
} from '../../utils/pdfPageOperations';
import { save } from '@tauri-apps/api/dialog';
import { writeBinaryFile } from '@tauri-apps/api/fs';
import { invoke } from '@tauri-apps/api/tauri';
import './OrganizePagesModal.css';

interface OrganizePagesModalProps {
  pdf: pdfjs.PDFDocumentProxy | null;
  fileData: Uint8Array | null;
  fileName: string;
  onUpdateFileData: (newData: Uint8Array, newFileName?: string) => void;
}

export const OrganizePagesModal: React.FC<OrganizePagesModalProps> = ({
  pdf,
  fileData,
  fileName,
  onUpdateFileData,
}) => {
  const {
    organizeModalOpen,
    setOrganizeModalOpen,
    selectedPageNumbers,
    togglePageSelection,
    selectAllPages,
    clearPageSelection,
    setSelectedPageNumbers,
    totalPages,
    addToast,
  } = useUIStore();

  const { pickPDFs, pickImages, pickDirectory } = useFileDialog();

  const [rangeInput, setRangeInput] = useState('');
  const [splitDropdownOpen, setSplitDropdownOpen] = useState(false);
  const [combineDropdownOpen, setCombineDropdownOpen] = useState(false);
  const [combinePosition, setCombinePosition] = useState<'end' | 'start' | 'after'>('end');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const [thumbnailMap, setThumbnailMap] = useState<{ [pageNum: number]: string }>({});
  const [pageOrder, setPageOrder] = useState<number[]>([]);

  const splitRef = useRef<HTMLDivElement>(null);
  const combineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPageOrder(Array.from({ length: totalPages }, (_, i) => i + 1));
  }, [totalPages]);

  const handleMovePage = async (currentIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= pageOrder.length || !fileData) return;
    const newOrder = [...pageOrder];
    const [moved] = newOrder.splice(currentIndex, 1);
    newOrder.splice(targetIndex, 0, moved);
    setPageOrder(newOrder);

    setIsProcessing(true);
    setProcessingMsg('Reordering pages...');
    try {
      const reorderedBytes = await reorderPagesInPdf(fileData, newOrder);
      onUpdateFileData(reorderedBytes);
      addToast('Page order updated!', 'success');
    } catch (err: any) {
      addToast(`Reorder failed: ${err.message || err}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (splitRef.current && !splitRef.current.contains(e.target as Node)) {
        setSplitDropdownOpen(false);
      }
      if (combineRef.current && !combineRef.current.contains(e.target as Node)) {
        setCombineDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Parse page range input (e.g. "1-3, 5, 8")
  const handleRangeChange = (val: string) => {
    setRangeInput(val);
    const pages = new Set<number>();
    const parts = val.split(',').map(s => s.trim()).filter(Boolean);

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.max(1, Math.min(start, end));
          const max = Math.min(totalPages, Math.max(start, end));
          for (let i = min; i <= max; i++) {
            pages.add(i);
          }
        }
      } else {
        const p = parseInt(part, 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
          pages.add(p);
        }
      }
    }

    if (pages.size > 0) {
      setSelectedPageNumbers(Array.from(pages).sort((a, b) => a - b));
    }
  };

  // Safe file write helper
  const writeFileSafely = async (filePath: string, bytes: Uint8Array) => {
    try {
      await invoke('write_file_binary', { path: filePath, contents: Array.from(bytes) });
    } catch {
      await writeBinaryFile(filePath, bytes);
    }
  };

  // 1. EXTRACT / SPLIT: Single PDF
  const handleExtractSinglePdf = async () => {
    if (!fileData || selectedPageNumbers.length === 0) return;
    setSplitDropdownOpen(false);
    setIsProcessing(true);
    setProcessingMsg('Extracting selected pages...');

    try {
      const extractedBytes = await extractPagesToSinglePdf(fileData, selectedPageNumbers);
      const baseName = fileName.replace(/\.pdf$/i, '');
      const defaultSaveName = `${baseName}_selected_${selectedPageNumbers.length}pages.pdf`;

      const savePath = await save({
        title: 'Save Selected Pages As PDF',
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
        defaultPath: defaultSaveName,
      });

      if (savePath) {
        await writeFileSafely(savePath, extractedBytes);
        addToast(`Extracted ${selectedPageNumbers.length} pages to PDF!`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      addToast(`Extract error: ${err.message || err}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. EXTRACT / SPLIT: Separate Files Per Page into a Folder
  const handleSplitSeparatePdfs = async () => {
    if (!fileData || selectedPageNumbers.length === 0) return;
    setSplitDropdownOpen(false);

    try {
      const folderPath = await pickDirectory();
      if (!folderPath) return;

      setIsProcessing(true);
      setProcessingMsg(`Splitting ${selectedPageNumbers.length} pages to folder...`);

      const results = await extractPagesToSeparatePdfs(fileData, selectedPageNumbers);
      const baseName = fileName.replace(/\.pdf$/i, '');

      let count = 0;
      for (const item of results) {
        const outPath = `${folderPath}\\${baseName}_page_${item.pageNum}.pdf`;
        await writeFileSafely(outPath, item.data);
        count++;
      }

      addToast(`Successfully split and saved ${count} page files!`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Split error: ${err.message || err}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. DELETE SELECTED PAGES
  const handleDeleteSelected = async () => {
    if (!fileData || selectedPageNumbers.length === 0) return;
    if (selectedPageNumbers.length >= totalPages) {
      addToast('Cannot delete all pages. The document must have at least one page.', 'error');
      return;
    }

    const confirmMsg = `Are you sure you want to delete ${selectedPageNumbers.length} page(s) from this document?`;
    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);
    setProcessingMsg(`Removing ${selectedPageNumbers.length} pages...`);

    try {
      const updatedBytes = await deletePagesFromPdf(fileData, selectedPageNumbers);
      onUpdateFileData(updatedBytes);
      clearPageSelection();
      setRangeInput('');
      addToast(`Deleted ${selectedPageNumbers.length} page(s).`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Delete error: ${err.message || err}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. COMBINE: Add other PDF file(s)
  const handleCombinePdfs = async () => {
    setCombineDropdownOpen(false);
    try {
      const picked = await pickPDFs();
      if (picked.length === 0) return;

      setIsProcessing(true);
      setProcessingMsg(`Merging ${picked.length} PDF(s)...`);

      let currentData = fileData;
      let insertPos: number | undefined;

      if (combinePosition === 'start') {
        insertPos = 0;
      } else if (combinePosition === 'after') {
        insertPos = selectedPageNumbers.length > 0 ? selectedPageNumbers[selectedPageNumbers.length - 1] : undefined;
      } else {
        insertPos = undefined; // end
      }

      for (const donor of picked) {
        currentData = await combineWithPdf(currentData, donor.data, insertPos);
      }

      if (currentData) {
        onUpdateFileData(currentData);
        addToast(`Successfully added ${picked.length} PDF document(s)!`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      addToast(`Combine PDF error: ${err.message || err}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. COMBINE: Add Image files (PNG, JPG, WEBP)
  const handleCombineImages = async () => {
    setCombineDropdownOpen(false);
    try {
      const picked = await pickImages();
      if (picked.length === 0) return;

      setIsProcessing(true);
      setProcessingMsg(`Converting & inserting ${picked.length} image(s)...`);

      let insertPos: number | undefined;
      if (combinePosition === 'start') {
        insertPos = 0;
      } else if (combinePosition === 'after') {
        insertPos = selectedPageNumbers.length > 0 ? selectedPageNumbers[selectedPageNumbers.length - 1] : undefined;
      } else {
        insertPos = undefined;
      }

      const combinedBytes = await combineWithImages(
        fileData,
        picked.map(p => ({ data: p.data, format: p.format })),
        insertPos
      );

      onUpdateFileData(combinedBytes);
      addToast(`Successfully converted & inserted ${picked.length} image(s)!`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Combine images error: ${err.message || err}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. ROTATE SELECTED
  const handleRotateSelected = async (angle: number) => {
    if (!fileData || selectedPageNumbers.length === 0) return;
    setIsProcessing(true);
    setProcessingMsg('Rotating selected pages...');

    try {
      const rotatedBytes = await rotatePagesInPdf(fileData, selectedPageNumbers, angle);
      onUpdateFileData(rotatedBytes);
      addToast(`Rotated ${selectedPageNumbers.length} page(s) by ${angle > 0 ? `+${angle}°` : `${angle}°`}.`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Rotate error: ${err.message || err}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Single page quick rotate
  const handleQuickRotatePage = async (e: React.MouseEvent, pageNum: number) => {
    e.stopPropagation();
    if (!fileData) return;
    try {
      const rotated = await rotatePagesInPdf(fileData, [pageNum], 90);
      onUpdateFileData(rotated);
    } catch (err: any) {
      addToast(`Rotate error: ${err.message || err}`, 'error');
    }
  };

  // Single page quick delete
  const handleQuickDeletePage = async (e: React.MouseEvent, pageNum: number) => {
    e.stopPropagation();
    if (!fileData) return;
    if (totalPages <= 1) {
      addToast('Cannot delete the only page in document.', 'error');
      return;
    }
    if (!window.confirm(`Delete page ${pageNum}?`)) return;

    try {
      const updated = await deletePagesFromPdf(fileData, [pageNum]);
      onUpdateFileData(updated);
      setSelectedPageNumbers(selectedPageNumbers.filter(p => p !== pageNum));
      addToast(`Page ${pageNum} deleted.`, 'success');
    } catch (err: any) {
      addToast(`Delete error: ${err.message || err}`, 'error');
    }
  };

  // Render thumbnail for a card
  const renderThumbnail = useCallback(async (pageNum: number) => {
    if (!pdf || thumbnailMap[pageNum]) return;
    try {
      const page = await pdf.getPage(pageNum);
      const vp = page.getViewport({ scale: 1 });
      const targetWidth = 140;
      const scale = targetWidth / vp.width;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setThumbnailMap(prev => ({ ...prev, [pageNum]: dataUrl }));
      }
    } catch {
      // Ignore cancelled page renders
    }
  }, [pdf, thumbnailMap]);

  if (!organizeModalOpen) return null;

  const isAllSelected = totalPages > 0 && selectedPageNumbers.length === totalPages;
  const hasSelection = selectedPageNumbers.length > 0;

  return (
    <div className="organize-modal-overlay" onClick={() => setOrganizeModalOpen(false)}>
      <div className="organize-modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="organize-header">
          <div className="organize-title-group">
            <h2>Edit & Organize Pages</h2>
            <span className="organize-subtitle">
              {fileName ? `${fileName} (${totalPages} pages)` : `${totalPages} pages`}
            </span>
          </div>

          <button
            className="organize-close-btn"
            onClick={() => setOrganizeModalOpen(false)}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="organize-toolbar">
          {/* Selection Actions */}
          <div className="organize-toolbar-group">
            <button
              className="toolbar-action-btn"
              onClick={isAllSelected ? clearPageSelection : selectAllPages}
              title={isAllSelected ? "Deselect All" : "Select All Pages"}
            >
              {isAllSelected ? <CheckSquare size={16} /> : <Square size={16} />}
              <span>{isAllSelected ? "Deselect All" : "Select All"}</span>
            </button>

            <div className="range-selector">
              <span className="range-label">Range:</span>
              <input
                type="text"
                placeholder="e.g. 1-3, 5"
                value={rangeInput}
                onChange={e => handleRangeChange(e.target.value)}
                className="range-input"
              />
            </div>
          </div>

          <div className="organize-divider" />

          {/* Page Actions */}
          <div className="organize-toolbar-group">
            {/* Split / Extract Dropdown */}
            <div className="dropdown-wrapper" ref={splitRef}>
              <button
                className={`toolbar-action-btn primary-action ${!hasSelection ? 'disabled' : ''}`}
                disabled={!hasSelection}
                onClick={() => setSplitDropdownOpen(!splitDropdownOpen)}
                title="Split or extract selected pages"
              >
                <Scissors size={16} />
                <span>Split / Extract ({selectedPageNumbers.length})</span>
                <ChevronDown size={14} />
              </button>

              {splitDropdownOpen && (
                <div className="action-dropdown-menu">
                  <button className="dropdown-item" onClick={handleExtractSinglePdf}>
                    <FileText size={16} />
                    <div className="dropdown-item-text">
                      <strong>Save as Single PDF</strong>
                      <small>Combine selected pages into 1 new PDF</small>
                    </div>
                  </button>
                  <button className="dropdown-item" onClick={handleSplitSeparatePdfs}>
                    <FolderOpen size={16} />
                    <div className="dropdown-item-text">
                      <strong>Split into Separate Files</strong>
                      <small>Save each page as an individual file in a folder</small>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Delete Pages */}
            <button
              className={`toolbar-action-btn danger-action ${!hasSelection ? 'disabled' : ''}`}
              disabled={!hasSelection}
              onClick={handleDeleteSelected}
              title="Delete selected pages from this document"
            >
              <Trash2 size={16} />
              <span>Delete ({selectedPageNumbers.length})</span>
            </button>

            {/* Combine / Add Pages Dropdown */}
            <div className="dropdown-wrapper" ref={combineRef}>
              <button
                className="toolbar-action-btn"
                onClick={() => setCombineDropdownOpen(!combineDropdownOpen)}
                title="Combine images or PDF pages into this document"
              >
                <Plus size={16} />
                <span>Combine / Add</span>
                <ChevronDown size={14} />
              </button>

              {combineDropdownOpen && (
                <div className="action-dropdown-menu">
                  <div className="dropdown-section-title">Insertion Position:</div>
                  <div className="position-radio-group">
                    <label className="position-option">
                      <input
                        type="radio"
                        name="pos"
                        value="end"
                        checked={combinePosition === 'end'}
                        onChange={() => setCombinePosition('end')}
                      />
                      <span>At End of Document</span>
                    </label>
                    <label className="position-option">
                      <input
                        type="radio"
                        name="pos"
                        value="start"
                        checked={combinePosition === 'start'}
                        onChange={() => setCombinePosition('start')}
                      />
                      <span>At Beginning</span>
                    </label>
                    <label className="position-option">
                      <input
                        type="radio"
                        name="pos"
                        value="after"
                        checked={combinePosition === 'after'}
                        onChange={() => setCombinePosition('after')}
                      />
                      <span>
                        After Selected Page{' '}
                        {selectedPageNumbers.length > 0 ? `(#${selectedPageNumbers[selectedPageNumbers.length - 1]})` : ''}
                      </span>
                    </label>
                  </div>

                  <div className="dropdown-divider" />

                  <button className="dropdown-item" onClick={handleCombinePdfs}>
                    <FileText size={16} />
                    <div className="dropdown-item-text">
                      <strong>Add PDF Document(s)...</strong>
                      <small>Insert pages from another PDF</small>
                    </div>
                  </button>

                  <button className="dropdown-item" onClick={handleCombineImages}>
                    <ImageIcon size={16} />
                    <div className="dropdown-item-text">
                      <strong>Add Image(s) (PNG, JPG, WEBP)...</strong>
                      <small>Convert images to crisp PDF pages</small>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Rotate Actions */}
            <button
              className={`toolbar-action-btn ${!hasSelection ? 'disabled' : ''}`}
              disabled={!hasSelection}
              onClick={() => handleRotateSelected(90)}
              title="Rotate selected pages 90° clockwise"
            >
              <RotateCw size={16} />
              <span>Rotate 90°</span>
            </button>
            <button
              className={`toolbar-action-btn ${!hasSelection ? 'disabled' : ''}`}
              disabled={!hasSelection}
              onClick={() => handleRotateSelected(-90)}
              title="Rotate selected pages 90° counter-clockwise"
            >
              <RotateCcw size={16} />
              <span>-90°</span>
            </button>
          </div>
        </div>

        {/* Pages Grid */}
        <div className="organize-body">
          {totalPages === 0 ? (
            <div className="organize-empty">
              <p>No document currently open.</p>
            </div>
          ) : (
            <div className="organize-grid">
              {pageOrder.map((pageNum, index) => {
                const isSelected = selectedPageNumbers.includes(pageNum);
                const thumbUrl = thumbnailMap[pageNum];

                // Lazy load thumbnail
                if (!thumbUrl) {
                  renderThumbnail(pageNum);
                }

                return (
                  <div
                    key={`${pageNum}-${index}`}
                    className={`organize-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => togglePageSelection(pageNum)}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('text/plain', index.toString());
                    }}
                    onDragOver={e => {
                      e.preventDefault();
                    }}
                    onDrop={e => {
                      e.preventDefault();
                      const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                      if (!isNaN(sourceIndex) && sourceIndex !== index) {
                        handleMovePage(sourceIndex, index);
                      }
                    }}
                  >
                    {/* Checkbox badge */}
                    <div className={`card-checkbox ${isSelected ? 'checked' : ''}`}>
                      {isSelected ? <Check size={14} /> : null}
                    </div>

                    {/* Quick hover action buttons */}
                    <div className="card-hover-actions">
                      <button
                        type="button"
                        className="quick-action-btn"
                        title="Rotate 90°"
                        onClick={e => handleQuickRotatePage(e, pageNum)}
                      >
                        <RotateCw size={13} />
                      </button>
                      <button
                        type="button"
                        className="quick-action-btn danger"
                        title="Delete page"
                        onClick={e => handleQuickDeletePage(e, pageNum)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Thumbnail Preview */}
                    <div className="card-thumb-container">
                      {thumbUrl ? (
                        <img src={thumbUrl} alt={`Page ${pageNum}`} className="card-thumb-img" />
                      ) : (
                        <div className="card-thumb-placeholder">
                          <span>Page {pageNum}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer with Page Reorder Arrows */}
                    <div className="card-footer">
                      <button
                        type="button"
                        className="move-page-btn"
                        disabled={index === 0}
                        title="Move Page Backward"
                        onClick={e => {
                          e.stopPropagation();
                          handleMovePage(index, index - 1);
                        }}
                      >
                        <ArrowLeft size={12} />
                      </button>
                      <span className="page-num-label">{pageNum}</span>
                      <button
                        type="button"
                        className="move-page-btn"
                        disabled={index === pageOrder.length - 1}
                        title="Move Page Forward"
                        onClick={e => {
                          e.stopPropagation();
                          handleMovePage(index, index + 1);
                        }}
                      >
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="organize-footer">
          <div className="footer-status">
            <span>
              <strong>{selectedPageNumbers.length}</strong> of {totalPages} pages selected
            </span>
          </div>

          <div className="footer-actions">
            <button
              className="organize-done-btn"
              onClick={() => setOrganizeModalOpen(false)}
            >
              Done
            </button>
          </div>
        </div>

        {/* Processing Spinner Overlay */}
        {isProcessing && (
          <div className="organize-processing-overlay">
            <div className="spinner-loader" style={{ width: 36, height: 36 }} />
            <h3>{processingMsg}</h3>
            <p>Please wait while your PDF is being updated.</p>
          </div>
        )}
      </div>
    </div>
  );
};
