import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface UIStore {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  zoom: number;
  settingsModalOpen: boolean;
  signatureModalOpen: boolean;
  currentPage: number;
  totalPages: number;
  toasts: ToastMessage[];
  pendingFilePath: string | null;
  setPendingFilePath: (path: string | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setSettingsModalOpen: (open: boolean) => void;
  setSignatureModalOpen: (open: boolean) => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (pages: number) => void;
  addToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  theme: 'light',
  sidebarOpen: true,
  zoom: 1,
  settingsModalOpen: false,
  signatureModalOpen: false,
  currentPage: 1,
  totalPages: 0,
  toasts: [],
  pendingFilePath: null,
  setPendingFilePath: (path) => set({ pendingFilePath: path }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({
    theme: state.theme === 'light' ? 'dark' : 'light'
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
  setCurrentPage: (page) => set({ currentPage: page }),
  setTotalPages: (pages) => set({ totalPages: pages }),
  addToast: (message, type = 'info') => set((state) => {
    const id = Math.random().toString(36).substring(2, 9);
    return { toasts: [...state.toasts, { id, message, type }] };
  }),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),
}));
