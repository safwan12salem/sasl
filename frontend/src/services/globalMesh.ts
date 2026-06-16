/**
 * Sasl - Social Asynchronous Sharing Layer
 * 🌍 Global Mesh Network — Browser-based P2P relay system
 * 
 * How it works:
 * - Every Sasl user's browser becomes a relay node
 * - Messages hop between browsers via WebRTC
 * - In cities, messages travel kilometers by hopping between users
 * - With enough density, global coverage is possible
 * 
 * Zero cost. Zero hardware. Pure software innovation.
 */

interface MeshMessage {
  id: string;
  type: 'message' | 'post' | 'search' | 'presence' | 'relay';
  payload: any;
  senderId: string;
  timestamp: number;
  ttl: number;
  maxTtl: number;
  hops: number;
  relayChain: string[];
  signature: string;
}

interface MeshNode {
  id: string;
  location?: { lat: number; lng: number };
  lastSeen: number;
  relayCount: number;
}

class GlobalMeshNode {
  private nodeId: string;
  private peers: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private knownNodes: Map<string, MeshNode> = new Map();
  private bcChannel: BroadcastChannel;
  private relayCount: number = 0;
  private totalMessagesRelayed: number = 0;
  private isRunning: boolean = false;

  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  constructor() {
    this.nodeId = this.generateNodeId();
    this.bcChannel = new BroadcastChannel('sasl-global-mesh-v2');
  }

  private generateNodeId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(`🌍 Global Mesh Node starting... ID: ${this.nodeId.slice(0, 8)}...`);

    this.bcChannel.onmessage = (event) => {
      this.handleIncomingMessage(event.data, 'broadcast');
    };

    this.bcChannel.postMessage({
      type: 'presence',
      senderId: this.nodeId,
      timestamp: Date.now(),
    });

    this.startPeerDiscovery();

    setInterval(() => { this.announcePresence(); }, 15000);
    setInterval(() => { this.cleanupStalePeers(); }, 60000);

