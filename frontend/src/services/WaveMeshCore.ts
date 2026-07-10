/**
 * Sasl WaveMesh Core 3.0 — Direct P2P + Echo Relay
 * 
 * Direct: BLE 5 Long Range (2000m) + WiFi Direct chain
 * Relay: Store-and-forward mesh with IndexedDB
 * Sync: Auto-syncs when any node gets internet
 */

import { directP2P, DirectPeer } from './DirectP2P';
import { echoRelay, RelayMessage } from './EchoRelay';

export interface MeshIdentity {
  id: string;
  username: string;
  avatar: string | null;
}

export interface MeshPeer {
  id: string;
  username: string;
  distance: number;
  connectionType: string;
  lastSeen: number;
}

type Callback = (data: any) => void;

class WaveMeshCore {
  private identity: MeshIdentity | null = null;
  private started = false;

  private onPeerDiscovered: Callback | null = null;
  private onPeerConnected: Callback | null = null;
  private onMessageReceived: Callback | null = null;
  private onRoomCreated: Callback | null = null;

  async start(username: string, avatar: string | null): Promise<void> {
    if (this.started) return;
    this.started = true;

    this.identity = {
      id: `sasl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      username,
      avatar,
    };
    localStorage.setItem('sasl_mesh_identity', JSON.stringify(this.identity));

    // Start Direct P2P
    await directP2P.start(username);
    await directP2P.startScanning();

    // Start Echo Relay
    await echoRelay.start(this.identity.id);

    // Wire Direct P2P → Echo Relay
    directP2P.onPeerFound((peer: DirectPeer) => {
      this.onPeerDiscovered?.(peer);
      // Auto-forward queued messages to new peer
      echoRelay.forwardToPeer(peer.id);
      echoRelay.checkIncoming(peer.id);
    });

    directP2P.onPeerConnect((peerId: string, type: string) => {
      this.onPeerConnected?.({ peerId, username: 'Peer', type });
      this.onRoomCreated?.({ peerId, username: 'Peer' });
    });

    directP2P.onMessageReceived((from: string, text: string) => {
      this.onMessageReceived?.({
        id: `msg_${Date.now()}`,
        from,
        text,
        type: 'text',
        timestamp: Date.now(),
      });
    });

    echoRelay.onMessage((msg: RelayMessage) => {
      if (msg.to === this.identity?.id) {
        this.onMessageReceived?.({
          id: msg.id,
          from: msg.from,
          text: msg.text,
          type: 'text',
          timestamp: msg.timestamp,
        });
      }
    });

    console.log(`🌊 Sasl WaveMesh 3.0 started: @${username}`);
    console.log(`   Range: ${directP2P.getMaxRange().label}`);
    console.log(`   Relay: ${echoRelay.getMaxRange().label}`);
  }

  /**
   * Send message to all nearby peers (Direct P2P)
   */
  sendDirectMessage(text: string): void {
    directP2P.sendMessage(text);
    
    if (this.identity) {
      this.onMessageReceived?.({
        id: `msg_${Date.now()}`,
        from: this.identity.username,
        text,
        type: 'text',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Send message to specific peer via Echo Relay
   */
  async sendRelayMessage(to: string, text: string): Promise<string> {
    if (!this.identity) throw new Error('Not started');
    return echoRelay.storeMessage(to, text, this.identity.username);
  }

  generateConnectionCode(): string {
    if (!this.identity) throw new Error('Not started');
    return JSON.stringify({
      type: 'sasl_connect',
      id: this.identity.id,
      username: this.identity.username,
      timestamp: Date.now(),
    });
  }

  processConnectionCode(code: string): { username: string; peerId: string } | null {
    try {
      const data = JSON.parse(code);
      if (data.type === 'sasl_connect') {
        this.onPeerConnected?.({ peerId: data.id, username: data.username });
        this.onRoomCreated?.({ peerId: data.id, username: data.username });
        return { username: data.username, peerId: data.id };
      }
      return null;
    } catch {
      return null;
    }
  }

  getPeers(): DirectPeer[] {
    return directP2P.getPeers();
  }

  getStatus(): string {
    const direct = directP2P.getMaxRange();
    const relay = echoRelay.getMaxRange();
    return relay.meters > direct.meters ? relay.label : direct.label;
  }

  getIdentity(): MeshIdentity | null {
    if (!this.identity) {
      const stored = localStorage.getItem('sasl_mesh_identity');
      if (stored) this.identity = JSON.parse(stored);
    }
    return this.identity;
  }

  stop(): void {
    directP2P.stop();
    echoRelay.stop();
    this.started = false;
  }

  setOnPeerDiscovered(cb: Callback): void { this.onPeerDiscovered = cb; }
  setOnPeerConnected(cb: Callback): void { this.onPeerConnected = cb; }
  setOnMessageReceived(cb: Callback): void { this.onMessageReceived = cb; }
  setOnRoomCreated(cb: Callback): void { this.onRoomCreated = cb; }
}

export const waveMeshCore = new WaveMeshCore();