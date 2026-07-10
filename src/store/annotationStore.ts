import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Annotation {
  id: string;
  type: 'highlight' | 'text' | 'signature' | 'pen';
  page: number;
  x: number;
  y: number;
  color?: string;
  content?: string;
  font?: string;
  fontSize?: number;
  width?: number;
  height?: number;
  points?: {x: number, y: number}[];
  strokeWidth?: number;
}

interface AnnotationStore {
  annotations: Annotation[];
  past: Annotation[][];
  future: Annotation[][];
  addAnnotation: (annotation: Omit<Annotation, 'id'>) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  undo: () => void;
  redo: () => void;
}

export const useAnnotationStore = create<AnnotationStore>()(
  persist(
    (set) => ({
      annotations: [],
      past: [],
      future: [],
      addAnnotation: (annotation) => set((state) => {
        const newId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') 
          ? crypto.randomUUID() 
          : Date.now().toString(36) + Math.random().toString(36).substring(2);
        return { 
          past: [...state.past, state.annotations],
          future: [],
          annotations: [...state.annotations, { ...annotation, id: newId }] 
        };
      }),
      updateAnnotation: (id, updates) => set((state) => ({
        past: [...state.past, state.annotations],
        future: [],
        annotations: state.annotations.map(a => a.id === id ? { ...a, ...updates } : a)
      })),
      removeAnnotation: (id) => set((state) => ({
        past: [...state.past, state.annotations],
        future: [],
        annotations: state.annotations.filter(a => a.id !== id)
      })),
      clearAnnotations: () => set((state) => ({ 
        past: [...state.past, state.annotations],
        future: [],
        annotations: [] 
      })),
      undo: () => set((state) => {
        if (state.past.length === 0) return state;
        const previous = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, state.past.length - 1);
        return {
          past: newPast,
          future: [state.annotations, ...state.future],
          annotations: previous
        };
      }),
      redo: () => set((state) => {
        if (state.future.length === 0) return state;
        const next = state.future[0];
        const newFuture = state.future.slice(1);
        return {
          past: [...state.past, state.annotations],
          future: newFuture,
          annotations: next
        };
      })
    }),
    { 
      name: 'pdf-annotations',
      partialize: (state) => ({ annotations: state.annotations }), // Only persist annotations, not history
      merge: (persistedState: any, currentState) => {
        if (!persistedState || !Array.isArray(persistedState.annotations)) {
          return currentState;
        }
        
        const validAnnotations = persistedState.annotations.filter((a: any) => {
          if (!a || typeof a !== 'object') return false;
          if (typeof a.id !== 'string' || typeof a.page !== 'number' || typeof a.x !== 'number' || typeof a.y !== 'number') return false;
          const validTypes = ['highlight', 'text', 'signature', 'pen'];
          if (!validTypes.includes(a.type)) return false;
          return true;
        });

        return { ...currentState, annotations: validAnnotations };
      }
    }
  )
);
