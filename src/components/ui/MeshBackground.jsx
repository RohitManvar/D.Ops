import React from 'react';
import { useTheme } from '@/context/ThemeProvider';

export default function MeshBackground({ children }) {
  const { dark } = useTheme();

  return (
    <div className="relative min-h-screen w-full overflow-hidden transition-colors duration-500 bg-slate-50 dark:bg-slate-950">
      
      {/* Mesh Gradient Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Top left */}
        <div 
          className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full opacity-60 dark:opacity-30 mix-blend-multiply dark:mix-blend-screen filter blur-[100px]"
          style={{ backgroundColor: dark ? '#4c1d95' : '#e0e7ff', animationDelay: '0s' }}
        />
        
        {/* Top right */}
        <div 
          className="absolute top-[-5%] right-[-10%] w-[35%] h-[35%] rounded-full opacity-60 dark:opacity-30 mix-blend-multiply dark:mix-blend-screen filter blur-[100px]"
          style={{ backgroundColor: dark ? '#0f766e' : '#fbcfe8', animationDelay: '2s' }}
        />
        
        {/* Bottom left */}
        <div 
          className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full opacity-60 dark:opacity-30 mix-blend-multiply dark:mix-blend-screen filter blur-[100px]"
          style={{ backgroundColor: dark ? '#1e3a8a' : '#fef08a', animationDelay: '4s' }}
        />
        
        {/* Bottom right */}
        <div 
          className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-60 dark:opacity-30 mix-blend-multiply dark:mix-blend-screen filter blur-[120px]"
          style={{ backgroundColor: dark ? '#be185d' : '#bae6fd', animationDelay: '6s' }}
        />
      </div>

      {/* Grid Overlay for texture */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03] dark:opacity-[0.05]"
           style={{ backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 min-h-screen">
        {children}
      </div>
    </div>
  );
}
