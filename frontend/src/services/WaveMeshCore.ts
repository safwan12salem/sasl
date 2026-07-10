/**
 * Sasl WaveMesh Core 2.0 — Optical P2P Protocol with Auto-Fallback
 * 
 * AUTO-DETECTION:
 * - Two working cameras → Optical channel (continuous, automatic, invisible)
 * - One camera → Hybrid mode (one side optical, other side QR auto-scan)
 * - No cameras → Text code exchange (manual paste)
 */

import { opticalChannel, OpticalMessage } from './OpticalDataChannel';
import { qrHandshake, HandshakeData } from './QRHandshake';
import { meshRelay, RelayNode, RelayMessage } from './MeshRelay';

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
  connectionType: 'optical' | 'qr' | 'text' | 'relay';
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
type ConnectionMode = 'optical' | 'qr' | 'text' | 'unknown';

class WaveMeshCore {
  private identity: MeshIdentity | null = null;
  private peers: Map<string, MeshPeer> = new Map();
  private messageQueue: MeshMessage[] = [];
  private db: IDBDatabase | null = null;
  private connectionMode: ConnectionMode = 'unknown';
  private cameraAvailable = false;
  private handshakeComplete = false;

  private onPeerDiscovered: Callback | null = null;
  private onPeerConnected: Callback | null = null;
  private onPeerDisconnected: Callback | null = null;
  private onMessageReceived: Callback | null = null;
  private onRoomCreated: Callback | null = null;
  private onModeChanged: ((mode: ConnectionMode) => void) | null = null;
  private onQRMessageReady: ((qrData: string, messageText: string) => void) | null = null;

