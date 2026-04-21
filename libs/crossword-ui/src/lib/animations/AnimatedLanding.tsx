import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CrosswordRow } from './CrosswordRow.js';
import { CrosswordHubPiece } from './CrosswordHubPiece.js';

interface AnimatedLandingProps {
  onComplete: () => void;
}

export const AnimatedLanding: React.FC<AnimatedLandingProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'entry' | 'collision' | 'reveal' | 'finished'>('entry');

  useEffect(() => {
    // Stage Transitions for a cinematic feel
    const entryTimeout = setTimeout(() => setStage('collision'), 1000);
    const collisionTimeout = setTimeout(() => setStage('reveal'), 1300);
    const finishTimeout = setTimeout(() => {
      setStage('finished');
      setTimeout(onComplete, 1200); 
    }, 4500);

    return () => {
      clearTimeout(entryTimeout);
      clearTimeout(collisionTimeout);
      clearTimeout(finishTimeout);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#0a0f1a]">
      {/* Deep Space Background */}
      <div className="absolute inset-0 bg-radial-gradient from-blue-900/20 via-slate-950 to-black opacity-80" />
      
      <AnimatePresence>
        {(stage === 'entry' || stage === 'collision') && (
          <div className="relative flex items-center justify-center w-full max-w-7xl h-full">
            {/* Left Piece zooming in */}
            <motion.div 
              className="absolute left-[5%]"
              animate={stage === 'collision' ? { x: '35vw', scale: 0.8, filter: 'blur(10px)' } : {}}
              transition={{ duration: 0.3, ease: 'easeIn' }}
            >
              <CrosswordHubPiece />
            </motion.div>

            {/* Right Piece zooming in */}
            <motion.div 
              className="absolute right-[5%]"
              animate={stage === 'collision' ? { x: '-35vw', scale: 0.8, filter: 'blur(10px)' } : {}}
              transition={{ duration: 0.3, ease: 'easeIn' }}
            >
              <CrosswordRow />
            </motion.div>

            {/* Impact Flare */}
            {stage === 'collision' && (
              <motion.div 
                className="absolute z-50 w-64 h-64 bg-blue-400 rounded-full blur-[100px]"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [1, 4, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 0.5 }}
              />
            )}
          </div>
        )}

        {stage === 'reveal' && (
          <motion.div 
            className="relative flex flex-col items-center justify-center px-10 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            {/* Massive Central Glow Background */}
            <div className="absolute -z-10 w-[600px] h-[400px] bg-blue-500/30 rounded-full blur-[150px] animate-pulse" />
            <div className="absolute -z-10 w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-700" />

            {/* Main Logo Text - MASSIVE SIZE & HIGH-END GRADIENT */}
            <motion.div
              initial={{ scale: 0.7, filter: 'blur(30px)', opacity: 0 }}
              animate={{ scale: 1, filter: 'blur(0px)', opacity: 1 }}
              transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <h1 className="text-8xl md:text-[13rem] font-black tracking-tighter leading-none select-none flex flex-col md:flex-row items-center justify-center">
                <span className="bg-clip-text text-transparent bg-gradient-to-br from-sky-400 via-white to-sky-300 drop-shadow-[0_0_60px_rgba(56,189,248,0.4)]">
                  Crossword
                </span>
                <span className="md:ml-8 bg-clip-text text-transparent bg-gradient-to-br from-indigo-300 via-white to-purple-400 drop-shadow-[0_0_60px_rgba(167,139,250,0.4)]">
                  Hub
                </span>
              </h1>
              
              {/* Central Optical Flare - Bigger and brighter */}
              <motion.div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-sky-200 rounded-full blur-[80px] opacity-30 mix-blend-screen"
                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              />
              
              {/* Double Horizontal Lens Streaks */}
              <motion.div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[1px] w-[200%] bg-gradient-to-r from-transparent via-sky-400 to-transparent mix-blend-screen opacity-50"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 1.2, ease: 'easeOut' }}
              />
              <motion.div 
                className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 h-[3px] w-[180%] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent mix-blend-screen"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1, duration: 1.5, ease: 'easeOut' }}
              />
            </motion.div>
            
            {/* Subtitle - Refined Layout */}
            <motion.div 
              className="mt-12 space-y-3"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 1 }}
            >
              <p className="text-2xl md:text-3xl text-slate-400 font-medium max-w-4xl leading-snug mx-auto">
                Unleash your curiosity. <span className="text-white font-bold underline decoration-blue-500/50 decoration-2 underline-offset-8">Enter a topic</span> or upload a document,
              </p>
              <p className="text-2xl md:text-3xl text-slate-400 font-medium max-w-4xl leading-snug mx-auto italic opacity-80">
                and our AI will craft a unique crossword puzzle from it.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
