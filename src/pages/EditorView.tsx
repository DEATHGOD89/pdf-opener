import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Toolbar } from '../components/Toolbar/Toolbar';
import { PDFViewer, PDFViewerHandle } from '../components/PDFViewer/PDFViewer';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { SearchUI } from '../components/PDFViewer/SearchUI';
import { Spinner } from '../components/Common/Spinner';
import { ErrorBoundary } from '../components/Common/ErrorBoundary';
import { useFileDialog } from '../hooks/useFileDialog';
import { useKeyboard } from '../hooks/useKeyboard';
import { useUIStore } from '../store/uiStore';
import { useSearchStore } from '../store/searchStore';
import { useAnnotationStore } from '../store/annotationStore';
import { useLocation } from 'wouter';
import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { saveAnnotatedPDF } from '../utils/pdfSaver';
import { save } from '@tauri-apps/api/dialog';
import { writeBinaryFile } from '@tauri-apps/api/fs';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

import { SettingsModal } from '../components/Modals/SettingsModal';
import { SignatureModal } from '../components/Modals/SignatureModal';

export const EditorView: React.FC = () => {
  const { sidebarOpen: isSidebarOpen, toggleSidebar, zoomIn, zoomOut, pendingFilePath, setPendingFilePath } = useUIStore();
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [, setLocation] = useLocation();

  const pdfViewerRef = useRef<PDFViewerHandle | null>(null);
  
  const { pickPDF } = useFileDialog();

  // Auto-open file passed via CLI (e.g. "Open with" from Windows)
  useEffect(() => {
    if (pendingFilePath) {
      const openFile = async () => {
        try {
          const { readBinaryFile } = await import('@tauri-apps/api/fs');
          const data = await readBinaryFile(pendingFilePath);
          if (data.length > 50 * 1024 * 1024) {
            useUIStore.getState().addToast(`File exceeds 50MB limit.`, 'error');
            return;
          }
          setFileData(data);
          setFileName(pendingFilePath.split('\\').pop() || pendingFilePath.split('/').pop() || pendingFilePath);
        } catch (err: any) {
          useUIStore.getState().addToast(`Error opening file: ${err.message || err}`, 'error');
        } finally {
          setPendingFilePath(null);
        }
      };
      openFile();
    }
  }, [pendingFilePath, setPendingFilePath]);

  const handleOpenFile = useCallback(async () => {
    try {
      const result = await pickPDF();
      if (!result) return;
      setFileData(result.data);
      setFileName(result.path.split('\\').pop() || result.path.split('/').pop() || result.path);
    } catch (err: any) {
      console.error("Failed to open file:", err);
      useUIStore.getState().addToast(`Error opening file: ${err.message || err}`, 'error');
    }
  }, [pickPDF]);

  useEffect(() => {
    if (!fileData) {
      setPdf(null);
      setLoadError(null);
      return;
    }
    useAnnotationStore.getState().clearAnnotations();
    let cancelled = false;
    setLoadError(null);
    const loadingTask = pdfjs.getDocument({ data: fileData.slice() });
    loadingTask.promise.then(doc => {
      if (!cancelled) {
        setPdf(doc);
        useUIStore.getState().setTotalPages(doc.numPages);
        useUIStore.getState().setCurrentPage(1);
      }
    }).catch(err => {
      if (!cancelled) {
        console.error("PDF load error", err);
        setLoadError(err.message || "Failed to load PDF file. It might be corrupted or encrypted.");
      }
    });
    return () => {
      cancelled = true;
      loadingTask.destroy().catch(() => {});
    };
  }, [fileData]);

  const handleSaveFile = useCallback(async () => {
    if (!fileData) {
      useUIStore.getState().addToast("No file is currently open to save.", 'error');
      return;
    }
    setIsSaving(true);
    try {
      const { annotations, clearAnnotations } = useAnnotationStore.getState();
      const modifiedBytes = await saveAnnotatedPDF(fileData, annotations);
      
      const savePath = await save({
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
        defaultPath: fileName
      });

      if (savePath) {
        await writeBinaryFile(savePath, modifiedBytes);
        useUIStore.getState().addToast("PDF saved successfully!", 'success');
        
        // Clear annotations from localStorage so it doesn't bloat the 5MB limit
        clearAnnotations();
        // Update fileData with the new baked file so the viewer reloads the clean PDF!
        setFileData(modifiedBytes);
        setFileName(savePath.split('\\').pop() || savePath.split('/').pop() || savePath);
      }
    } catch (err: any) {
      console.error("Failed to save document:", err);
      // Give a precise error message to the user, particularly if text fails to burn due to font issues
      const msg = err.message || err.toString();
      useUIStore.getState().addToast(`Failed to save: ${msg.substring(0, 80)}`, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [fileData, fileName]);

  useKeyboard({
    onSave: handleSaveFile,
    onOpen: handleOpenFile,
    onUndo: () => useAnnotationStore.getState().undo(),
    onRedo: () => useAnnotationStore.getState().redo(),
    onFind: () => useSearchStore.getState().setIsSearchOpen(true),
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onNextPage: () => pdfViewerRef.current?.goNext(),
    onPrevPage: () => pdfViewerRef.current?.goPrev(),
  });

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
      <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 100 }}>
        <button 
          onClick={() => setLocation('/')}
          aria-label="Back to Dashboard"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-color)' }}
        >
          ← Dashboard
        </button>
      </div>

      <Toolbar
        onToggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        onOpenFile={handleOpenFile}
        onSaveFile={handleSaveFile}
      />
      <SearchUI pdf={pdf} onNavigateToPage={(p) => pdfViewerRef.current?.scrollToPage(p)} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {isSidebarOpen && <Sidebar pdf={pdf} onPageSelect={(p) => pdfViewerRef.current?.scrollToPage(p)} />}
        {loadError ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--danger-color, #fa5252)' }}>
            <h2>Failed to open PDF</h2>
            <p>{loadError}</p>
            <button onClick={() => setFileData(null)} style={{ marginTop: '16px', padding: '8px 16px', cursor: 'pointer' }}>Close</button>
          </div>
        ) : (
          <ErrorBoundary>
            <PDFViewer ref={pdfViewerRef} pdf={pdf} fileData={fileData} fileName={fileName} onOpenFile={handleOpenFile} />
          </ErrorBoundary>
        )}
      </div>

      <SettingsModal />
      <SignatureModal />

      {isSaving && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <Spinner />
          <h2 style={{ marginTop: 20 }}>Saving PDF...</h2>
          <p>Burning annotations directly into the file structure.</p>
        </div>
      )}
    </div>
  );
};
