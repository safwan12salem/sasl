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

class SaslDB extends Dexie {
  posts!: Table<OfflinePost>;
  products!: Table<OfflineProduct>;
  messages!: Table<OfflineMessage>;

  constructor() {
    super('sasl');
    this.version(3).stores({
      posts: 'id, created_at',
      products: 'id',
      messages: '++id, roomId, timestamp',
    });
  }
}

export const db = new SaslDB();

// Clear old data (older than 7 days)
export async function cleanOldCache() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await db.posts.where('created_at').below(sevenDaysAgo).delete();
}