import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function GlassCard({ children, className, delay = 0, noAnimation = false, ...props }) {
  
  const glassClasses = "bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]";
  
  if (noAnimation) {
    return (
      <div className={cn("rounded-[32px]", glassClasses, className)} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn("rounded-[32px]", glassClasses, className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
