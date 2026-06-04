import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface MeshContextType {
  isOnline: boolean;
  offlineQueue: any[];
  toggleOnlineMode: () => void;
  syncOfflinePosts: () => void;
}

const MeshContext = createContext<MeshContextType>({} as MeshContextType);

export function MeshProvider({ children }: { children: ReactNode }) {
  // Check localStorage first, then fall back to navigator.onLine
  const [isOnline, setIsOnline] = useState(() => {
    const stored = localStorage.getItem('sasl_offline_mode');
    if (stored === 'true') return false; // User explicitly chose offline
    return navigator.onLine;
  });
  
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
    const raw = localStorage.getItem('sasl_offline_posts');
    return raw ? JSON.parse(raw) : [];
  });

  useEffect(() => {
    const update = () => {
      // Only update from browser if user hasn't manually set offline mode
      const stored = localStorage.getItem('sasl_offline_mode');
      if (stored !== 'true') {
        setIsOnline(navigator.onLine);
      }
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const toggleOnlineMode = () => {
    const newState = !isOnline;
    setIsOnline(newState);
    localStorage.setItem('sasl_offline_mode', newState ? 'false' : 'true');
  };

  const syncOfflinePosts = () => {
    setOfflineQueue([]);
    localStorage.removeItem('sasl_offline_posts');
  };

  return (
    <MeshContext.Provider value={{ isOnline, offlineQueue, toggleOnlineMode, syncOfflinePosts }}>
      {children}
    </MeshContext.Provider>
  );
}

export const useMesh = () => useContext(MeshContext);