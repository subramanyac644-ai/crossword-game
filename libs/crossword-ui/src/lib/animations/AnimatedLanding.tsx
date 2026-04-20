import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CrosswordRow } from './CrosswordRow.js';
import { CrosswordColumn } from './CrosswordColumn.js';

interface AnimatedLandingProps {
  onComplete: () => void;
}

export const AnimatedLanding: React.FC<AnimatedLandingProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'entry' | 'collision' | 'reveal' | 'finished'>('entry');

  useEffect(() => {
    // Stage Transitions
    const entryTimeout = setTimeout(() => setStage('collision'), 800);
    const collisionTimeout = setTimeout(() => setStage('reveal'), 1100);
    const finishTimeout = setTimeout(() => {
      setStage('finished');
      setTimeout(onComplete, 1000); // Wait for final fade before calling onComplete
    }, 3500);

    return () => {
      clearTimeout(entryTimeout);
      clearTimeout(collisionTimeout);
      clearTimeout(finishTimeout);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-950 to-purple-900 opacity-60" />
      
      {/* Collision Stage */}
      <AnimatePresence>
        {stage === 'entry' && (
          <div className="relative flex items-center justify-center w-full h-full">
            <div className="absolute">
              <CrosswordRow />
            </div>
            <div className="absolute">
              <CrosswordColumn />
            </div>
          </div>
        )}

        {stage === 'collision' && (
          <motion.div 
            className="relative"
            initial={{ scale: 1 }}
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 0.3 }}
          >
            {/* Glow Burst */}
            <motion.div 
              className="absolute inset-0 rounded-full bg-blue-500 blur-3xl opacity-0"
              animate={{ opacity: [0, 0.8, 0], scale: [0.5, 2, 0.5] }}
              transition={{ duration: 0.5 }}
            />
            <div className="relative flex flex-col items-center gap-2">
              <div className="opacity-80"><CrosswordRow /></div>
              <div className="opacity-80"><CrosswordColumn /></div>
            </div>
          </motion.div>
        )}

        {stage === 'reveal' && (
          <motion.div 
            className="flex flex-col items-center justify-center text-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <motion.h1 
              className="text-6xl md:text-8xl font-black tracking-tighter"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ 
                type: 'spring',
                stiffness: 200,
                damping: 25,
                delay: 0.2
              }}
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 drop-shadow-2xl">
                CROSSWORD HUB
              </span>
            </motion.h1>
            
            <motion.p 
              className="mt-6 text-xl md:text-2xl text-slate-400 font-medium max-w-2xl leading-relaxed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              Unleash your curiosity. Enter a topic or upload a document, and our AI will craft a unique crossword puzzle from it.
            </motion.p>

            {/* Particle Glow effect behind logo */}
            <div className="absolute -z-10 w-64 h-64 bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
