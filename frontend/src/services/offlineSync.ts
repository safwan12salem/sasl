// When online, syncs offline-created content with backend
import axios from 'axios';

export async function syncOfflineQueue(token: string) {
  const queue = JSON.parse(localStorage.getItem('sasl_offline_posts') || '[]');
  if (queue.length === 0) return;
  for (const item of queue) {
    try {
      await axios.post('/content/posts/', { text: item.text, offline_created: true }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Syncing failed for post', e);
    }
  }
  localStorage.removeItem('sasl_offline_posts');
}