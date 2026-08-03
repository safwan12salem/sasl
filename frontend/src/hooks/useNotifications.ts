import { useEffect, useCallback } from 'react';
import { subscribeToNotifications } from '../services/supabase';
import api from '../services/api';

// Use Supabase real-time with Django polling fallback
export function useNotifications(userId: string | undefined, onNotification: (n: any) => void) {
  useEffect(() => {
    if (!userId) return;
    
    // PRIMARY: Supabase real-time
    const subscription = subscribeToNotifications(userId, (payload) => {
      onNotification(payload.new);
    });
    
    // FALLBACK: Django polling every 30 seconds
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/content/notifications/');
        // Compare with last seen to avoid duplicates
      } catch {}
    }, 30000);
    
    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [userId, onNotification]);
}