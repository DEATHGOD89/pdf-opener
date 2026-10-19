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
import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { saveAnnotatedPDF } from '../utils/pdfSaver';
import { validatePdfData } from '../utils/validation';
import { save } from '@tauri-apps/api/dialog';
import { writeBinaryFile, readBinaryFile } from '@tauri-apps/api/fs';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

import { SettingsModal } from '../components/Modals/SettingsModal';
import { SignatureModal } from '../components/Modals/SignatureModal';
import { OrganizePagesModal } from '../components/Modals/OrganizePagesModal';
import { PasswordModal } from '../components/Modals/PasswordModal';

export const EditorView: React.FC = () => {
  const { sidebarOpen: isSidebarOpen, toggleSidebar, zoomIn, zoomOut, resetZoom, pendingFilePath, setPendingFilePath, toggleNightMode } = useUIStore();
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loadTrigger, setLoadTrigger] = useState(0);
  const pdfPasswordRef = useRef<string>('');

  const pdfViewerRef = useRef<PDFViewerHandle | null>(null);
  
  const { pickPDF } = useFileDialog();

  const loadFileFromPath = useCallback(async (rawPath: string) => {
    try {
      let filePath = rawPath.replace(/^["']|["']$/g, '').trim();
      if (filePath.startsWith('file:///')) {
        filePath = decodeURIComponent(filePath.slice(8));
      } else if (filePath.startsWith('file://')) {
        filePath = decodeURIComponent(filePath.slice(7));
      }
      let data: Uint8Array;
      try {
        const rawBytes = await invoke<number[]>('read_file_binary', { path: filePath });
        data = new Uint8Array(rawBytes);
      } catch {
        data = await readBinaryFile(filePath);
      }

      if (data.length > 50 * 1024 * 1024) {
        useUIStore.getState().addToast(`File exceeds 50MB limit.`, 'error');
        return;
      }
      if (!validatePdfData(data)) {
        useUIStore.getState().addToast(`The selected file is not a valid PDF document.`, 'error');
        return;
      }
      pdfPasswordRef.current = '';
      setFileData(data);
      const name = filePath.split('\\').pop() || filePath.split('/').pop() || filePath;
      setFileName(name);
      useUIStore.getState().addRecentDoc({ path: filePath, name });
    } catch (err: any) {
      console.error("Failed to load PDF from path:", err);
      useUIStore.getState().addToast(`Error opening file: ${err.message || err}`, 'error');
    }
  }, []);

  // Auto-open file passed via CLI (e.g. "Open with" from Windows)
  useEffect(() => {
    if (pendingFilePath) {
      loadFileFromPath(pendingFilePath).finally(() => {
        setPendingFilePath(null);
      });
    }
  }, [pendingFilePath, loadFileFromPath, setPendingFilePath]);

  // Handle native file drop (drag & drop from Windows Explorer onto the app)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<string[]>('tauri://file-drop', (event) => {
      const paths = event.payload;
      if (paths && paths.length > 0) {
        const filePath = paths[0];
        if (filePath.toLowerCase().endsWith('.pdf')) {
          loadFileFromPath(filePath);
        }
      }
    }).then(u => { unlisten = u; }).catch(() => {});

    return () => {
      if (unlisten) unlisten();
    };
  }, [loadFileFromPath]);

  const handleOpenFile = useCallback(async () => {
    try {
      const result = await pickPDF();
      if (!result) return;
      if (!validatePdfData(result.data)) {
        useUIStore.getState().addToast(`The selected file is not a valid PDF document.`, 'error');
        return;
      }
      pdfPasswordRef.current = '';
      setFileData(result.data);
      const name = result.path.split('\\').pop() || result.path.split('/').pop() || result.path;
      setFileName(name);
      useUIStore.getState().addRecentDoc({ path: result.path, name });
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
    const loadingTask = pdfjs.getDocument({
      data: fileData.slice(),
      password: pdfPasswordRef.current || undefined,
    });
    loadingTask.promise.then(doc => {
      if (!cancelled) {
        setPdf(doc);
        useUIStore.getState().setTotalPages(doc.numPages);
        useUIStore.getState().setCurrentPage(1);
        useUIStore.getState().setPasswordPrompt({ isOpen: false });
      }
    }).catch(err => {
      if (!cancelled) {
        if (err.name === 'PasswordException') {
          useUIStore.getState().setPasswordPrompt({
            isOpen: true,
            error: err.code === 2 ? 'Incorrect password. Please try again.' : undefined,
          });
        } else {
          console.error("PDF load error", err);
          setLoadError(err.message || "Failed to load PDF file. It might be corrupted.");
        }
      }
    });
    return () => {
      cancelled = true;
      loadingTask.destroy().catch(() => {});
    };
  }, [fileData, loadTrigger]);

  const handlePasswordSubmit = useCallback((password: string) => {
    pdfPasswordRef.current = password;
    setLoadTrigger(prev => prev + 1);
  }, []);

  const handlePasswordCancel = useCallback(() => {
    pdfPasswordRef.current = '';
    setFileData(null);
    setPdf(null);
    useUIStore.getState().setPasswordPrompt({ isOpen: false });
  }, []);

  const handlePrint = useCallback(() => {
    if (!fileData) {
      useUIStore.getState().addToast("No document open to print.", 'info');
      return;
    }
    try {
      const blob = new Blob([fileData as any], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.error("Print error:", e);
          } finally {
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
              URL.revokeObjectURL(blobUrl);
            }, 60000);
          }
        }, 200);
      };
    } catch (err: any) {
      console.error("Print failed:", err);
      useUIStore.getState().addToast(`Failed to print: ${err.message || err}`, 'error');
    }
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
        try {
          await invoke('write_file_binary', { path: savePath, contents: Array.from(modifiedBytes) });
        } catch {
          await writeBinaryFile(savePath, modifiedBytes);
        }
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
    onPrint: handlePrint,
    onToggleNightMode: toggleNightMode,
    onJumpToPage: () => pdfViewerRef.current?.focusJumpInput?.(),
    onUndo: () => useAnnotationStore.getState().undo(),
    onRedo: () => useAnnotationStore.getState().redo(),
    onFind: () => useSearchStore.getState().setIsSearchOpen(true),
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onResetZoom: resetZoom,
    onNextPage: () => pdfViewerRef.current?.goNext(),
    onPrevPage: () => pdfViewerRef.current?.goPrev(),
  });

  const handleUpdateFileData = useCallback((newData: Uint8Array, newFileName?: string) => {
    setFileData(newData);
    if (newFileName) {
      setFileName(newFileName);
    }
  }, []);

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
      <Toolbar
        onToggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        onOpenFile={handleOpenFile}
        onSaveFile={handleSaveFile}
        onPrint={handlePrint}
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
            <PDFViewer
              ref={pdfViewerRef}
              pdf={pdf}
              fileData={fileData}
              fileName={fileName}
              onOpenFile={handleOpenFile}
              onOpenRecent={loadFileFromPath}
            />
          </ErrorBoundary>
        )}
      </div>

      <SettingsModal />
      <SignatureModal />
      <PasswordModal
        onSubmitPassword={handlePasswordSubmit}
        onCancel={handlePasswordCancel}
      />
      <OrganizePagesModal
        pdf={pdf}
        fileData={fileData}
        fileName={fileName}
        onUpdateFileData={handleUpdateFileData}
      />

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
