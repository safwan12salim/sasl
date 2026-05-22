/**
 * Sasl - Social Asynchronous Sharing Layer
 * Opening splash screen — ALWAYS shows for 2.5 seconds on page load
 */
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
    // Force minimum 2500ms display time
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(2500 - elapsed, 0);

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onFinish, 500); // Wait for exit animation
    }, remaining);

    return () => clearTimeout(timer);
  }, [onFinish, startTime]);

  // Prevent any clicks or interactions during splash
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
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-sasl-green via-gray-900 to-sasl-orange"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* SL Logo */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
          >
            <Logo className="text-7xl md:text-8xl" />
          </motion.div>

          {/* Tagline */}
          <motion.p
            className="text-white/80 mt-6 text-xl md:text-2xl font-light tracking-wider text-center px-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            Social Asynchronous Sharing Layer
          </motion.p>

          {/* Loading bar */}
          <motion.div
            className="mt-10 w-48 h-1.5 bg-white/20 rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-sasl-green to-sasl-orange rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.0, delay: 0.5, ease: 'easeInOut' }}
            />
          </motion.div>

          {/* Subtitle */}
          <motion.p
            className="text-white/40 mt-4 text-sm tracking-widest uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
          >
            Offline-First Social Network
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;