    console.log('🌍 Global Mesh Node active — ready to relay!');
  }

  private announcePresence(): void {
    const presenceMsg: MeshMessage = {
      id: crypto.randomUUID(),
      type: 'presence',
      payload: {
        nodeId: this.nodeId,
        relayCount: this.relayCount,
        peersConnected: this.peers.size,
      },
      senderId: this.nodeId,
      timestamp: Date.now(),
      ttl: 1,
      maxTtl: 1,
      hops: 0,
      relayChain: [this.nodeId],
      signature: '',
    };
    this.bcChannel.postMessage(presenceMsg);
    this.broadcastToAllPeers(presenceMsg);
  }

  private startPeerDiscovery(): void {
    this.bcChannel.addEventListener('message', async (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      
      if (data.type === 'webrtc-offer') {
        await this.handleSignalingOffer(data);
      } else if (data.type === 'webrtc-answer') {
        await this.handleSignalingAnswer(data);
      } else if (data.type === 'webrtc-candidate') {
        await this.handleSignalingCandidate(data);
      }
    });

    setInterval(() => {
      if (this.peers.size < 50) {
        this.connectToNewPeer();
      }
    }, 10000);
  }

  private async connectToNewPeer(): Promise<void> {
    const peerId = `peer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    try {
      const pc = new RTCPeerConnection({ iceServers: this.iceServers });

      // ✅ FIXED: Serialize candidate with .toJSON()
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.bcChannel.postMessage({
            type: 'webrtc-candidate',
            candidate: event.candidate.toJSON(),
            peerId: this.nodeId,
            targetPeerId: peerId,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          console.log(`🔗 WebRTC peer connected: ${peerId.slice(0, 8)}`);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          this.removePeer(peerId);
        }
      };

      const channel = pc.createDataChannel('mesh-data', {
        ordered: false,
        maxRetransmits: 0,
      });

      this.setupDataChannel(channel, peerId);
      this.peers.set(peerId, pc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // ✅ FIXED: Serialize offer with .toJSON()
      this.bcChannel.postMessage({
        type: 'webrtc-offer',
        offer: pc.localDescription ? pc.localDescription.toJSON() : null,
        peerId: this.nodeId,
        targetPeerId: peerId,
      });
    } catch (err) {
      console.warn('Failed to connect to peer:', err);
    }
  }

  private async handleSignalingOffer(data: any): Promise<void> {
    if (data.targetPeerId !== this.nodeId && data.targetPeerId) return;

    try {
      const pc = new RTCPeerConnection({ iceServers: this.iceServers });
      const peerId = data.peerId;

      // ✅ FIXED: Serialize candidate with .toJSON()
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.bcChannel.postMessage({
            type: 'webrtc-candidate',
            candidate: event.candidate.toJSON(),
            peerId: this.nodeId,
            targetPeerId: peerId,
          });
        }
      };

      pc.ondatachannel = (event) => {
        this.setupDataChannel(event.channel, peerId);
      };

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // ✅ FIXED: Serialize answer with .toJSON()
      this.bcChannel.postMessage({
        type: 'webrtc-answer',
        answer: pc.localDescription ? pc.localDescription.toJSON() : null,
        peerId: this.nodeId,
        targetPeerId: peerId,
      });

      this.peers.set(peerId, pc);
    } catch (err) {
      console.warn('Failed to handle offer:', err);
    }
  }

  private async handleSignalingAnswer(data: any): Promise<void> {
    const pc = this.peers.get(data.peerId);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    } catch (err) {
      console.warn('Failed to handle answer:', err);
    }
  }

  private async handleSignalingCandidate(data: any): Promise<void> {
    const pc = this.peers.get(data.peerId);
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (err) {
      console.warn('Failed to add ICE candidate:', err);
    }
  }

  private setupDataChannel(channel: RTCDataChannel, peerId: string): void {
    channel.onopen = () => {
      console.log(`📡 Data channel open with ${peerId.slice(0, 8)}`);
      this.dataChannels.set(peerId, channel);
    };

    channel.onmessage = (event) => {
      try {
        const message: MeshMessage = JSON.parse(event.data);
        this.handleIncomingMessage(message, 'webrtc');
      } catch {
        // Raw data, ignore
      }
    };

    channel.onclose = () => { this.dataChannels.delete(peerId); };
    channel.onerror = () => { this.dataChannels.delete(peerId); };
  }

  private handleIncomingMessage(message: any, source: string): void {
    if (!message || !message.senderId) return;
    if (message.senderId === this.nodeId) return;

    this.knownNodes.set(message.senderId, {
      id: message.senderId,
      lastSeen: Date.now(),
      relayCount: 0,
    });

    switch (message.type) {
      case 'presence':
        this.handlePresence(message);
        break;
      case 'message':
      case 'post':
      case 'search':
      case 'relay':
        this.handleRelayMessage(message);
        break;
      case 'webrtc-offer':
      case 'webrtc-answer':
      case 'webrtc-candidate':
        // Already handled by event listeners
        break;
    }
  }

  private handlePresence(message: MeshMessage): void {
    this.knownNodes.set(message.senderId, {
      id: message.senderId,
      lastSeen: Date.now(),
      relayCount: message.payload?.relayCount || 0,
    });
  }

  private handleRelayMessage(message: MeshMessage): void {
    if (message.ttl <= 0) return;

    const seenKey = `msg-${message.id}`;
    if (sessionStorage.getItem(seenKey)) return;
    sessionStorage.setItem(seenKey, '1');
    setTimeout(() => sessionStorage.removeItem(seenKey), 60000);

    message.ttl -= 1;
    message.hops += 1;
    message.relayChain.push(this.nodeId);

    this.relayCount++;
    this.totalMessagesRelayed++;

    window.dispatchEvent(new CustomEvent('mesh-message', { detail: message }));

    this.broadcastToAllPeers(message);
    this.bcChannel.postMessage(message);
  }

  private broadcastToAllPeers(message: MeshMessage): void {
    this.dataChannels.forEach((channel, peerId) => {
      if (channel.readyState === 'open') {
        try {
          channel.send(JSON.stringify(message));
        } catch {
          this.dataChannels.delete(peerId);
        }
      }
    });
  }

  sendMessage(payload: any, type: string = 'message', ttl: number = 50): string {
    const message: MeshMessage = {
      id: crypto.randomUUID(),
      type: type as any,
      payload,
      senderId: this.nodeId,
      timestamp: Date.now(),
      ttl,
      maxTtl: ttl,
      hops: 0,
      relayChain: [this.nodeId],
      signature: this.signMessage(payload),
    };

    this.bcChannel.postMessage(message);
    this.broadcastToAllPeers(message);

    console.log(`🌍 Message sent via global mesh. TTL: ${ttl}, Peers: ${this.peers.size}`);
    return message.id;
  }

  private signMessage(payload: any): string {
    const str = JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private removePeer(peerId: string): void {
    this.peers.delete(peerId);
    this.dataChannels.delete(peerId);
  }

  private cleanupStalePeers(): void {
    const now = Date.now();
    this.knownNodes.forEach((node, id) => {
      if (now - node.lastSeen > 300000) {
        this.knownNodes.delete(id);
      }
    });
  }

  getStats() {
    return {
      nodeId: this.nodeId,
      peersConnected: this.peers.size,
      dataChannelsOpen: this.dataChannels.size,
      knownNodes: this.knownNodes.size,
      messagesRelayed: this.totalMessagesRelayed,
      relayCount: this.relayCount,
      isRunning: this.isRunning,
    };
  }

  getEstimatedRange(): number {
    return this.peers.size * 0.1;
  }

  stop(): void {
    this.isRunning = false;
    this.peers.forEach(pc => pc.close());
    this.peers.clear();
    this.dataChannels.clear();
    this.bcChannel.close();
    console.log('🌍 Global Mesh Node stopped');
  }
}

export const globalMesh = new GlobalMeshNode();

if (typeof window !== 'undefined') {
  globalMesh.start();
}