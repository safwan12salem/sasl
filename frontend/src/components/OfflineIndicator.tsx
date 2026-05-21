import React from 'react';
import { useMesh } from '../hooks/useMesh';
import { Wifi, WifiOff, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OfflineIndicator() {
  const { isOnline, offlineQueue } = useMesh();

  if (isOnline) return null;

  return (
    <motion.div
      initial={{ y: -50 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-center py-2 px-4 z-50 font-semibold text-sm flex items-center justify-center gap-2"
    >
      <WifiOff size={16} />
      <span>You're offline – Sasl is still working!</span>
      {offlineQueue.length > 0 && (
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
          {offlineQueue.length} queued
        </span>
      )}
    </motion.div>
  );
}