import React, { useState, useEffect, useRef } from 'react';
import { useSearchStore } from '../../store/searchStore';
import { performSearch } from '../../utils/pdfSearcher';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import './SearchUI.css';

interface SearchUIProps {
  pdf: pdfjs.PDFDocumentProxy | null;
  onNavigateToPage: (page: number) => void;
}

export const SearchUI: React.FC<SearchUIProps> = ({ pdf, onNavigateToPage }) => {
  const { 
    isSearchOpen, 
    query, 
    matches, 
    currentMatchIndex, 
    isSearching,
    setIsSearchOpen, 
    setQuery, 
    setMatches, 
    setIsSearching,
    nextMatch,
    prevMatch,
    clearSearch
  } = useSearchStore();

  const [localQuery, setLocalQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
      // Also pre-fill if we have an existing query
      if (query && !localQuery) {
        setLocalQuery(query);
      }
    }
  }, [isSearchOpen]);

  // Sync current match page
  useEffect(() => {
    if (matches.length > 0) {
      const match = matches[currentMatchIndex];
      onNavigateToPage(match.page);
    }
  }, [currentMatchIndex, matches]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdf || !localQuery.trim()) return;
    
    setQuery(localQuery);
    setIsSearching(true);
    setMatches([]); // Clear existing
    
    try {
      const results = await performSearch(pdf, localQuery);
      setMatches(results);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClose = () => {
    setIsSearchOpen(false);
    clearSearch();
    setLocalQuery('');
  };

  if (!isSearchOpen) return null;

  return (
    <div className="search-ui-container">
      <form onSubmit={handleSearch} className="search-form">
        <Search size={16} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder="Find in document..."
          className="search-input"
        />
        
        {isSearching && <span className="search-loading">...</span>}
        
        {!isSearching && query && (
          <span className="search-results-count">
            {matches.length > 0 ? `${currentMatchIndex + 1} / ${matches.length}` : '0 / 0'}
          </span>
        )}
        
        <div className="search-actions">
          <button type="button" onClick={prevMatch} disabled={matches.length === 0} title="Previous match">
            <ChevronUp size={16} />
          </button>
          <button type="button" onClick={nextMatch} disabled={matches.length === 0} title="Next match">
            <ChevronDown size={16} />
          </button>
          <div className="search-divider" />
          <button type="button" onClick={handleClose} title="Close search">
            <X size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};
