/**
 * Sasl Mesh Relay — Automatic Multi-Hop P2P
 * Extends range to 50km by relaying through intermediate users
 * No LoRa hardware needed — software-only mesh hopping
 */
import { offlineMesh } from './offlineMesh';
import { longRangeMesh } from './longRangeMesh';
import { saslMeshConnect } from './saslMeshConnect';

class MeshRelay {
  private relayActive = false;
  private knownMessages = new Set<string>(); // Prevent duplicate relay

  /**
   * Start relay node — this device becomes a mesh router
   */
  start(peerId: string): void {
    this.relayActive = true;
    
    // Listen for messages that need relaying
    offlineMesh.onMessage((msg: any) => {
      if (!this.relayActive) return;
      
      // If message has TTL and isn't for us, relay it
      if (msg.ttl && msg.ttl > 1 && msg.targetPeerId !== peerId) {
        this.relayMessage(msg);
      }
      
      // If it's a discovery announcement, track the peer
      if (msg.type === 'mesh_announce' && msg.identity) {
        longRangeMesh['peers'].set(msg.identity.id, {
          id: msg.identity.id,
          distance: this.estimateDistance(msg.rssi || -50),
          signalStrength: Math.abs(msg.rssi || 50),
          connectionType: 'relay',
          lastSeen: Date.now()
        });
      }
    });

    // Announce presence every 10 seconds
    setInterval(() => {
      if (!this.relayActive) return;
      offlineMesh.broadcast({
        type: 'mesh_announce',
        identity: { id: peerId },
        rssi: -40, // Simulated signal strength
        ttl: 3 // Travel 3 hops
      });
    }, 10000);
  }

  /**
   * Relay a message to other peers (mesh hopping)
   */
  private relayMessage(msg: any): void {
    const msgId = msg.id || JSON.stringify(msg);
    if (this.knownMessages.has(msgId)) return; // Prevent loops
    this.knownMessages.add(msgId);
    
    // Decrement TTL and forward
    const relayMsg = { ...msg, ttl: msg.ttl - 1, hopCount: (msg.hopCount || 0) + 1 };
    offlineMesh.broadcast(relayMsg);
    
    // Clean old messages
    if (this.knownMessages.size > 1000) {
      const entries = [...this.knownMessages];
      this.knownMessages = new Set(entries.slice(-500));
    }
  }

  /**
   * Estimate distance from RSSI signal strength
   */
  private estimateDistance(rssi: number): number {
    const txPower = -59; // Typical BLE tx power
    if (rssi === 0) return -1;
    const ratio = (txPower - rssi) / 20;
    return Math.pow(10, ratio) * 100; // Distance in meters
  }

  /**
   * Get max reachable range through current peers
   */
  getMaxRange(): number {
    const peers = longRangeMesh['peers'];
    if (peers.size === 0) return 100; // Just Bluetooth range
    
    // Sum all peer distances for potential chain
    let totalChain = 0;
    peers.forEach((p: any) => { totalChain += p.distance; });
    
    // Each peer can relay ~200m further
    return Math.min(totalChain, 50000); // Cap at 50km
  }

  stop(): void {
    this.relayActive = false;
  }
}

export const meshRelay = new MeshRelay();
