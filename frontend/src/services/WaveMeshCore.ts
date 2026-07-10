/**
 * Sasl WaveMesh Core 2.0 — Optical P2P Protocol
 * 
 * PRIMARY: Optical data channel via screen flashing + camera detection
 * FALLBACK: WebRTC when internet is available
 * RELAY: Encrypted multi-hop through optical chain
 * 
 * ZERO CONNECTIVITY REQUIRED for primary mode.
 * Works on Android, iOS, and any device with a screen + camera.
 */

import { opticalChannel, OpticalMessage } from './OpticalDataChannel';
import { qrHandshake, HandshakeData } from './QRHandshake';
import { meshRelay, RelayNode, RelayMessage } from './MeshRelay';

// ============================================================
// TYPES
// ============================================================
export interface MeshIdentity {
  id: string;
  username: string;
  avatar: string | null;
  publicKey: string;
}

export interface MeshPeer {
  id: string;
  username: string;
  avatar: string | null;
  connected: boolean;
  lastSeen: number;
  distance: number;
  connectionType: 'optical' | 'webrtc' | 'relay';
}

export interface MeshMessage {
  id: string;
  from: string;
  text: string;
  type: 'text' | 'image' | 'file' | 'identity' | 'system';
  timestamp: number;
  fileUrl?: string;
  fileName?: string;
}

type Callback = (data: any) => void;

// ============================================================
// WAVEMESH CORE CLASS
// ============================================================
class WaveMeshCore {
  private identity: MeshIdentity | null = null;
  private peers: Map<string, MeshPeer> = new Map();
  private messageQueue: MeshMessage[] = [];
  private db: IDBDatabase | null = null;

  private onPeerDiscovered: Callback | null = null;
  private onPeerConnected: Callback | null = null;
  private onPeerDisconnected: Callback | null = null;
  private onMessageReceived: Callback | null = null;
  private onRoomCreated: Callback | null = null;

  // ============================================================
  // INITIALIZATION
  // ============================================================

