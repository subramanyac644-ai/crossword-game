import React from 'react';
import { motion } from 'framer-motion';

export const CrosswordRow: React.FC = () => {
  return (
    <motion.div 
      className="flex gap-2 p-2 bg-white/5 rounded-lg backdrop-blur-sm border border-white/10"
      initial={{ x: '100vw', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ 
        type: 'spring', 
        stiffness: 80, 
        damping: 15, 
        duration: 1 
      }}
    >
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div 
          key={i} 
          className="w-10 h-10 bg-white rounded-[2px] shadow-xl"
        />
      ))}
    </motion.div>
  );
};
