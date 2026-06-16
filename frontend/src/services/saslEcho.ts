/**
 * Sasl Echo Protocol — Global Store-and-Forward Mesh
 * Every user becomes a relay node. Messages hop peer-to-peer across the globe.
 * Uses IndexedDB for offline queue + WebSocket for signaling via PythonAnywhere.
 * 
 * ═══════════════════════════════════════════════════════════
 * ARCHITECTURE:
 *   User A → WebSocket → PythonAnywhere → WebSocket → User B
 *   If User B offline → Store in IndexedDB → Deliver when online
 *   Multi-hop: User A → User C → User D → User B (via relay)
 * ═══════════════════════════════════════════════════════════
 */
import { offlineMesh } from './offlineMesh';

// ============================================================
// CONSTANTS
// ============================================================
const DB_NAME = 'sasl_echo';
const DB_VERSION = 1;
const MAX_HOPS = 50;
const RELAY_TTL = 86400000; // 24 hours
const RECONNECT_DELAY = 5000;
const RELAY_INTERVAL = 30000;
const DISCOVERY_TIMEOUT = 5000;

// ============================================================
// TYPES
// ============================================================
interface EchoMessage {
  id: string;
  from: string;
  to: string;
  data: any;
  hops: number;
  max_hops: number;
  created_at: number;
  ttl: number;
  delivered: boolean;
}

interface PeerInfo {
  id: string;
  region: string;
  last_seen: number;
  is_online: boolean;
}

// ============================================================
// SASL ECHO CLASS
// ============================================================
class SaslEcho {
  private db: IDBDatabase | null = null;
  private ws: WebSocket | null = null;
  private peerId: string = '';
  private region: string = 'global';
  private peers: Map<string, PeerInfo> = new Map();
  private messageCallbacks: Array<(msg: EchoMessage) => void> = [];
  private peerCallbacks: Array<(peers: PeerInfo[]) => void> = [];
  private reconnectTimer: any = null;
  private relayInterval: any = null;
  private isRunning: boolean = false;
  private pendingConnections: Map<string, Promise<void>> = new Map();

  // ============================================================
  // LIFECYCLE
  // ============================================================
  async start(peerId: string, region: string = 'global'): Promise<void> {
    if (this.isRunning) {
      console.log('📡 Sasl Echo already running');
      return;
    }
    
    this.peerId = peerId;
    this.region = region;
    this.isRunning = true;
    
    try {
      await this.openDB();
      await this.connectSignal();
      this.startRelay();
      this.deliverPendingMessages();
      console.log(`📡 Sasl Echo started — peer: ${peerId}, region: ${region}`);
    } catch (err) {
      console.error('📡 Sasl Echo failed to start:', err);
      this.isRunning = false;
    }
  }

  stop(): void {
    this.isRunning = false;
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.relayInterval) {
      clearInterval(this.relayInterval);
      this.relayInterval = null;
    }
    
