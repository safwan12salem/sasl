/**
 * Sasl - Social Asynchronous Sharing Layer
 * Opening splash screen with animated SL logo and tagline.
 */
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Logo from './Logo';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-sasl-green via-gray-900 to-sasl-orange"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
      >
        <Logo className="text-7xl md:text-8xl" />
      </motion.div>

      <motion.p
        className="text-white/80 mt-6 text-xl md:text-2xl font-light tracking-wider"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        Social Asynchronous Sharing Layer
      </motion.p>

      <motion.div
        className="mt-8 w-16 h-1 bg-gradient-to-r from-sasl-green to-sasl-orange rounded-full"
        initial={{ width: 0 }}
        animate={{ width: 64 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      />
    </motion.div>
  );
};

export default SplashScreen;