  async start(username: string, avatar: string | null): Promise<void> {
    this.identity = {
      id: `mesh_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      username, avatar,
      publicKey: await this.generatePublicKey(),
    };
    localStorage.setItem('sasl_mesh_identity', JSON.stringify(this.identity));
    await this.openDatabase();
    await this.loadMessageQueue();
    
    // Auto-detect camera availability
    this.cameraAvailable = await this.checkCamera();
    console.log(`📷 Camera available: ${this.cameraAvailable}`);
    console.log(`🌊 Optical Mesh started: @${username}`);
  }

  /**
   * Check if device has a working camera
   */
  private async checkCamera(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Start connection after QR handshake.
   * Auto-detects best mode based on camera availability.
   */
  async startConnection(peerId: string, peerUsername: string): Promise<void> {
    this.handshakeComplete = true;
    
    if (this.cameraAvailable) {
      // Try optical channel first
      try {
        await opticalChannel.start(
          (msg: OpticalMessage) => this.handleIncomingMessage(msg),
          () => this.handleOpticalConnected(peerId, peerUsername)
        );
        this.connectionMode = 'optical';
        this.onModeChanged?.('optical');
        
        // Send identity via optical
        setTimeout(() => this.sendOpticalIdentity(), 500);
        console.log('📡 Optical channel active — continuous mode');
        return;
      } catch {
        console.log('⚠️ Optical channel failed, trying QR mode');
      }
    }
    
    // Fallback to QR mode
    this.connectionMode = 'qr';
    this.onModeChanged?.('qr');
    
    // Create room even in QR mode
    this.onPeerConnected?.({ peerId, username: peerUsername, avatar: null });
    this.onRoomCreated?.({ peerId, username: peerUsername, avatar: null });
    
    console.log('📱 QR message mode active — each message displays as QR');
  }

  /**
   * Send optical identity for handshake
   */
  sendOpticalIdentity(): void {
    if (!this.identity || this.connectionMode !== 'optical') return;
    opticalChannel.sendIdentity(this.identity.username, this.identity.publicKey);
  }

  /**
   * Handle messages from optical channel
   */
  private handleIncomingMessage(msg: OpticalMessage): void {
    if (msg.type === 'identity') {
      try {
        const data = JSON.parse(msg.text);
        const peerId = data.peerId || `opt_${Date.now()}`;
        this.peers.set(peerId, {
          id: peerId, username: data.username || msg.from, avatar: null,
          connected: true, lastSeen: Date.now(), distance: 0,
          connectionType: 'optical',
        });
        if (!this.handshakeComplete) {
          this.onPeerConnected?.({ peerId, username: data.username, avatar: null });
          this.onRoomCreated?.({ peerId, username: data.username, avatar: null });
          this.handshakeComplete = true;
        }
        return;
      } catch {}
    }

    if (msg.type === 'relay') {
      try {
        const relayMsg: RelayMessage = JSON.parse(msg.text);
        meshRelay.relayMessage(relayMsg);
        return;
      } catch {}
    }

    // Regular message
    this.onMessageReceived?.({
      id: msg.id, from: msg.from, text: msg.text,
      type: 'text', timestamp: msg.timestamp,
    });
  }

  /**
   * Handle optical channel connection
   */
  private handleOpticalConnected(peerId: string, peerUsername: string): void {
    this.peers.set(peerId, {
      id: peerId, username: peerUsername, avatar: null,
      connected: true, lastSeen: Date.now(), distance: 0,
      connectionType: 'optical',
    });
    this.onPeerConnected?.({ peerId, username: peerUsername, avatar: null });
    this.onRoomCreated?.({ peerId, username: peerUsername, avatar: null });
  }

  /**
   * Send a message using the active connection mode
   */
  sendMessage(text: string): void {
    if (!this.identity) return;

    switch (this.connectionMode) {
      case 'optical':
        opticalChannel.send(text, this.identity.username);
        break;
      
      case 'qr':
        // Encode message as QR data for other phone to scan
        const qrPayload = JSON.stringify({
          type: 'message',
          id: `qrmsg_${Date.now()}`,
          from: this.identity.username,
          text: text,
          timestamp: Date.now(),
        });
        this.onQRMessageReady?.(qrPayload, text);
        break;
      
      case 'text':
        // Just show the text code for manual exchange
        const textPayload = btoa(JSON.stringify({
          type: 'message',
          from: this.identity.username,
          text: text,
          timestamp: Date.now(),
        }));
        this.onQRMessageReady?.(textPayload, text);
        break;
      
      default:
        // Queue for later
        this.messageQueue.push({
          id: `msg_${Date.now()}`,
          from: this.identity.username,
          text, type: 'text', timestamp: Date.now(),
        });
    }
  }

  /**
   * Process a scanned QR code (from QR mode)
   */
  processQRMessage(qrData: string): void {
    try {
      const msg = JSON.parse(qrData);
      if (msg.type === 'message') {
        this.onMessageReceived?.({
          id: msg.id || `msg_${Date.now()}`,
          from: msg.from,
          text: msg.text,
          type: 'text',
          timestamp: msg.timestamp || Date.now(),
        });
      }
    } catch {
      // Try base64 decode
      try {
        const decoded = JSON.parse(atob(qrData));
        if (decoded.type === 'message') {
          this.onMessageReceived?.({
            id: `msg_${Date.now()}`,
            from: decoded.from,
            text: decoded.text,
            type: 'text',
            timestamp: decoded.timestamp || Date.now(),
          });
        }
      } catch {}
    }
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
      this.startConnection(peer.peerId, peer.username);
    }
    return peer;
  }

  // ============================================================
  // MODE DETECTION
  // ============================================================

  getConnectionMode(): ConnectionMode {
    return this.connectionMode;
  }

  isCameraAvailable(): boolean {
    return this.cameraAvailable;
  }

  setOnModeChanged(cb: (mode: ConnectionMode) => void): void {
    this.onModeChanged = cb;
  }

  setOnQRMessageReady(cb: (qrData: string, messageText: string) => void): void {
    this.onQRMessageReady = cb;
  }

  // ============================================================
  // RELAY
  // ============================================================

  addRelayNode(node: RelayNode): void {
    meshRelay.registerNode(node);
  }

  getRelayRange(): { meters: number; label: string } {
    return meshRelay.getMaxRange();
  }

  // ============================================================
  // IDENTITY + STORAGE (unchanged)
  // ============================================================

  private async generatePublicKey(): Promise<string> {
    try {
      const keyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']
      );
      const exported = await crypto.subtle.exportKey('raw', keyPair.publicKey);
      return btoa(String.fromCharCode(...new Uint8Array(exported)));
    } catch { return `pk_${Date.now()}`; }
  }

  getIdentity(): MeshIdentity | null {
    if (!this.identity) {
      const stored = localStorage.getItem('sasl_mesh_identity');
      if (stored) this.identity = JSON.parse(stored);
    }
    return this.identity;
  }

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

  stop(): void {
    opticalChannel.stop();
    meshRelay.clear();
  }

  getPeers(): MeshPeer[] { return Array.from(this.peers.values()); }
  getConnectedPeers(): MeshPeer[] { return Array.from(this.peers.values()).filter(p => p.connected); }
  getStatus(): string { return meshRelay.getMaxRange().label; }

  setOnPeerDiscovered(cb: Callback): void { this.onPeerDiscovered = cb; }
  setOnPeerConnected(cb: Callback): void { this.onPeerConnected = cb; }
  setOnPeerDisconnected(cb: Callback): void { this.onPeerDisconnected = cb; }
  setOnMessageReceived(cb: Callback): void { this.onMessageReceived = cb; }
  setOnRoomCreated(cb: Callback): void { this.onRoomCreated = cb; }
}

export const waveMeshCore = new WaveMeshCore();