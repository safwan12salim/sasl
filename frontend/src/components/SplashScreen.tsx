import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [visible, setVisible] = useState(true);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(2500 - elapsed, 0);

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onFinish, 500);
    }, remaining);

    return () => clearTimeout(timer);
  }, [onFinish, startTime]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Animated background */}
          <div className="absolute inset-0 bg-gray-950">
            <div className="absolute inset-0 bg-gradient-to-br from-sasl-green/20 via-gray-950 to-sasl-orange/20" />
            
            {/* Floating orbs */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full blur-2xl"
                style={{
                  width: `${Math.random() * 300 + 100}px`,
                  height: `${Math.random() * 300 + 100}px`,
                  background: i % 2 === 0 
                    ? 'rgba(0,168,107,0.15)' 
                    : 'rgba(255,127,17,0.12)',
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  x: [0, Math.random() * 100 - 50, 0],
                  y: [0, Math.random() * -100 - 50, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: Math.random() * 8 + 6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}

            {/* Mesh connection lines */}
            <svg className="absolute inset-0 w-full h-full opacity-20">
              {[...Array(6)].map((_, i) => (
                <motion.line
                  key={i}
                  x1={`${Math.random() * 100}%`}
                  y1={`${Math.random() * 100}%`}
                  x2={`${Math.random() * 100}%`}
                  y2={`${Math.random() * 100}%`}
                  stroke={i % 2 === 0 ? '#00A86B' : '#FF7F11'}
                  strokeWidth="0.5"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.4 }}
                  transition={{ duration: 2, delay: i * 0.3 }}
                />
              ))}
            </svg>
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Pulsing ring behind logo */}
            <motion.div
              className="absolute w-40 h-40 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, #00A86B, #FF7F11, #00A86B)',
                filter: 'blur(30px)',
                opacity: 0.3,
              }}
              animate={{ rotate: 360, scale: [1, 1.2, 1] }}
              transition={{ rotate: { duration: 4, repeat: Infinity, ease: 'linear' }, scale: { duration: 2, repeat: Infinity } }}
            />

            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            >
              <Logo className="text-7xl md:text-8xl relative z-10" />
            </motion.div>

            <motion.p
              className="text-white/80 mt-6 text-xl md:text-2xl font-light tracking-wider text-center px-4"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              Social Asynchronous Sharing Layer
            </motion.p>

            <motion.div
              className="mt-10 w-56 h-1 bg-white/10 rounded-full overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #00A86B, #FF7F11, #00A86B)',
                  backgroundSize: '200% 100%',
                }}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.0, delay: 0.5, ease: 'easeInOut' }}
              />
            </motion.div>

            <motion.p
              className="text-white/30 mt-4 text-sm tracking-widest uppercase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.5 }}
            >
              Offline-First Social Network
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;