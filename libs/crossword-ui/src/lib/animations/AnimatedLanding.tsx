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
            {/* Central Glow Background */}
            <div className="absolute -z-10 w-[500px] h-[300px] bg-blue-600/20 rounded-full blur-[140px] animate-pulse" />
            <div className="absolute -z-10 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse delay-700" />

            {/* Main Logo Text */}
            <motion.div
              initial={{ scale: 0.9, filter: 'blur(10px)' }}
              animate={{ scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            >
              <h1 className="text-7xl md:text-9xl font-black tracking-tight text-white drop-shadow-[0_0_30px_rgba(56,189,248,0.4)]">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-blue-200 to-white">
                  Crossword
                </span>
                <span className="ml-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-300 to-purple-500">
                  Hub
                </span>
              </h1>
            </motion.div>
            
            {/* Subtitle */}
            <motion.div 
              className="mt-10 space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
            >
              <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-3xl leading-relaxed mx-auto italic">
                Unleash your curiosity. <span className="text-white not-italic font-bold">Enter a topic</span> or upload a document,
              </p>
              <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-3xl leading-relaxed mx-auto italic">
                and our AI will craft a unique crossword puzzle from it.
              </p>
            </motion.div>

            {/* Visual Flare Streak (from the image) */}
            <motion.div 
              className="absolute h-[1px] w-full max-w-4xl bg-gradient-to-r from-transparent via-blue-500 to-transparent top-1/2 opacity-30"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5, duration: 2 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
