import { create } from 'zustand';

export type ToolType = 'select' | 'hand' | 'highlight' | 'text' | 'signature' | 'pen' | 'eraser';

interface ToolStore {
  selectedTool: ToolType;
  selectedColor: string;
  selectedFont: string;
  selectedFontSize: number;
  setSelectedTool: (tool: ToolType) => void;
  setSelectedColor: (color: string) => void;
  setSelectedFont: (font: string) => void;
  setSelectedFontSize: (size: number) => void;
}

export const useToolStore = create<ToolStore>((set) => ({
  selectedTool: 'select',
  selectedColor: '#000000',
  selectedFont: 'Inter',
  selectedFontSize: 16,
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setSelectedColor: (color) => set({ selectedColor: color }),
  setSelectedFont: (font) => set({ selectedFont: font }),
  setSelectedFontSize: (size) => set({ selectedFontSize: size }),
}));
