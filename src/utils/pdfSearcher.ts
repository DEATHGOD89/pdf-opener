import * as pdfjs from 'pdfjs-dist';
import { SearchMatch, SearchRect } from '../store/searchStore';

export const performSearch = async (
  pdf: pdfjs.PDFDocumentProxy,
  query: string
): Promise<SearchMatch[]> => {
  if (!query || query.trim().length === 0) return [];
  
  const lowerQuery = query.toLowerCase();
  const matches: SearchMatch[] = [];
  let matchIdCounter = 0;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let fullText = '';
      const textItemMapping: { itemIndex: number, textIndex: number }[] = [];
      
      // Build full text for the page
      textContent.items.forEach((item, index) => {
        if ('str' in item) {
          textItemMapping.push({ itemIndex: index, textIndex: fullText.length });
          fullText += item.str + ' '; // Add space between items
        }
      });
      
      const lowerFullText = fullText.toLowerCase();
      
      let startIndex = 0;
      while (startIndex < lowerFullText.length) {
        const matchIndex = lowerFullText.indexOf(lowerQuery, startIndex);
        if (matchIndex === -1) break;
        
        // Find which items this match spans
        const endMatchIndex = matchIndex + lowerQuery.length;
        const matchedItems: any[] = [];
        
        for (let i = 0; i < textItemMapping.length; i++) {
          const mapping = textItemMapping[i];
          const nextMappingTextIndex = i + 1 < textItemMapping.length 
            ? textItemMapping[i+1].textIndex 
            : fullText.length;
            
          // If the item overlaps with our match
          if (mapping.textIndex < endMatchIndex && nextMappingTextIndex > matchIndex) {
            matchedItems.push(textContent.items[mapping.itemIndex]);
          }
        }
        
        const rects: SearchRect[] = [];
        
        matchedItems.forEach(item => {
          if ('transform' in item && 'width' in item && 'height' in item) {
            const transform = item.transform;
            // PDF transform is [scaleX, skewY, skewX, scaleY, tx, ty]
            // ty is usually from bottom of page
            const x = transform[4];
            // ty gives the baseline. We subtract height to get top-left y.
            // Wait, we need to map to viewport coordinates where top-left is 0,0
            
            // Standard approach: use viewport transform
            // Actually, we can just use the item transform relative to page height
            // Because our AnnotationLayer uses top-left coordinates relative to page height.
            const itemHeight = item.height || transform[3]; // scaleY is usually height
            const y = page.view[3] - transform[5] - itemHeight; 
            
            rects.push({
              x: x,
              y: y,
              width: item.width,
              height: itemHeight
            });
          }
        });
        
        if (rects.length > 0) {
          matches.push({
            id: `match-${pageNum}-${matchIdCounter++}`,
            page: pageNum,
            rects: rects,
            text: fullText.substring(matchIndex, endMatchIndex)
          });
        }
        
        startIndex = matchIndex + 1;
      }
    } catch (err) {
      console.error(`Failed to search page ${pageNum}:`, err);
    }
  }

  return matches;
};
