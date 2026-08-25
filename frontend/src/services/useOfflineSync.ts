import { useEffect, useState } from 'react';
import { cacheFeatureData, loadCachedFeature, getPendingActions, clearOfflineAction } from './offlineDB';
import api from './api';

export function useOfflineSync(feature: string, fetchFn: () => Promise<any>) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingActions();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncPendingActions = async () => {
    const actions = await getPendingActions();
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'create_tutoring_session':
            await api.post('/tutoring/sessions/', action.data);
            break;
          case 'create_gig':
            await api.post('/gigs/gigs/', action.data);
            break;
          case 'create_stream':
            await api.post('/streaming/streams/', action.data);
            break;
          case 'create_reel':
            await api.post('/content/reels/', action.data);
            break;
          case 'submit_note':
            await api.post(`/tutoring/sessions/${action.data.sessionId}/submit_note/`, action.data);
            break;
          case 'create_audio_room':
            await api.post('/liveaudio/rooms/', action.data);
            break;
          case 'create_campaign':
            await api.post('/creatorstudio/campaigns/', action.data);
            break;
          case 'send_snap':
            await api.post('/snaps/snaps/', action.data);
            break;
        }
        if (action.id) await clearOfflineAction(action.id);
      } catch (e) {
        console.log(`Failed to sync ${action.type}:`, e);
      }
    }
    // Refetch after sync
    await loadFeatureData();
  };

  const loadFeatureData = async () => {
    try {
      if (navigator.onLine) {
        const data = await fetchFn();
        await cacheFeatureData(feature, data);
        return data;
      } else {
        const cached = await loadCachedFeature(feature);
        return cached;
      }
    } catch {
      const cached = await loadCachedFeature(feature);
      return cached;
    }
  };

  return { isOnline, loadFeatureData, syncPendingActions };
}