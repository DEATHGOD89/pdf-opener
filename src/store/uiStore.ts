import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export interface RecentDoc {
  path: string;
  name: string;
}

interface UIStore {
  theme: 'light' | 'dark';
  nightMode: boolean;
  sidebarOpen: boolean;
  zoom: number;
  settingsModalOpen: boolean;
  signatureModalOpen: boolean;
  organizeModalOpen: boolean;
  passwordPrompt: { isOpen: boolean; error?: string };
  currentPage: number;
  totalPages: number;
  toasts: ToastMessage[];
  pendingFilePath: string | null;
  selectedPageNumbers: number[];
  recentDocs: RecentDoc[];
  setPendingFilePath: (path: string | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  toggleNightMode: () => void;
  toggleSidebar: () => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setSettingsModalOpen: (open: boolean) => void;
  setSignatureModalOpen: (open: boolean) => void;
  setOrganizeModalOpen: (open: boolean) => void;
  setPasswordPrompt: (prompt: { isOpen: boolean; error?: string }) => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (pages: number) => void;
  setSelectedPageNumbers: (pages: number[]) => void;
  togglePageSelection: (page: number) => void;
  selectAllPages: () => void;
  clearPageSelection: () => void;
  addRecentDoc: (doc: RecentDoc) => void;
  removeRecentDoc: (path: string) => void;
  addToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  removeToast: (id: string) => void;
}

const loadRecentDocs = (): RecentDoc[] => {
  try {
    const raw = localStorage.getItem('pdf_recent_docs');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const loadInitialTheme = (): 'light' | 'dark' => {
  try {
    const saved = localStorage.getItem('pdf_app_theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {}
  return 'light';
};

export const useUIStore = create<UIStore>((set) => ({
  theme: loadInitialTheme(),
  nightMode: false,
  sidebarOpen: true,
  zoom: 1,
  settingsModalOpen: false,
  signatureModalOpen: false,
  organizeModalOpen: false,
  passwordPrompt: { isOpen: false },
  currentPage: 1,
  totalPages: 0,
  toasts: [],
  pendingFilePath: null,
  selectedPageNumbers: [],
  recentDocs: loadRecentDocs(),
  setPendingFilePath: (path) => set({ pendingFilePath: path }),
  setTheme: (theme) => {
    try { localStorage.setItem('pdf_app_theme', theme); } catch {}
    set({ theme });
  },
  toggleTheme: () => set((state) => {
    const next = state.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('pdf_app_theme', next); } catch {}
    return { theme: next };
  }),
  toggleNightMode: () => set((state) => ({
    nightMode: !state.nightMode
  })),
  toggleSidebar: () => set((state) => ({
    sidebarOpen: !state.sidebarOpen
  })),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(3, zoom)) }),
  zoomIn: () => set((state) => ({ zoom: Math.min(3, state.zoom + 0.25) })),
  zoomOut: () => set((state) => ({ zoom: Math.max(0.25, state.zoom - 0.25) })),
  resetZoom: () => set({ zoom: 1 }),
  setSettingsModalOpen: (open) => set({ settingsModalOpen: open }),
  setSignatureModalOpen: (open) => set({ signatureModalOpen: open }),
  setOrganizeModalOpen: (open) => set({ organizeModalOpen: open }),
  setPasswordPrompt: (prompt) => set({ passwordPrompt: prompt }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setTotalPages: (pages) => set({ totalPages: pages }),
  setSelectedPageNumbers: (pages) => set({ selectedPageNumbers: pages }),
  togglePageSelection: (page) => set((state) => {
    const exists = state.selectedPageNumbers.includes(page);
    return {
      selectedPageNumbers: exists
        ? state.selectedPageNumbers.filter(p => p !== page)
        : [...state.selectedPageNumbers, page].sort((a, b) => a - b)
    };
  }),
  selectAllPages: () => set((state) => ({
    selectedPageNumbers: Array.from({ length: state.totalPages }, (_, i) => i + 1)
  })),
  clearPageSelection: () => set({ selectedPageNumbers: [] }),
  addRecentDoc: (doc) => set((state) => {
    const filtered = state.recentDocs.filter(d => d.path !== doc.path);
    const updated = [doc, ...filtered].slice(0, 5);
    try {
      localStorage.setItem('pdf_recent_docs', JSON.stringify(updated));
    } catch {}
    return { recentDocs: updated };
  }),
  removeRecentDoc: (path) => set((state) => {
    const updated = state.recentDocs.filter(d => d.path !== path);
    try {
      localStorage.setItem('pdf_recent_docs', JSON.stringify(updated));
    } catch {}
    return { recentDocs: updated };
  }),
  addToast: (message, type = 'info') => set((state) => {
    const id = Math.random().toString(36).substring(2, 9);
    return { toasts: [...state.toasts, { id, message, type }] };
  }),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),
}));
