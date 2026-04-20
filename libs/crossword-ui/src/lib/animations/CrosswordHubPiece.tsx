import React from 'react';
import { motion } from 'framer-motion';

export const CrosswordHubPiece: React.FC = () => {
  return (
    <motion.div 
      className="relative w-[300px] h-[150px]"
      initial={{ x: '-100vw', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ 
        type: 'spring', 
        stiffness: 80, 
        damping: 15, 
        duration: 1 
      }}
    >
      {/* Horizontal Strip */}
      <div className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5 p-1 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-10 h-10 bg-white rounded-[2px] shadow-lg" />
        ))}
        {/* H U B letters */}
        <div className="w-10 h-10 bg-emerald-500 flex items-center justify-center rounded-[2px] shadow-lg">
          <span className="text-white font-black text-xl">H</span>
        </div>
        <div className="w-10 h-10 bg-white flex items-center justify-center rounded-[2px] shadow-lg">
          <span className="text-slate-800 font-black text-xl">U</span>
        </div>
        <div className="w-10 h-10 bg-purple-500 flex items-center justify-center rounded-[2px] shadow-lg">
          <span className="text-white font-black text-xl">B</span>
        </div>
      </div>

      {/* Vertical Cross Piece at 'H' */}
      <div className="absolute top-0 left-[184px] flex flex-col gap-1.5">
        <div className="w-10 h-10 bg-blue-400 flex items-center justify-center rounded-[2px] shadow-lg">
          <span className="text-white font-black text-xl italic">H</span>
        </div>
        {/* The middle cell is the 'H' from horizontal row above */}
        <div className="w-10 h-10 invisible" /> 
        <div className="w-10 h-10 bg-white flex items-center justify-center rounded-[2px] shadow-lg" />
      </div>
    </motion.div>
  );
};
