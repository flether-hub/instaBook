import React from 'react';

interface BookContentProps {
  content: string;
}

export function BookContent({ content }: BookContentProps) {
  const paragraphs = content.split('\n\n').filter((p) => p.trim() !== '');

  return (
    <div className="font-serif text-[15px] leading-[1.8] text-justify px-1 pb-4">
      {paragraphs.map((para, idx) => {
        // Handle basic markdown bolding if present
        const processBolds = (text: string) => {
          const parts = text.split(/\*\*(.*?)\*\*/g);
          return parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-bold">{part}</strong> : part));
        };

        const noIndent = para.startsWith('[NO_INDENT]');
        const cleanPara = noIndent ? para.replace('[NO_INDENT]', '') : para;

        // If it looks like a heading (starts with #)
        if (cleanPara.startsWith('#')) {
          const level = cleanPara.match(/^#+/)?.[0].length || 1;
          const cleanText = cleanPara.replace(/^#+\s*/, '');
          const Tag = `h${Math.min(level + 1, 6)}` as any;
          
          let headingClass = "font-bold font-sans text-black ";
          if (level === 1) { // ## Equivalent to Heading 2 in docx (since Chapter Title is Heading 1)
            headingClass += "text-[1.25rem] mt-[1.5rem] mb-[0.75rem] text-center";
          } else if (level === 2) { // ### Equivalent to Heading 3
            headingClass += "text-[1.125rem] mt-[1.2rem] mb-[0.6rem] text-center";
          } else {
            headingClass += "text-[1rem] mt-[1rem] mb-[0.5rem] text-center";
          }
          
          return React.createElement(
            Tag,
            { key: idx, className: headingClass, style: { breakAfter: 'avoid', columnBreakAfter: 'avoid' } },
            processBolds(cleanText)
          );
        }

        return (
          <p key={idx} className={`mb-[0.6em] ${noIndent ? '' : 'indent-[2em]'}`} style={{ widows: 2, orphans: 2 }}>
            {processBolds(cleanPara)}
          </p>
        );
      })}
    </div>
  );
}
