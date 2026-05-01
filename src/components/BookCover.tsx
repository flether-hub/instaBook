import React, { useMemo } from 'react';

// Simple hash function for seeding
const getHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

interface BookCoverProps {
  title: string;
  subtitle?: string;
  author: string;
  publisher?: string;
}

export function BookCover({ 
  title, 
  subtitle, 
  author, 
  publisher = "华夏经济纵横出版社" 
}: BookCoverProps) {
  
  const seed = useMemo(() => getHash(title || "Untitled"), [title]);

  // Use picsum.photos for random but seeded free images
  const bgImageUrl = `https://picsum.photos/seed/${Math.abs(seed)}/1450/2100`;

  return (
    <div 
      id="book-cover-to-capture" 
      className="relative w-full aspect-[148/210] max-w-[560px] mx-auto rounded-none overflow-hidden flex flex-col"
      style={{ 
        backgroundColor: '#1c1917',
        borderLeft: '6px solid #a8a29e',
        position: 'relative'
      }}
    >
      
      {/* Background Image Layer */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <div 
          className="absolute inset-0"
          style={{ 
            backgroundImage: `url(${bgImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        {/* Overlay Dark/Light Gradients - Stronger at bottom for author visibility */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.98) 0%, rgba(0, 0, 0, 0.6) 30%, transparent 100%)' 
          }}
        />
        <div 
          className="absolute inset-0"
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.2)',
            mixBlendMode: 'multiply'
          }}
        />
      </div>

      {/* SVG Overlay Effects */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }} preserveAspectRatio="none" viewBox="0 0 400 600">
        <defs>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
          </filter>
          <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
             <stop offset="0%" stopColor="#BF953F" />
             <stop offset="50%" stopColor="#FCF6BA" />
             <stop offset="100%" stopColor="#B38728" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" filter="url(#noise)" opacity="0.1" style={{ mixBlendMode: 'overlay' }} />
        
        {/* Artistic Human Silhouette (Minimalist) */}
        <g opacity="0.5" transform="translate(220, 280) scale(1.2)">
          <path 
            d="M50,20 C30,20 20,40 20,60 C20,90 40,110 50,130 C60,110 80,90 80,60 C80,40 70,20 50,20 Z" 
            fill="url(#gold)" 
            opacity="0.3"
          />
          <circle cx="50" cy="45" r="12" fill="white" opacity="0.1" />
          <path d="M35,140 Q50,120 65,140 L75,250 Q50,260 25,250 Z" fill="rgba(255,255,255,0.05)" />
        </g>
        
        {/* Abstract Geometrics */}
        <g stroke="url(#gold)" strokeWidth="0.5" fill="none" opacity="0.3">
          <circle cx="200" cy="300" r="180" strokeDasharray="4 4" />
          <circle cx="200" cy="300" r="120" />
          <path d="M20,300 L380,300 M200,20 L200,580" strokeOpacity="0.2" />
        </g>

        {/* Decorative Borders */}
        <rect x="15" y="15" width="370" height="570" fill="none" stroke="url(#gold)" strokeWidth="0.5" strokeOpacity="0.3" />
      </svg>
      
      {/* Book Binding effect */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-10 pointer-events-none binder-effect"
        style={{ 
          zIndex: 20,
          background: 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
          borderRight: '1px solid rgba(255,255,255,0.1)'
        }}
      ></div>
      
      {/* Content Area */}
      <div className="relative flex flex-col h-full p-12 md:p-16" style={{ zIndex: 30 }}>
        
        {/* Top Section */}
        <div className="flex justify-between items-start" style={{ color: '#d6d3d1' }}>
           <span 
             className="tracking-widest text-xs font-bold uppercase px-4 py-2 rounded-sm"
             style={{ 
               backgroundColor: 'rgba(0,0,0,0.3)', 
               border: '1px solid rgba(255,255,255,0.1)',
               color: '#d6d3d1',
               fontFamily: 'SimHei'
             }}
           >
             {publisher}
           </span>
        </div>
        
        {/* Title Section (Centered) */}
        <div className="flex-grow flex flex-col justify-center items-center text-center">
           <h1 
             className="text-5xl md:text-6xl lg:text-7xl font-black tracking-widest leading-tight"
             style={{ 
               color: '#BF953F', 
               background: 'linear-gradient(135deg, #FCF6BA 0%, #BF953F 50%, #B38728 100%)',
               WebkitBackgroundClip: 'text',
               WebkitTextFillColor: 'transparent',
               backgroundClip: 'text',
               fontFamily: 'SimHei',
               filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.5))'
             }}
           >
             {title || "未命名"}
           </h1>
           
           {subtitle && (
             <div className="mt-8 flex items-center justify-center gap-4">
               <div className="w-8 h-px" style={{ backgroundColor: 'rgba(168, 162, 158, 0.5)' }}></div>
               <p className="text-xl md:text-2xl tracking-widest font-light" style={{ color: '#e7e5e4', fontFamily: 'SimHei' }}>
                 {subtitle}
               </p>
               <div className="w-8 h-px" style={{ backgroundColor: 'rgba(168, 162, 158, 0.5)' }}></div>
             </div>
           )}
        </div>

        {/* Bottom Author Section */}
        <div className="mt-auto flex flex-col items-center pb-8">
           <div className="w-px h-12 mb-6" style={{ background: 'linear-gradient(to bottom, transparent, #BF953F)', opacity: 0.5 }}></div>
           <p className="tracking-[0.3em] text-xl md:text-2xl font-medium" style={{ color: '#e7e5e4', fontFamily: 'SimHei', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
             {author || "佚名"} <span style={{ color: '#a8a29e', fontSize: '0.875rem', marginLeft: '0.5rem' }}>著</span>
           </p>
        </div>

      </div>
      
    </div>
  );
}