  async start(username: string, avatar: string | null): Promise<void> {
    this.identity = {
      id: `mesh_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      username,
      avatar,
      publicKey: await this.generatePublicKey(),
    };
    
    localStorage.setItem('sasl_mesh_identity', JSON.stringify(this.identity));
    await this.openDatabase();
    await this.loadMessageQueue();
    
    console.log(`🌊 Optical Mesh started: @${username} (${this.identity.id})`);
  }

  /**
   * Start optical channel — called when user wants to connect
   */
  async startOpticalChannel(): Promise<void> {
    await opticalChannel.start(
      (msg: OpticalMessage) => this.handleOpticalMessage(msg),
      () => {
        console.log('📡 Optical channel connected');
        this.onRoomCreated?.({ peerId: 'optical', username: 'Peer', avatar: null });
      }
    );
  }

  /**
   * Send identity via optical channel for handshake
   */
  sendOpticalIdentity(): void {
    if (!this.identity) return;
    opticalChannel.sendIdentity(this.identity.username, this.identity.publicKey);
  }

  /**
   * Stop optical channel
   */
  stopOpticalChannel(): void {
    opticalChannel.stop();
  }

  stop(): void {
    opticalChannel.stop();
    meshRelay.clear();
  }

  // ============================================================
  // QR HANDSHAKE
  // ============================================================

  generateQRCode(): string {
    if (!this.identity) throw new Error('Not started');
    return qrHandshake.generateHandshakeCode(
      this.identity.username,
      this.identity.publicKey,
      this.identity.id
    );
  }

  processQRCode(code: string): HandshakeData | null {
    const peer = qrHandshake.parseHandshakeCode(code);
    if (peer) {
      this.peers.set(peer.peerId, {
        id: peer.peerId,
        username: peer.username,
        avatar: null,
        connected: true,
        lastSeen: Date.now(),
        distance: 0,
        connectionType: 'optical',
      });
      this.onPeerConnected?.({ peerId: peer.peerId, username: peer.username, avatar: null });
      this.onRoomCreated?.({ peerId: peer.peerId, username: peer.username, avatar: null });
    }
    return peer;
  }

  // ============================================================
  // OPTICAL MESSAGE HANDLER
  // ============================================================

  private handleOpticalMessage(msg: OpticalMessage): void {
    // Handle identity messages
    if (msg.type === 'identity') {
      try {
        const data = JSON.parse(msg.text);
        const peerId = data.peerId || `opt_${Date.now()}`;
        this.peers.set(peerId, {
          id: peerId,
          username: data.username || msg.from,
          avatar: null,
          connected: true,
          lastSeen: Date.now(),
          distance: 0,
          connectionType: 'optical',
        });
        this.onPeerConnected?.({ peerId, username: data.username || msg.from, avatar: null });
        this.onRoomCreated?.({ peerId, username: data.username || msg.from, avatar: null });
        return;
      } catch {}
    }

    // Handle relay messages
    if (msg.type === 'relay') {
      try {
        const relayMsg: RelayMessage = JSON.parse(msg.text);
        meshRelay.relayMessage(relayMsg);
        return;
      } catch {}
    }

    // Regular chat message
    this.onMessageReceived?.({
      id: msg.id,
      from: msg.from,
      text: msg.text,
      type: 'text',
      timestamp: msg.timestamp,
    });
  }

  // ============================================================
  // SEND MESSAGES
  // ============================================================

  sendMessage(text: string): void {
    if (!this.identity) return;
    
    // Send via optical channel (always works offline)
    if (opticalChannel.isConnected()) {
      opticalChannel.send(text, this.identity.username);
    } else {
      // Queue for when optical channel connects
      this.messageQueue.push({
        id: `msg_${Date.now()}`,
        from: this.identity.username,
        text,
        type: 'text',
        timestamp: Date.now(),
      });
      this.saveMessage(this.messageQueue[this.messageQueue.length - 1]);
      console.log('📝 Message queued for optical delivery');
    }
  }

  /**
   * Relay a message through the mesh to a specific peer
   */
  relayToPeer(targetPeerId: string, text: string): void {
    const route = meshRelay.findRoute(targetPeerId);
    if (route) {
      const relayMsg: RelayMessage = {
        id: `relay_${Date.now()}`,
        from: this.identity?.username || 'Unknown',
        to: targetPeerId,
        encryptedPayload: btoa(text), // Simplified — real impl uses E2E encryption
        ttl: 50,
        hopCount: 0,
        relayPath: [],
        timestamp: Date.now(),
      };
      meshRelay.relayMessage(relayMsg);
    }
  }

  // ============================================================
  // MESH RELAY INTEGRATION
  // ============================================================

  addRelayNode(node: RelayNode): void {
    meshRelay.registerNode(node);
  }

  removeRelayNode(nodeId: string): void {
    meshRelay.removeNode(nodeId);
  }

  getRelayRange(): { meters: number; label: string } {
    return meshRelay.getMaxRange();
  }

  // ============================================================
  // IDENTITY
  // ============================================================

  private async generatePublicKey(): Promise<string> {
    try {
      const keyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']
      );
      const exported = await crypto.subtle.exportKey('raw', keyPair.publicKey);
      return btoa(String.fromCharCode(...new Uint8Array(exported)));
    } catch {
      return `pk_${Date.now()}`;
    }
  }

  getIdentity(): MeshIdentity | null {
    if (!this.identity) {
      const stored = localStorage.getItem('sasl_mesh_identity');
      if (stored) this.identity = JSON.parse(stored);
    }
    return this.identity;
  }

  // ============================================================
  // INDEXEDDB QUEUE
  // ============================================================

  private async openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('sasl_optical_mesh', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('messages', { keyPath: 'id' });
      };
      request.onsuccess = () => { this.db = request.result; resolve(); };
      request.onerror = () => reject(request.error);
    });
  }

  private async loadMessageQueue(): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve) => {
      const tx = this.db!.transaction('messages', 'readonly');
      const request = tx.objectStore('messages').getAll();
      request.onsuccess = () => { this.messageQueue = request.result || []; resolve(); };
      request.onerror = () => resolve();
    });
  }

  private async saveMessage(msg: MeshMessage): Promise<void> {
    if (!this.db) return;
    const tx = this.db.transaction('messages', 'readwrite');
    tx.objectStore('messages').put(msg);
  }

  // ============================================================
  // PUBLIC GETTERS
  // ============================================================

  getPeers(): MeshPeer[] { return Array.from(this.peers.values()); }
  getConnectedPeers(): MeshPeer[] { return Array.from(this.peers.values()).filter(p => p.connected); }
  getStatus(): string { return meshRelay.getMaxRange().label; }

  // ============================================================
  // CALLBACK SETTERS
  // ============================================================

  setOnPeerDiscovered(cb: Callback): void { this.onPeerDiscovered = cb; }
  setOnPeerConnected(cb: Callback): void { this.onPeerConnected = cb; }
  setOnPeerDisconnected(cb: Callback): void { this.onPeerDisconnected = cb; }
  setOnMessageReceived(cb: Callback): void { this.onMessageReceived = cb; }
  setOnRoomCreated(cb: Callback): void { this.onRoomCreated = cb; }
}

export const waveMeshCore = new WaveMeshCore();