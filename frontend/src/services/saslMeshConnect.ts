/**
 * Sasl Mesh Connect — Identity-Based P2P Connection System
 * Two users 50km apart connect by sharing their unique Mesh ID.
 */
import { offlineMesh } from './offlineMesh';

interface MeshIdentity {
  id: string;
  username: string;
  publicKey: string;
  lastSeen: number;
  relayPath: string[];
  range: number;
}

class SaslMeshConnect {
  private identity: MeshIdentity | null = null;
  private knownIdentities: Map<string, MeshIdentity> = new Map();
  private onConnectionEstablished: ((peer: MeshIdentity) => void) | null = null;
  private onMessageReceived: ((from: string, message: any) => void) | null = null;

  registerIdentity(username: string): MeshIdentity {
    const id = `sasl:${username}#${Math.random().toString(36).substring(2, 6)}`;
    this.identity = { id, username, publicKey: '', lastSeen: Date.now(), relayPath: [], range: 0 };
    localStorage.setItem('sasl_mesh_identity', JSON.stringify(this.identity));
    this.announcePresence();
    return this.identity;
  }

  getMeshId(): string | null {
    if (!this.identity) {
      const stored = localStorage.getItem('sasl_mesh_identity');
      if (stored) this.identity = JSON.parse(stored);
    }
    return this.identity?.id || null;
  }

  getShareableCode(): string {
    const id = this.getMeshId();
    return id ? `📡 Sasl Connect: ${id}\n\nOpen Sasl → Mesh Chat → Connect → Enter this ID` : '';
  }

  async connectById(targetMeshId: string): Promise<{ success: boolean; route?: string[]; estimatedTime?: string }> {
    if (!this.identity) return { success: false };
    const directPeers = offlineMesh.getPeers();
    const directPeer = directPeers.find((p: any) => p.id === targetMeshId);
    if (directPeer) return { success: true, route: ['direct'], estimatedTime: 'Instant' };

    const known = this.knownIdentities.get(targetMeshId);
    if (known && Date.now() - known.lastSeen < 60000) {
      return { success: true, route: known.relayPath, estimatedTime: `${known.relayPath.length * 0.5}s` };
    }

    this.broadcastConnectionRequest(targetMeshId);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, estimatedTime: 'Peer not found. Invite more users nearby or check the ID.' });
      }, 15000);

      const checkInterval = setInterval(() => {
        const updated = this.knownIdentities.get(targetMeshId);
        if (updated && Date.now() - updated.lastSeen < 60000) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve({ success: true, route: updated.relayPath, estimatedTime: `${updated.relayPath.length * 0.5}s` });
        }
      }, 1000);
    });
  }

  private broadcastConnectionRequest(targetId: string): void {
    offlineMesh.broadcast({
      type: 'mesh_connect_request',
      targetId,
      fromId: this.identity!.id,
      fromUsername: this.identity!.username,
      timestamp: Date.now(),
      ttl: 50,
      hopCount: 0,
    });
  }

  handleMeshMessage(message: any): void {
    if (message.type === 'mesh_connect_request') {
      if (message.targetId === this.identity?.id) {
        this.sendIdentityResponse(message.fromId, message.hopCount + 1);
        if (this.onMessageReceived) this.onMessageReceived(message.fromUsername, { type: 'connection_request', from: message.fromUsername, fromId: message.fromId });
      } else if (message.ttl > 1) {
        offlineMesh.broadcast({ ...message, ttl: message.ttl - 1, hopCount: message.hopCount + 1 });
      }
    } else if (message.type === 'mesh_identity_response' && message.targetId === this.identity?.id) {
      const peer: MeshIdentity = { ...message.identity, relayPath: Array(message.hopCount).fill('relay'), range: message.hopCount * 200 };
      this.knownIdentities.set(peer.id, peer);
      if (this.onConnectionEstablished) this.onConnectionEstablished(peer);
    } else if (message.type === 'mesh_announce' && message.identity?.id !== this.identity?.id) {
      this.knownIdentities.set(message.identity.id, message.identity);
    } else if (this.onMessageReceived && message.fromUsername) {
      this.onMessageReceived(message.fromUsername, message);
    }
  }

  private sendIdentityResponse(targetId: string, hopCount: number): void {
    if (!this.identity) return;
    offlineMesh.broadcast({
      type: 'mesh_identity_response',
      targetId,
      identity: { id: this.identity.id, username: this.identity.username, publicKey: this.identity.publicKey, lastSeen: Date.now() },
      hopCount,
      ttl: 50,
    });
  }

  private announcePresence(): void {
    if (!this.identity) return;
    setInterval(() => {
      offlineMesh.broadcast({ type: 'mesh_announce', identity: { id: this.identity!.id, username: this.identity!.username, lastSeen: Date.now() }, ttl: 1 });
    }, 10000);
  }

  onConnect(callback: (peer: MeshIdentity) => void): void { this.onConnectionEstablished = callback; }
  onMessage(callback: (from: string, message: any) => void): void { this.onMessageReceived = callback; }

  getKnownPeers(): MeshIdentity[] {
    return Array.from(this.knownIdentities.values()).filter(p => Date.now() - p.lastSeen < 300000).sort((a, b) => a.range - b.range);
  }
}

export const saslMeshConnect = new SaslMeshConnect();
