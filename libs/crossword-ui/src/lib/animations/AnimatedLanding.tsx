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

            {/* Main Logo Text - BIG SIZE & MATCHING COLOR */}
            <motion.div
              initial={{ scale: 0.85, filter: 'blur(20px)', y: 20 }}
              animate={{ scale: 1, filter: 'blur(0px)', y: 0 }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <h1 className="text-8xl md:text-[11rem] font-black tracking-tighter leading-none select-none">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#38bdf8] via-[#60a5fa] to-white drop-shadow-[0_0_40px_rgba(56,189,248,0.3)]">
                  Crossword
                </span>
                <span className="ml-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-[#a78bfa] to-[#c084fc] drop-shadow-[0_0_40px_rgba(167,139,250,0.3)]">
                  Hub
                </span>
              </h1>
              
              {/* Central Optical Flare (The bright spot in the image) */}
              <motion.div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white rounded-full blur-2xl opacity-40 mix-blend-screen"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.5, 1], opacity: [0, 0.6, 0.4] }}
                transition={{ delay: 0.5, duration: 1 }}
              />
              
              {/* Horizontal Lens Streak */}
              <motion.div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[2px] w-[150%] bg-gradient-to-r from-transparent via-blue-400 to-transparent mix-blend-screen"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 0.6 }}
                transition={{ delay: 0.7, duration: 0.8 }}
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
