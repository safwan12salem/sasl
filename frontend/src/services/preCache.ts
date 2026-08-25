import api from './api';
import { cacheFeatureData } from './offlineDB';

export async function preCacheAllFeatures() {
  if (!navigator.onLine) return;
  
  try {
    // Fetch all features in parallel
    const [sessions, streams, reels, rooms, groups, products, gigs, campaigns, snaps, posts] = await Promise.all([
      api.get('/tutoring/sessions/').catch(() => null),
      api.get('/streaming/streams/').catch(() => null),
      api.get('/content/reels/').catch(() => null),
      api.get('/liveaudio/rooms/').catch(() => null),
      api.get('/groupchat/groups/').catch(() => null),
      api.get('/marketplace/products/').catch(() => null),
      api.get('/gigs/gigs/').catch(() => null),
      api.get('/creatorstudio/campaigns/').catch(() => null),
      api.get('/snaps/snaps/inbox/').catch(() => null),
      api.get('/content/posts/?page=1').catch(() => null),
    ]);
    
    if (sessions) await cacheFeatureData('tutoring_sessions', sessions.data.results || sessions.data || []);
    if (streams) await cacheFeatureData('streams', streams.data.results || streams.data || []);
    if (reels) await cacheFeatureData('reels', reels.data.results || reels.data || []);
    if (rooms) await cacheFeatureData('audio_rooms', rooms.data.results || rooms.data || []);
    if (groups) await cacheFeatureData('groups', groups.data.results || groups.data || []);
    if (products) await cacheFeatureData('products', products.data.results || products.data || []);
    if (gigs) await cacheFeatureData('gigs', gigs.data.results || gigs.data || []);
    if (campaigns) await cacheFeatureData('creator_studio', campaigns.data.results || campaigns.data || []);
    if (snaps) await cacheFeatureData('snaps', snaps.data.results || snaps.data || []);
    if (posts) await cacheFeatureData('feed', posts.data.results || posts.data || []);
    
    console.log('✅ All features pre-cached');
  } catch (e) {
    console.log('Pre-cache failed:', e);
  }
}