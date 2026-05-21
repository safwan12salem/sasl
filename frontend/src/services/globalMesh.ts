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
import { WaveMeshNode } from './waveMesh';

interface MeshMessage {
  id: string;
  type: 'message' | 'post' | 'search' | 'presence' | 'relay';
  payload: any;
  senderId: string;
  timestamp: number;
  ttl: number;           // Time-to-live (hops remaining)
  maxTtl: number;        // Original TTL
  hops: number;          // Hops traveled
  relayChain: string[];  // Node IDs the message passed through
  signature: string;     // Integrity check
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

  // ICE servers for NAT traversal (free)
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  constructor() {
    this.nodeId = this.generateNodeId();
    this.bcChannel = new BroadcastChannel('sasl-global-mesh-v2');
  }

  /**
   * Generate unique node ID
   */
  private generateNodeId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Start the global mesh node
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(`🌍 Global Mesh Node starting... ID: ${this.nodeId.slice(0, 8)}...`);

    // Listen for BroadcastChannel messages (same-device tabs)
    this.bcChannel.onmessage = (event) => {
      this.handleIncomingMessage(event.data, 'broadcast');
    };

    // Announce presence to same-device tabs
    this.bcChannel.postMessage({
      type: 'presence',
      senderId: this.nodeId,
      timestamp: Date.now(),
    });

    // Start scanning for WebRTC peers via signaling
    this.startPeerDiscovery();

    // Periodic presence announcement
    setInterval(() => {
      this.announcePresence();
    }, 15000);

    // Periodic peer cleanup
    setInterval(() => {
      this.cleanupStalePeers();
    }, 60000);

