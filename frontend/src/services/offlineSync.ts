// Universal offline sync — queues actions when offline, syncs when online
import axios from 'axios';
import { db } from './offlineDB';

export async function queueOfflineAction(type: string, data: any) {
  await db.offlineActions.add({ type, data, created_at: Date.now() });
  console.log(`📦 Queued offline action: ${type}`);
}

export async function syncOfflineQueue(token: string) {
  const queue = await db.offlineActions.orderBy('created_at').toArray();
  if (queue.length === 0) return;
  
  for (const item of queue) {
    try {
      switch (item.type) {
        case 'create_post':
          await axios.post('/content/posts/', { text: item.data.text, offline_created: true }, { headers: { Authorization: `Bearer ${token}` } });
          break;
        case 'create_campaign':
          await axios.post('/api/creatorstudio/campaigns/', item.data, { headers: { Authorization: `Bearer ${token}` } });
          break;
        case 'create_ad':
          await axios.post('/api/creatorstudio/ads/', item.data, { headers: { Authorization: `Bearer ${token}` } });
          break;
        case 'create_snap':
          await axios.post('/api/snaps/snaps/', item.data, { headers: { Authorization: `Bearer ${token}` } });
          break;
        case 'create_story':
          await axios.post('/api/snaps/post_story/', item.data, { headers: { Authorization: `Bearer ${token}` } });
          break;
        case 'create_audio_room':
          await axios.post('/api/liveaudio/rooms/', item.data, { headers: { Authorization: `Bearer ${token}` } });
          break;
        case 'react_audio':
          await axios.post(`/api/liveaudio/rooms/${item.data.roomId}/react/`, item.data, { headers: { Authorization: `Bearer ${token}` } });
          break;
        case 'create_tutoring_session':
          await axios.post('/tutoring/sessions/', item.data, { headers: { Authorization: `Bearer ${token}` } });
          break;
        case 'create_gig':
          await axios.post('/api/gigs/', item.data, { headers: { Authorization: `Bearer ${token}` } });
          break;
        case 'create_product':
          await axios.post('/api/marketplace/products/', item.data, { headers: { Authorization: `Bearer ${token}` } });
          break;
        case 'update_whiteboard':
          await axios.post(`/api/tutoring/sessions/${item.data.sessionId}/update_whiteboard/`, item.data, { headers: { Authorization: `Bearer ${token}` } });
          break;
        default:
          console.warn(`Unknown offline action: ${item.type}`);
      }
      
      await db.offlineActions.delete(item.id!);
      console.log(`✅ Synced: ${item.type}`);
    } catch (e) {
      console.error(`Failed to sync ${item.type}:`, e);
    }
  }
}

export function setupOfflineSync(token: string) {
  window.addEventListener('online', () => {
    console.log('🟢 Back online — syncing...');
    syncOfflineQueue(token);
  });
}

export function isOnline(): boolean {
  return navigator.onLine;
}