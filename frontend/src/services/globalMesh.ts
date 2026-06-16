/**
 * Sasl Global Mesh — Hybrid P2P + Echo Relay + Server Bridge
 * Routes messages through the best available path:
 * 1. Direct WebRTC P2P (fastest)
 * 2. Sasl Echo relay (multi-hop via other users)
 * 3. Server relay (PythonAnywhere bridge)
 */
import { offlineMesh } from './offlineMesh';
import { saslEcho } from './saslEcho';

type MeshRoute = 'direct' | 'echo' | 'server' | 'queued';

interface RoutingDecision {
  route: MeshRoute;
  latency: number;
  reliability: number;
}

class GlobalMesh {
  private peerId: string = '';
  private region: string = 'global';
  private messageQueue: Array<{ target: string; data: any; timestamp: number }> = [];
  private onMessageCallbacks: Array<(msg: any, route: MeshRoute) => void> = [];
  private onPeerCallbacks: Array<(peers: any[]) => void> = [];

  async start(peerId: string, region: string = 'global'): Promise<void> {
    this.peerId = peerId;
    this.region = region;

    // Start all mesh layers
    offlineMesh.start(peerId);
    await saslEcho.start(peerId, region);

    // Listen for messages from all layers
    offlineMesh.onMessage((msg: any) => {
      this.onMessageCallbacks.forEach(cb => cb(msg, 'direct'));
    });

    saslEcho.onMessage((echoMsg) => {
      this.onMessageCallbacks.forEach(cb => cb(echoMsg.data, 'echo'));
    });

    saslEcho.onPeerUpdate((peers) => {
      const allPeers = [
        ...offlineMesh.getPeers().map(p => ({ ...p, source: 'direct' })),
        ...peers.map(p => ({ id: p.id, username: p.id, signalStrength: p.is_online ? 80 : 0, isDirect: false, region: p.region, source: 'echo' }))
      ];
      this.onPeerCallbacks.forEach(cb => cb(allPeers));
    });

    // Process queued messages
    this.processQueue();

    console.log(`🌍 Global Mesh active — ${peerId} in ${region}`);
  }

  stop(): void {
    offlineMesh.stop();
    saslEcho.stop();
  }

  async sendMessage(targetPeerId: string, data: any): Promise<RoutingDecision> {
    const route = this.selectRoute(targetPeerId);

    switch (route.route) {
      case 'direct':
        // Send via WebRTC directly
        offlineMesh.broadcast({ type: 'global_message', target: targetPeerId, data });
        break;

      case 'echo':
        // Send via Echo relay network
        await saslEcho.sendMessage(targetPeerId, data);
        break;

      case 'queued':
        // Store for later delivery
        this.messageQueue.push({ target: targetPeerId, data, timestamp: Date.now() });
        // Also try Echo (server will queue if peer offline)
        await saslEcho.sendMessage(targetPeerId, data);
        break;

      case 'server':
        // Already handled by Echo (which uses server signaling)
        await saslEcho.sendMessage(targetPeerId, data);
        break;
    }

    return route;
  }

  private selectRoute(targetPeerId: string): RoutingDecision {
    // Check direct P2P availability
    const directPeer = offlineMesh.getPeers().find(p => p.id === targetPeerId);
    if (directPeer && directPeer.signalStrength > 50) {
      return { route: 'direct', latency: 10, reliability: 90 };
    }

    // Check Echo peers
    const echoPeers = saslEcho.getPeers();
    const echoPeer = echoPeers.find(p => p.id === targetPeerId);
    if (echoPeer && echoPeer.is_online) {
      return { route: 'echo', latency: 50, reliability: 80 };
    }

    // Queue for offline delivery
    return { route: 'queued', latency: Infinity, reliability: 60 };
  }

  private async processQueue(): Promise<void> {
    setInterval(() => {
      const now = Date.now();
      this.messageQueue = this.messageQueue.filter(msg => {
        if (now - msg.timestamp > 86400000) return false; // Expire after 24h
        // Retry sending
        this.sendMessage(msg.target, msg.data);
        return false; // Remove from queue (re-added if still queued)
      });
    }, 60000); // Retry every minute
  }

  async discoverGlobalPeers(): Promise<any[]> {
    const directPeers = offlineMesh.getPeers();
    const echoPeers = saslEcho.getPeers();

    // Discover peers in nearby regions
    const regions = ['africa', 'asia', 'europe', 'americas', 'middle_east'];
    for (const r of regions) {
      if (r !== this.region) {
        await saslEcho.discoverRegion(r);
      }
    }

    return [
      ...directPeers.map(p => ({ ...p, source: 'direct', region: this.region })),
      ...echoPeers.map(p => ({ id: p.id, username: p.id, signalStrength: p.is_online ? 80 : 0, source: 'echo', region: p.region }))
    ];
  }

  onMessage(callback: (msg: any, route: MeshRoute) => void): void {
    this.onMessageCallbacks.push(callback);
  }

  onPeerUpdate(callback: (peers: any[]) => void): void {
    this.onPeerCallbacks.push(callback);
  }

  getPeerCount(): { direct: number; echo: number; total: number } {
    return {
      direct: offlineMesh.getPeers().length,
      echo: saslEcho.getGlobalPeerCount(),
      total: offlineMesh.getPeers().length + saslEcho.getGlobalPeerCount()
    };
  }
}

export const globalMesh = new GlobalMesh();
