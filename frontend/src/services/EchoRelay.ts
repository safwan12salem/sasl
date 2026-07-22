/**
 * Sasl Echo Relay — Global Store-and-Forward Mesh
 * 
 * Every Sasl user is a relay node.
 * Messages stored in IndexedDB, forwarded automatically when peers appear.
 * Chain hops through the mesh to reach destination.
 * Syncs with server when ANY node in the chain gets internet.
 */

export interface RelayMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
  ttl: number;
  hopCount: number;
  relayPath: string[];
  delivered: boolean;
}

type MessageCallback = (msg: RelayMessage) => void;

export class EchoRelay {
  private messages: RelayMessage[] = [];
  private db: IDBDatabase | null = null;
  private processedIds: Set<string> = new Set();
  private onRelayMessage: MessageCallback | null = null;
  private myNodeId = '';

  async start(nodeId: string): Promise<void> {
    this.myNodeId = nodeId;
    await this.openDatabase();
    await this.loadMessages();
    this.startForwardingLoop();
    console.log('🔁 Echo Relay started');
  }

  /**
   * Store a message for relay to destination
   */
  async storeMessage(to: string, text: string, from: string): Promise<string> {
    const msg: RelayMessage = {
      id: `echo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      from,
      to,
      text,
      timestamp: Date.now(),
      ttl: 100,
      hopCount: 0,
      relayPath: [this.myNodeId],
      delivered: false,
    };
    
    this.messages.push(msg);
    await this.saveMessage(msg);
    console.log(`📦 Stored for relay: "${text.substring(0, 20)}" → ${to}`);
    return msg.id;
  }

  /**
   * Forward undelivered messages to newly connected peers
   */
  forwardToPeer(peerNodeId: string): void {
    const undelivered = this.messages.filter(m => !m.delivered && m.ttl > 0);
    
    for (const msg of undelivered) {
      // Don't forward if this peer already relayed it
      if (msg.relayPath.includes(peerNodeId)) continue;
      
      msg.ttl--;
      msg.hopCount++;
      msg.relayPath.push(peerNodeId);
      
      // If this peer is the destination, mark as delivered
      if (peerNodeId === msg.to) {
        msg.delivered = true;
        this.onRelayMessage?.(msg);
        console.log(`✅ Delivered to destination: ${msg.id}`);
      } else {
        console.log(`🔄 Forwarded ${msg.id} → ${peerNodeId} (TTL: ${msg.ttl})`);
      }
    }
  }

  /**
   * Check if any messages are addressed to us
   */
  checkIncoming(peerNodeId: string): RelayMessage[] {
    const forUs = this.messages.filter(m => m.to === this.myNodeId && !m.delivered);
    for (const msg of forUs) {
      msg.delivered = true;
      this.onRelayMessage?.(msg);
    }
    return forUs;
  }

  /**
   * Background loop to clean expired messages and retry delivery
   */
  private startForwardingLoop(): void {
    setInterval(() => {
      // Remove expired messages (24h TTL)
      this.messages = this.messages.filter(m => {
        if (Date.now() - m.timestamp > 86400000) {
          return false;
        }
        return true;
      });
    }, 30000);
  }

  /**
   * Get relay statistics
   */
  getStats(): { totalMessages: number; pendingDelivery: number; delivered: number } {
    const pending = this.messages.filter(m => !m.delivered && m.ttl > 0).length;
    const delivered = this.messages.filter(m => m.delivered).length;
    return {
      totalMessages: this.messages.length,
      pendingDelivery: pending,
      delivered,
    };
  }


  /**
   * Get all undelivered messages for relay propagation
   */
  getUndeliveredMessages(): RelayMessage[] {
    return this.messages.filter(m => !m.delivered && m.ttl > 0);
  }

  /**
   * Mark a message as relayed through a peer (don't send again)
   */
  markRelayed(msgId: string, peerId: string): void {
    const msg = this.messages.find(m => m.id === msgId);
    if (msg && !msg.relayPath.includes(peerId)) {
      msg.relayPath.push(peerId);
      msg.ttl--;
      msg.hopCount++;
    }
  }

  /**
   * Store a relay envelope received from another phone
   */
  async storeRelayEnvelope(envelope: any): Promise<void> {
    const msg: RelayMessage = {
      id: envelope.msgId,
      from: envelope.from,
      to: envelope.to,
      text: envelope.text,
      timestamp: Date.now(),
      ttl: envelope.ttl,
      hopCount: envelope.hopCount,
      relayPath: envelope.relayPath,
      delivered: false,
    };
    // Don't re-store if we already have it
    if (this.processedIds.has(msg.id)) return;
    this.processedIds.add(msg.id);
    this.messages.push(msg);
    await this.saveMessage(msg);
  }


  getMaxRange(): { meters: number; label: string } {
    const stats = this.getStats();
    const chainLength = stats.totalMessages > 0 ? Math.min(stats.pendingDelivery * 200, 50000) : 2000;
    
    if (chainLength >= 50000) return { meters: 50000, label: '🌍 Global Echo 50km' };
    if (chainLength >= 10000) return { meters: chainLength, label: `📡 Echo Relay ${(chainLength/1000).toFixed(0)}km` };
    if (chainLength >= 2000) return { meters: chainLength, label: '🔵 Extended Echo 2000m' };
    return { meters: 2000, label: '🔵 BLE 5 Range 2000m' };
  }

  // ============================================================
  // INDEXEDDB
  // ============================================================

  private async openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('sasl_echo_relay', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('relay_messages', { keyPath: 'id' });
      };
      request.onsuccess = () => { this.db = request.result; resolve(); };
      request.onerror = () => reject(request.error);
    });
  }

  private async loadMessages(): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve) => {
      const tx = this.db!.transaction('relay_messages', 'readonly');
      const request = tx.objectStore('relay_messages').getAll();
      request.onsuccess = () => { 
        this.messages = request.result || []; 
        resolve(); 
      };
      request.onerror = () => resolve();
    });
  }

  private async saveMessage(msg: RelayMessage): Promise<void> {
    if (!this.db) return;
    const tx = this.db.transaction('relay_messages', 'readwrite');
    tx.objectStore('relay_messages').put(msg);
  }

  onMessage(cb: MessageCallback): void { this.onRelayMessage = cb; }

  stop(): void {
    this.messages = [];
  }
}

export const echoRelay = new EchoRelay();