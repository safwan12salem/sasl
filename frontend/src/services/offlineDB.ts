import Dexie, { Table } from 'dexie';

export interface OfflinePost {
  id: string;
  text: string;
  author: string;
  media_url?: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
}

export interface OfflineProduct {
  id: string;
  title: string;
  price: string;
  seller: string;
  image_url: string | null;
  stock: number;
}

export interface OfflineMessage {
  id?: number;
  roomId: string;
  sender: string;
  text: string;
  timestamp: number;
  type: string;
  fileUrl?: string;
}

export interface FeatureCache {
  id?: number;
  feature: string;
  data: any;
  updated_at: number;
}

export interface OfflineAction {
  id?: number;
  type: string;
  data: any;
  created_at: number;
}

class SaslDB extends Dexie {
  posts!: Table<OfflinePost>;
  products!: Table<OfflineProduct>;
  messages!: Table<OfflineMessage>;
  offlineActions!: Table<OfflineAction>;
  featureCache!: Table<FeatureCache>;

  constructor() {
    super('sasl');
    this.version(5).stores({
      posts: 'id, created_at',
      products: 'id',
      messages: '++id, roomId, timestamp',
      offlineActions: '++id, type, created_at',
      featureCache: '++id, feature, updated_at',
    });
  }
}

export const db = new SaslDB();

// Save feature data to cache
export async function cacheFeatureData(feature: string, data: any) {
  try {
    await db.featureCache.put({ feature, data, updated_at: Date.now() } as any);
  } catch {}
}

// Load feature data from cache
export async function loadCachedFeature(feature: string): Promise<any | null> {
  try {
    const cached = await db.featureCache.where('feature').equals(feature).first();
    return cached?.data || null;
  } catch {
    return null;
  }
}

// Add offline action
export async function queueOfflineAction(type: string, data: any) {
  await db.offlineActions.put({ type, data, created_at: Date.now() } as any);
}

// Get all pending actions
export async function getPendingActions(): Promise<OfflineAction[]> {
  return await db.offlineActions.toArray();
}

// Clear synced action
export async function clearOfflineAction(id: number) {
  await db.offlineActions.delete(id);
}

// Clear old data (older than 7 days)
export async function cleanOldCache() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await db.posts.where('created_at').below(sevenDaysAgo).delete();
  await db.featureCache.where('updated_at').below(sevenDaysAgo).delete();
}