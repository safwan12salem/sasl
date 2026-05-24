import React, { useEffect, useState } from 'react';
import { useMesh } from '../hooks/useMesh';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function SyncProgress() {
  const { isOnline, offlineQueue, syncOfflinePosts } = useMesh();
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0 && !syncing) {
      setSyncing(true);
      setProgress(0);
      setDone(false);
      
      // Simulate sync progress
      const total = offlineQueue.length;
      let current = 0;
      const interval = setInterval(() => {
        current++;
        setProgress((current / total) * 100);
        if (current >= total) {
          clearInterval(interval);
          setDone(true);
          syncOfflinePosts();
          setTimeout(() => setSyncing(false), 2000);
        }
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [isOnline, offlineQueue.length]);

  if (!syncing) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="fixed top-12 right-4 bg-white rounded-xl shadow-lg p-3 z-50 border border-gray-100"
      >
        <div className="flex items-center gap-2 mb-1">
          {done ? (
            <CheckCircle size={16} className="text-green-500" />
          ) : (
            <Cloud size={16} className="text-blue-500" />
          )}
          <span className="text-sm font-semibold">
            {done ? t('Synced!') : t('Syncing offline data...')}
          </span>
        </div>
        <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}