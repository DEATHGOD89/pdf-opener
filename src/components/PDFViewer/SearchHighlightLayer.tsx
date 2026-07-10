import React from 'react';
import { useSearchStore } from '../../store/searchStore';

interface SearchHighlightLayerProps {
  pageNum: number;
  zoom: number;
  width: number;
  height: number;
}

export const SearchHighlightLayer: React.FC<SearchHighlightLayerProps> = ({ pageNum, zoom, width, height }) => {
  const { matches, currentMatchIndex } = useSearchStore();

  const pageMatches = matches.filter(m => m.page === pageNum);

  if (pageMatches.length === 0) return null;

  return (
    <div 
      className="search-highlight-layer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: 'none',
        zIndex: 50 // Above canvas, below annotations
      }}
    >
      {pageMatches.map((match) => {
        const isActive = matches[currentMatchIndex]?.id === match.id;
        
        return (
          <React.Fragment key={match.id}>
            {match.rects.map((rect, i) => (
              <div
                key={`${match.id}-${i}`}
                style={{
                  position: 'absolute',
                  left: rect.x * zoom,
                  top: rect.y * zoom,
                  width: rect.width * zoom,
                  height: rect.height * zoom,
                  backgroundColor: isActive ? 'rgba(255, 152, 0, 0.5)' : 'rgba(255, 235, 59, 0.4)', // Orange for active, yellow for others
                  borderRadius: 2,
                  boxShadow: isActive ? '0 0 0 1px #ff9800' : 'none',
                }}
              />
            ))}
          </React.Fragment>
        );
      })}
    </div>
  );
};