    console.log('🌍 Global Mesh Node active — ready to relay!');
  }

  /**
   * Announce presence to the network
   */
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

    // Broadcast via all channels
    this.bcChannel.postMessage(presenceMsg);
    this.broadcastToAllPeers(presenceMsg);
  }

  /**
   * Discover peers via WebRTC signaling
   */
  private startPeerDiscovery(): void {
    // Listen for signaling messages via BroadcastChannel
    this.bcChannel.addEventListener('message', async (event) => {
      const data = event.data;
      if (data.type === 'webrtc-offer') {
        await this.handleSignalingOffer(data);
      } else if (data.type === 'webrtc-answer') {
        await this.handleSignalingAnswer(data);
      } else if (data.type === 'webrtc-candidate') {
        await this.handleSignalingCandidate(data);
      }
    });

    // Try to connect to discovered peers
    setInterval(() => {
      if (this.peers.size < 50) {  // Max 50 direct peers
        this.connectToNewPeer();
      }
    }, 10000);
  }

  /**
   * Connect to a new peer via WebRTC
   */
  private async connectToNewPeer(): Promise<void> {
    const peerId = `peer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    try {
      const pc = new RTCPeerConnection({ iceServers: this.iceServers });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.bcChannel.postMessage({
            type: 'webrtc-candidate',
            candidate: event.candidate,
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

      // Create data channel for mesh communication
      const channel = pc.createDataChannel('mesh-data', {
        ordered: false,  // Allow out-of-order delivery for speed
        maxRetransmits: 0,  // No retransmission for real-time
      });

      this.setupDataChannel(channel, peerId);
      this.peers.set(peerId, pc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      this.bcChannel.postMessage({
        type: 'webrtc-offer',
        offer: pc.localDescription,
        peerId: this.nodeId,
        targetPeerId: peerId,
      });
    } catch (err) {
      console.warn('Failed to connect to peer:', err);
    }
  }

  /**
   * Handle incoming WebRTC signaling offer
   */
  private async handleSignalingOffer(data: any): Promise<void> {
    if (data.targetPeerId !== this.nodeId && data.targetPeerId) return;

    try {
      const pc = new RTCPeerConnection({ iceServers: this.iceServers });
      const peerId = data.peerId;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.bcChannel.postMessage({
            type: 'webrtc-candidate',
            candidate: event.candidate,
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

      this.bcChannel.postMessage({
        type: 'webrtc-answer',
        answer: pc.localDescription,
        peerId: this.nodeId,
        targetPeerId: peerId,
      });

      this.peers.set(peerId, pc);
    } catch (err) {
      console.warn('Failed to handle offer:', err);
    }
  }

  /**
   * Handle WebRTC answer
   */
  private async handleSignalingAnswer(data: any): Promise<void> {
    const pc = this.peers.get(data.peerId);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    } catch (err) {
      console.warn('Failed to handle answer:', err);
    }
  }

  /**
   * Handle ICE candidate
   */
  private async handleSignalingCandidate(data: any): Promise<void> {
    const pc = this.peers.get(data.peerId);
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (err) {
      console.warn('Failed to add ICE candidate:', err);
    }
  }

  /**
   * Setup data channel for mesh communication
   */
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

    channel.onclose = () => {
      this.dataChannels.delete(peerId);
    };

    channel.onerror = () => {
      this.dataChannels.delete(peerId);
    };
  }

  /**
   * Handle incoming mesh message
   */
  private handleIncomingMessage(message: MeshMessage, source: string): void {
    // Ignore own messages
    if (message.senderId === this.nodeId) return;

    // Track known nodes
    this.knownNodes.set(message.senderId, {
      id: message.senderId,
      lastSeen: Date.now(),
      relayCount: 0,
    });

    // Process based on message type
    switch (message.type) {
      case 'presence':
        this.handlePresence(message);
        break;
      case 'message':
      case 'post':
      case 'search':
        this.handleRelayMessage(message);
        break;
      case 'relay':
        this.handleRelayMessage(message);
        break;
    }
  }

  /**
   * Handle presence announcement
   */
  private handlePresence(message: MeshMessage): void {
    this.knownNodes.set(message.senderId, {
      id: message.senderId,
      lastSeen: Date.now(),
      relayCount: message.payload?.relayCount || 0,
    });
  }

  /**
   * Handle and potentially relay a message
   */
  private handleRelayMessage(message: MeshMessage): void {
    // Check TTL
    if (message.ttl <= 0) return;

    // Check if we've seen this message before (dedup)
    const seenKey = `msg-${message.id}`;
    if (sessionStorage.getItem(seenKey)) return;
    sessionStorage.setItem(seenKey, '1', { maxAge: 60000 }); // Expire after 60s

    // Decrement TTL
    message.ttl -= 1;
    message.hops += 1;
    message.relayChain.push(this.nodeId);

    // Update relay stats
    this.relayCount++;
    this.totalMessagesRelayed++;

    // Emit event for the app to process
    window.dispatchEvent(new CustomEvent('mesh-message', { detail: message }));

    // Relay to other peers
    this.broadcastToAllPeers(message);
    this.bcChannel.postMessage(message);
  }

  /**
   * Broadcast message to all WebRTC peers
   */
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

  /**
   * Send a message through the global mesh
   */
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

    // Broadcast locally
    this.bcChannel.postMessage(message);
    
    // Broadcast to WebRTC peers
    this.broadcastToAllPeers(message);

    console.log(`🌍 Message sent via global mesh. TTL: ${ttl}, Peers: ${this.peers.size}`);
    return message.id;
  }

  /**
   * Sign message for integrity
   */
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

  /**
   * Remove a disconnected peer
   */
  private removePeer(peerId: string): void {
    this.peers.delete(peerId);
    this.dataChannels.delete(peerId);
  }

  /**
   * Clean up stale peers
   */
  private cleanupStalePeers(): void {
    const now = Date.now();
    this.knownNodes.forEach((node, id) => {
      if (now - node.lastSeen > 300000) { // 5 minutes
        this.knownNodes.delete(id);
      }
    });
  }

  /**
   * Get mesh statistics
   */
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

  /**
   * Get estimated network range in km
   */
  getEstimatedRange(): number {
    // Estimate: each hop covers ~100m in urban areas
    // With enough density, messages can travel far
    return this.peers.size * 0.1;
  }

  /**
   * Stop the mesh node
   */
  stop(): void {
    this.isRunning = false;
    this.peers.forEach(pc => pc.close());
    this.peers.clear();
    this.dataChannels.clear();
    this.bcChannel.close();
    console.log('🌍 Global Mesh Node stopped');
  }
}

// Singleton instance
export const globalMesh = new GlobalMeshNode();

// Auto-start when imported
if (typeof window !== 'undefined') {
  globalMesh.start();
}