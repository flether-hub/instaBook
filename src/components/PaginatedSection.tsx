import React, { useLayoutEffect, useRef, useState } from 'react';
import { BookContent } from './BookContent';
import { Loader2 } from 'lucide-react';

interface PaginatedSectionProps {
  key?: React.Key;
  content: string;
  outlineTitle: string;
  sectionHeader?: React.ReactNode;
  sectionFooter?: React.ReactNode;
  startPageCounter: number;
  onPagesCalculated?: (pagesCount: number) => void;
  isLoading?: boolean;
}

export function PaginatedSection({ content, outlineTitle, sectionHeader, sectionFooter, startPageCounter, onPagesCalculated, isLoading }: PaginatedSectionProps) {
  const [totalPages, setTotalPages] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);

  const calculatePages = () => {
    if (contentRef.current) {
        const scrollW = contentRef.current.scrollWidth;
        if (scrollW === 0) return; 
        
        // Number of pages is determinable by total width
        // A single page has 430px column + 130px gap = 560px
        const numPages = Math.round((scrollW + 130) / 560);
        const finalPages = Math.max(1, numPages);
        
        if (finalPages !== totalPages) {
            setTotalPages(finalPages);
            onPagesCalculated?.(finalPages);
        }
    }
  };

  useLayoutEffect(() => {
    calculatePages();
    // Re-verify after a short tick to handle potential font loading reflows
    const timer = setTimeout(calculatePages, 100);
    return () => clearTimeout(timer);
  }, [content, isLoading, onPagesCalculated, totalPages]);

  useLayoutEffect(() => {
     calculatePages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {Array.from({ length: totalPages }).map((_, i) => (
        <div key={i} className="book-page-preview page-break flex flex-col relative content-page overflow-hidden bg-[#fcfbf8]">
          <div className="preview-header">{outlineTitle}</div>
          
          <div className="w-full flex-grow relative" style={{ overflow: 'hidden' }}>
            <div 
              ref={i === 0 ? contentRef : null}
              style={{
                columnWidth: '430px',
                columnGap: '130px',
                columnFill: 'auto',
                height: '635px',
                position: 'absolute',
                top: 0,
                left: `-${i * 560}px`,
                wordBreak: 'break-word',
                textAlign: 'justify'
              }}
            >
               {sectionHeader && (
                  <div style={{ breakInside: 'avoid', columnBreakInside: 'avoid', marginBottom: '2rem' }}>
                     {sectionHeader}
                  </div>
               )}
               
               <BookContent content={content} />
               
               {sectionFooter && (
                  <div style={{ breakInside: 'avoid', columnBreakInside: 'avoid', marginTop: '2rem' }}>
                     {sectionFooter}
                  </div>
               )}

               {isLoading && i === totalPages - 1 && (
                  <div className="flex items-center gap-2 text-stone-400 mt-8 mb-4 justify-center no-print" style={{ breakInside: 'avoid', columnBreakInside: 'avoid' }}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-serif">AI 正在奋笔疾书...</span>
                  </div> 
               )}
            </div>
          </div>
          
          <div className="preview-footer z-10 bg-[#fcfbf8]">
            {/* Opaque footer background to cover trailing multicolumn overlaps if any */}
            <div className="w-24 mx-auto">— {startPageCounter + i} —</div>
          </div>
        </div>
      ))}
    </>
  );
}
