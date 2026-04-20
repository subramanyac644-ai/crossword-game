import React from 'react';
import { motion } from 'framer-motion';

export const CrosswordColumn: React.FC = () => {
  const cells = ['H', 'U', 'B'];
  
  return (
    <motion.div 
      className="flex flex-col gap-2 p-2 bg-slate-800/40 rounded-lg backdrop-blur-sm border border-slate-700/50"
      initial={{ x: '-100vw', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ 
        type: 'spring', 
        stiffness: 100, 
        damping: 20, 
        duration: 0.8 
      }}
    >
      {cells.map((char, index) => (
        <div 
          key={index} 
          className="w-10 h-10 md:w-12 md:h-12 bg-white flex items-center justify-center rounded shadow-lg"
        >
          <span className="text-slate-900 font-bold text-lg md:text-xl">{char}</span>
        </div>
      ))}
    </motion.div>
  );
};