    this.peers.clear();
    this.pendingConnections.clear();
    console.log('📡 Sasl Echo stopped');
  }

  // ============================================================
  // INDEXEDDB
  // ============================================================
  private openDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('echo_messages')) {
          db.createObjectStore('echo_messages', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('echo_peers')) {
          db.createObjectStore('echo_peers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('echo_delivery_log')) {
          db.createObjectStore('echo_delivery_log', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('📦 Sasl Echo IndexedDB ready');
        resolve();
      };
      
      request.onerror = () => {
        console.error('📦 Sasl Echo IndexedDB failed:', request.error);
        reject(request.error);
      };
    });
  }

  private async storeMessage(msg: EchoMessage): Promise<void> {
    if (!this.db) return;
    try {
      const tx = this.db.transaction('echo_messages', 'readwrite');
      const store = tx.objectStore('echo_messages');
      store.put(msg);
      
      // Also log delivery attempt
      const logTx = this.db.transaction('echo_delivery_log', 'readwrite');
      const logStore = logTx.objectStore('echo_delivery_log');
      logStore.put({
        id: `log_${msg.id}`,
        messageId: msg.id,
        from: msg.from,
        to: msg.to,
        timestamp: Date.now(),
        hops: msg.hops,
        status: 'stored'
      });
    } catch (err) {
      console.warn('Failed to store message:', err);
    }
  }

  async getStoredMessages(): Promise<EchoMessage[]> {
    if (!this.db) return [];
    return new Promise((resolve) => {
      try {
        const db = this.db!;
        const tx = db.transaction('echo_messages', 'readonly');
        const request = tx.objectStore('echo_messages').getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      } catch (err) {
        resolve([]);
      }
    });
  }

  async getDeliveryLog(): Promise<any[]> {
    if (!this.db) return [];
    return new Promise((resolve) => {
      try {
        const db = this.db!;
        const tx = db.transaction('echo_delivery_log', 'readonly');
        const request = tx.objectStore('echo_delivery_log').getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      } catch (err) {
        resolve([]);
      }
    });
  }

  private async deleteMessage(id: string): Promise<void> {
    if (!this.db) return;
    try {
      const tx = this.db.transaction('echo_messages', 'readwrite');
      tx.objectStore('echo_messages').delete(id);
    } catch (err) {
      console.warn('Failed to delete message:', err);
    }
  }

  private async markDelivered(id: string): Promise<void> {
    if (!this.db) return;
    try {
      const logTx = this.db.transaction('echo_delivery_log', 'readwrite');
      const logStore = logTx.objectStore('echo_delivery_log');
      logStore.put({
        id: `log_${id}`,
        messageId: id,
        delivered: true,
        deliveredAt: Date.now(),
        status: 'delivered'
      });
    } catch (err) {
      // Silently fail — delivery log is non-critical
    }
  }

  // ============================================================
  // SIGNALING WEBSOCKET
  // ============================================================
  private connectSignal(): Promise<void> {
    return new Promise((resolve) => {
      const isLocal = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
      const wsUrl = isLocal
        ? `ws://localhost:8000/ws/global/${this.peerId}/${this.region}/`
        : `wss://sasl.pythonanywhere.com/ws/global/${this.peerId}/${this.region}/`;
      
      try {
        this.ws = new WebSocket(wsUrl);
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
        resolve();
        return;
      }
      
      this.ws.onopen = () => {
        console.log('🌐 Sasl Echo connected to global signaling server');
        resolve();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleSignal(data);
        } catch (err) {
          console.warn('Failed to parse signal message:', err);
        }
      };
      
      this.ws.onerror = (err) => {
        console.warn('🌐 Sasl Echo WebSocket error');
      };
      
      this.ws.onclose = (event) => {
        console.log(`🌐 Sasl Echo disconnected (code: ${event.code}) — reconnecting in ${RECONNECT_DELAY / 1000}s`);
        this.ws = null;
        if (this.isRunning) {
          this.reconnectTimer = setTimeout(() => this.connectSignal(), RECONNECT_DELAY);
        }
      };
    });
  }

  // ============================================================
  // SIGNAL HANDLING
  // ============================================================
  private handleSignal(data: any): void {
    if (!data || !data.type) return;
    
    switch (data.type) {
      // ── Peer Discovery ──
      case 'peers_list':
        this.handlePeersList(data);
        break;
      
      case 'peer_update':
        this.handlePeerUpdate(data);
        break;
      
      case 'region_peers':
        this.handleRegionPeers(data);
        break;
      
      // ── WebRTC Signaling ──
      case 'webrtc_offer':
        if (offlineMesh && typeof offlineMesh.handleSignal === 'function') {
          offlineMesh.handleSignal(data.from_peer_id, 'offer', data.offer);
        }
        break;
      
      case 'webrtc_answer':
        if (offlineMesh && typeof offlineMesh.handleSignal === 'function') {
          offlineMesh.handleSignal(data.from_peer_id, 'answer', data.answer);
        }
        break;
      
      case 'ice_candidate':
        if (offlineMesh && typeof offlineMesh.handleSignal === 'function') {
          offlineMesh.handleSignal(data.from_peer_id, 'candidate', data.candidate);
        }
        break;
      
      // ── Echo Messaging ──
      case 'echo_message':
        this.handleEchoMessage(data);
        break;
      
      case 'message_queued':
        console.log('📨 Message queued for offline peer:', data.target_peer_id);
        break;
      
      case 'message_delivered':
        this.handleMessageDelivered(data);
        break;
      
      // ── Ping/Pong ──
      case 'pong':
        console.log(`🌐 Global peers online: ${data.peers_online || 0}`);
        break;
      
      default:
        console.log('📡 Unknown signal type:', data.type);
    }
  }

  private handlePeersList(data: any): void {
    this.peers.clear();
    const peerList = data.peers || [];
    peerList.forEach((pid: string) => {
      if (pid !== this.peerId) {
        this.peers.set(pid, {
          id: pid,
          region: this.region,
          last_seen: Date.now(),
          is_online: true
        });
      }
    });
    this.notifyPeerCallbacks();
    console.log(`🌐 Discovered ${this.peers.size} global peers in ${this.region}`);
  }

  private handlePeerUpdate(data: any): void {
    if (data.action === 'joined') {
      this.peers.set(data.peer_id, {
        id: data.peer_id,
        region: data.region || this.region,
        last_seen: Date.now(),
        is_online: true
      });
    } else if (data.action === 'left') {
      this.peers.delete(data.peer_id);
    }
    this.notifyPeerCallbacks();
  }

  private handleRegionPeers(data: any): void {
    const peerList = data.peers || [];
    peerList.forEach((pid: string) => {
      if (pid !== this.peerId && !this.peers.has(pid)) {
        this.peers.set(pid, {
          id: pid,
          region: data.region,
          last_seen: Date.now(),
          is_online: true
        });
      }
    });
    this.notifyPeerCallbacks();
  }

  private handleEchoMessage(data: any): void {
    const echoMsg: EchoMessage = {
      id: data.message?.id || `echo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: data.from_peer_id,
      to: this.peerId,
      data: data.message,
      hops: data.hops || 0,
      max_hops: data.max_hops || MAX_HOPS,
      created_at: Date.now(),
      ttl: RELAY_TTL,
      delivered: false
    };
    
    // Store message locally
    this.storeMessage(echoMsg);
    
    // Acknowledge delivery to sender
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'message_delivered',
        message_id: echoMsg.id,
        to: echoMsg.from,
        hops: echoMsg.hops
      }));
    }
    
    // Notify listeners
    this.messageCallbacks.forEach(cb => {
      try { cb(echoMsg); } catch (err) { console.warn('Message callback error:', err); }
    });
    
    // If not the final destination, relay further
    if (echoMsg.hops < echoMsg.max_hops) {
      this.relayMessage(echoMsg);
    }
  }

  private handleMessageDelivered(data: any): void {
    this.markDelivered(data.message_id);
    console.log(`✅ Message ${data.message_id} delivered (${data.hops || 0} hops)`);
  }

  private notifyPeerCallbacks(): void {
    const peerArray = Array.from(this.peers.values());
    this.peerCallbacks.forEach(cb => {
      try { cb(peerArray); } catch (err) { console.warn('Peer callback error:', err); }
    });
  }

  // ============================================================
  // RELAY LOGIC
  // ============================================================
  private startRelay(): void {
    if (this.relayInterval) clearInterval(this.relayInterval);
    
    this.relayInterval = setInterval(() => {
      if (this.isRunning) {
        this.checkRelayQueue();
        this.pruneExpiredMessages();
      }
    }, RELAY_INTERVAL);
    
    console.log(`🔄 Relay engine started (interval: ${RELAY_INTERVAL / 1000}s)`);
  }

  private async checkRelayQueue(): Promise<void> {
    try {
      const messages = await this.getStoredMessages();
      const now = Date.now();
      
      for (const msg of messages) {
        // Skip expired messages
        if (now - msg.created_at > msg.ttl) {
          await this.deleteMessage(msg.id);
          continue;
        }
        
        // Skip delivered messages
        if (msg.delivered) continue;
        
        // If we're not the final destination and haven't exceeded hops
        if (msg.to !== this.peerId && msg.hops < msg.max_hops) {
          this.relayMessage(msg);
        }
        
        // If we ARE the final destination and connected to WebSocket
        if (msg.to === this.peerId && this.ws && this.ws.readyState === WebSocket.OPEN) {
          await this.markDelivered(msg.id);
          this.messageCallbacks.forEach(cb => {
            try { cb(msg); } catch (err) {}
          });
        }
      }
    } catch (err) {
      console.warn('Relay check error:', err);
    }
  }

  private relayMessage(msg: EchoMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('📡 Cannot relay — not connected to signaling server');
      return;
    }
    
    this.ws.send(JSON.stringify({
      type: 'echo_relay',
      target_peer_id: msg.to,
      message: msg.data,
      hops: msg.hops + 1,
      max_hops: msg.max_hops
    }));
    
    console.log(`🔄 Relaying: ${msg.from} → ${msg.to} (hop ${msg.hops + 1}/${msg.max_hops})`);
  }

  private async pruneExpiredMessages(): Promise<void> {
    try {
      const messages = await this.getStoredMessages();
      const now = Date.now();
      
      for (const msg of messages) {
        if (now - msg.created_at > msg.ttl) {
          await this.deleteMessage(msg.id);
        }
      }
    } catch (err) {
      console.warn('Prune error:', err);
    }
  }

  private async deliverPendingMessages(): Promise<void> {
    try {
      const messages = await this.getStoredMessages();
      for (const msg of messages) {
        if (msg.to === this.peerId && !msg.delivered) {
          await this.markDelivered(msg.id);
          this.messageCallbacks.forEach(cb => {
            try { cb(msg); } catch (err) {}
          });
        }
      }
    } catch (err) {
      console.warn('Deliver pending error:', err);
    }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  async sendMessage(toPeerId: string, data: any): Promise<string> {
    const msgId = `echo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const msg: EchoMessage = {
      id: msgId,
      from: this.peerId,
      to: toPeerId,
      data,
      hops: 0,
      max_hops: MAX_HOPS,
      created_at: Date.now(),
      ttl: RELAY_TTL,
      delivered: false
    };
    
    await this.storeMessage(msg);
    
    // Try immediate delivery
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'echo_relay',
        target_peer_id: toPeerId,
        message: data,
        hops: 1,
        max_hops: MAX_HOPS
      }));
      console.log(`📤 Message sent to ${toPeerId} via Echo`);
    } else {
      console.log(`📤 Message queued for ${toPeerId} (offline)`);
    }
    
    return msgId;
  }

  async discoverRegion(region: string): Promise<string[]> {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        resolve([]);
        return;
      }
      
      const handler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'region_peers' && data.region === region) {
            this.ws?.removeEventListener('message', handler);
            resolve(data.peers || []);
          }
        } catch {}
      };
      
      this.ws.addEventListener('message', handler);
      this.ws.send(JSON.stringify({ type: 'discover_region', region }));
      
      setTimeout(() => {
        this.ws?.removeEventListener('message', handler);
        resolve([]);
      }, DISCOVERY_TIMEOUT);
    });
  }

  async ping(): Promise<number> {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        resolve(0);
        return;
      }
      
      const handler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
            this.ws?.removeEventListener('message', handler);
            resolve(data.peers_online || 0);
          }
        } catch {}
      };
      
      this.ws.addEventListener('message', handler);
      this.ws.send(JSON.stringify({ type: 'ping' }));
      
      setTimeout(() => {
        this.ws?.removeEventListener('message', handler);
        resolve(0);
      }, 5000);
    });
  }

  onMessage(callback: (msg: EchoMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  onPeerUpdate(callback: (peers: PeerInfo[]) => void): void {
    this.peerCallbacks.push(callback);
  }

  getPeers(): PeerInfo[] {
    return Array.from(this.peers.values());
  }

  getGlobalPeerCount(): number {
    return this.peers.size;
  }

  getStatus(): { isRunning: boolean; peerId: string; region: string; peersOnline: number; wsConnected: boolean } {
    return {
      isRunning: this.isRunning,
      peerId: this.peerId,
      region: this.region,
      peersOnline: this.peers.size,
      wsConnected: this.ws !== null && this.ws.readyState === WebSocket.OPEN
    };
  }
}

// ============================================================
// EXPORT SINGLETON
// ============================================================
export const saslEcho = new SaslEcho();
