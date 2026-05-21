import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface MeshContextType {
  isOnline: boolean;
  offlineQueue: any[];
  toggleOnlineMode: () => void;
  syncOfflinePosts: () => void;
}

const MeshContext = createContext<MeshContextType>({} as MeshContextType);

export function MeshProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
    const raw = localStorage.getItem('sasl_offline_posts');
    return raw ? JSON.parse(raw) : [];
  });

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const toggleOnlineMode = () => {
    setIsOnline(!isOnline);
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