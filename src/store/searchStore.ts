import { create } from 'zustand';

export interface SearchRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SearchMatch {
  id: string;
  page: number;
  rects: SearchRect[];
  text: string;
}

interface SearchStore {
  isSearchOpen: boolean;
  query: string;
  matches: SearchMatch[];
  currentMatchIndex: number;
  isSearching: boolean;
  
  setIsSearchOpen: (open: boolean) => void;
  setQuery: (query: string) => void;
  setMatches: (matches: SearchMatch[]) => void;
  setCurrentMatchIndex: (index: number) => void;
  setIsSearching: (isSearching: boolean) => void;
  
  nextMatch: () => void;
  prevMatch: () => void;
  clearSearch: () => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  isSearchOpen: false,
  query: '',
  matches: [],
  currentMatchIndex: 0,
  isSearching: false,
  
  setIsSearchOpen: (open) => set({ isSearchOpen: open }),
  setQuery: (query) => set({ query }),
  setMatches: (matches) => set({ matches }),
  setCurrentMatchIndex: (index) => set({ currentMatchIndex: index }),
  setIsSearching: (isSearching) => set({ isSearching }),
  
  nextMatch: () => set((state) => ({
    currentMatchIndex: state.matches.length > 0 
      ? (state.currentMatchIndex + 1) % state.matches.length 
      : 0
  })),
  
  prevMatch: () => set((state) => ({
    currentMatchIndex: state.matches.length > 0 
      ? (state.currentMatchIndex - 1 + state.matches.length) % state.matches.length 
      : 0
  })),
  
  clearSearch: () => set({ query: '', matches: [], currentMatchIndex: 0 }),
}));
