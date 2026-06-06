import React, { useEffect, useState } from 'react';
import { useMesh } from '../hooks/useMesh';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function OfflineIndicator() {
  const { isOnline, offlineQueue } = useMesh();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [isOnline]);

  return (
    <AnimatePresence>
      {visible && !isOnline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-center py-2 px-4 z-50 font-semibold text-sm flex items-center justify-center gap-2"
        >
          <WifiOff size={16} />
          <span>{t("You're offline – Sasl is still working!")}</span>
          {offlineQueue.length > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {offlineQueue.length} {t('queued')}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}