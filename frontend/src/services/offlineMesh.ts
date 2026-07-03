/**
 * Sasl OfflineMesh — True P2P mesh networking without internet
 * Features: LAN discovery, WebRTC direct connect, offline queue, signal strength
 */
import { db } from './offlineDB';

interface Peer {
  id: string;
  username: string;
  avatar_url: string | null;
  connection: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  signalStrength: number;
  lastSeen: Date;
  isDirect: boolean;
}

interface QueuedMessage {
  id: string;
  roomId: string;
  content: string;
  message_type: string;
  file_url?: string;
  file_name?: string;
  sender: string;
  timestamp: number;
  delivered: boolean;
}

class OfflineMeshService {
  private peers: Map<string, Peer> = new Map();
  private messageQueue: QueuedMessage[] = [];
  private onMessageCallback: ((msg: any) => void) | null = null;
  private onPeerUpdateCallback: (() => void) | null = null;
  private discoveryChannel: BroadcastChannel | null = null;
  private nodeId: string;

  constructor() {
    this.nodeId = `node_${Math.random().toString(36).substr(2, 9)}`;
    this.loadQueue();
  }

  /**
   * Start mesh — discover peers on LAN via BroadcastChannel
   */
  async start(username: string): Promise<void> {
    console.log(`🌊 OfflineMesh node ${this.nodeId} starting as @${username}...`);
    

     if (this.discoveryChannel) {
      this.discoveryChannel.close();
    }
    // LAN discovery via BroadcastChannel (works across tabs + same network)
    this.discoveryChannel = new BroadcastChannel('sasl-offline-mesh');
    
    this.discoveryChannel.onmessage = (event) => {
      const { type, nodeId, username: peerName } = event.data;
      if (type === 'peer_announce' && nodeId !== this.nodeId) {
        console.log(`🔍 Discovered peer: @${peerName} (${nodeId})`);
        this.connectToPeer(nodeId, peerName);
      }
    };



    // Announce presence every 3 seconds
      const announceInterval = setInterval(() => {
      if (this.discoveryChannel && this.discoveryChannel.name) {
        try {
          this.discoveryChannel.postMessage({
            type: 'peer_announce',
            nodeId: this.nodeId,
            username,
            timestamp: Date.now(),
          });
        } catch (e) {
          console.log('BroadcastChannel closed, stopping announcements');
          clearInterval(announceInterval);
        }
      }
    }, 3000);

    await this.loadQueue();
    this.processQueue();
  }

  /**
   * Connect to a discovered peer via WebRTC
   */
  private async connectToPeer(peerId: string, peerName: string): Promise<void> {
    if (this.peers.has(peerId)) return;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        
       {
          urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
        {
          urls: ['turn:openrelay.metered.ca:443?transport=tcp'],
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
      ],
      iceCandidatePoolSize: 10,
      iceTransportPolicy: 'all', // Try P2P first, fallback to TURN
    });
    

    const peer: Peer = {
      id: peerId,
      username: peerName,
      avatar_url: null,
      connection: pc,
      dataChannel: null,
      signalStrength: 0,
      lastSeen: new Date(),
      isDirect: true,
    };

    this.peers.set(peerId, peer);

    // Create data channel
    const channel = pc.createDataChannel('sasl-mesh', {
      ordered: true,
    });

    channel.onopen = () => {
      console.log(`📡 Direct P2P channel open with @${peerName}`);
      peer.dataChannel = channel;
      peer.signalStrength = 100;
      this.onPeerUpdateCallback?.();
    };

       channel.onmessage = async (event) => {
      try {
        const raw = JSON.parse(event.data);
        
                if (raw.encrypted && raw.ciphertext && raw.iv && raw.key) {
          try {
            const { decryptMessage } = await import('./encryption');
            // Rebuild key from raw
            const rawKey = Uint8Array.from(atob(raw.key), c => c.charCodeAt(0));
            const key = await crypto.subtle.importKey(
              'raw', rawKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
            );
            const decrypted = await decryptMessage(raw.ciphertext, raw.iv, key);
            const data = JSON.parse(decrypted);
            this.onMessageCallback?.(data);
            return;
          } catch (decryptErr) {
            console.warn('E2E decryption failed, trying raw message');
          }
        }
        // Unencrypted message (legacy or fallback)
        this.onMessageCallback?.(raw);
      } catch {
        console.log('Raw message:', event.data);
      }
    };


    channel.onclose = () => {
      console.log(`🔌 @${peerName} disconnected`);
      peer.signalStrength = 0;
      this.onPeerUpdateCallback?.();
    };

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.discoveryChannel?.postMessage({
          type: 'ice_candidate',
          nodeId: this.nodeId,
          targetId: peerId,
          candidate: event.candidate,
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected') {
        peer.signalStrength = 100;
      } else if (pc.iceConnectionState === 'disconnected') {
        peer.signalStrength = 0;
      }
      this.onPeerUpdateCallback?.();
    };

    // Create and send offer
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.discoveryChannel?.postMessage({
        type: 'webrtc_offer',
        nodeId: this.nodeId,
        targetId: peerId,
        offer: pc.localDescription,
      });
    } catch (err) {
      console.error('Failed to create offer:', err);
    }
  }

  /**
   * Send a message to a specific peer
   */
      async sendToPeer(peerId: string, message: any): Promise<boolean> {
    const peer = this.peers.get(peerId);
    if (peer?.dataChannel?.readyState === 'open') {
      // Encrypt message before sending (E2E)
      try {
        const { encryptMessage, getUserCryptoKey } = await import('./encryption');
        const key = await getUserCryptoKey();
        const { ciphertext, iv } = await encryptMessage(JSON.stringify(message), key);
        const rawKey = await crypto.subtle.exportKey('raw', key);
        const keyStr = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
        peer.dataChannel.send(JSON.stringify({ 
          encrypted: true, 
          ciphertext, 
          iv,
          key: keyStr 
        }));
      } catch {
        // Fallback: send unencrypted if encryption fails
        peer.dataChannel.send(JSON.stringify(message));
      }
      return true;
    }
    // Queue if peer not connected
    this.queueMessage(peerId, message);
    return false;
  }
  /**
   * Broadcast to all connected peers
   */
  broadcast(message: any): void {
    this.peers.forEach((peer) => {
      this.sendToPeer(peer.id, message);
    });
  }

  /**
   * Queue a message for later delivery
   */
  private async queueMessage(peerId: string, message: any): Promise<void> {
    const queued: QueuedMessage = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      roomId: peerId,
      content: message.content || message.message?.content || '',
      message_type: message.message_type || message.type || 'text',
      file_url: message.file_url,
      file_name: message.file_name,
      sender: message.sender || 'Me',
      timestamp: Date.now(),
      delivered: false,
    };

    this.messageQueue.push(queued);
    await db.messages.add({
      roomId: peerId,
      sender: queued.sender,
      text: queued.content,
      timestamp: queued.timestamp,
      type: queued.message_type,
      fileUrl: queued.file_url,
    });
  }

  /**
   * Process queued messages when peers connect
   */
  private async processQueue(): Promise<void> {
    const undelivered = this.messageQueue.filter(m => !m.delivered);
    for (const msg of undelivered) {
      const peer = this.peers.get(msg.roomId);
      if (peer?.dataChannel?.readyState === 'open') {
        peer.dataChannel.send(JSON.stringify(msg));
        msg.delivered = true;
      }
    }
    this.messageQueue = this.messageQueue.filter(m => !m.delivered);
  }

  /**
   * Load queued messages from IndexedDB
   */
  private async loadQueue(): Promise<void> {
    try {
      const msgs = await db.messages
        .where('timestamp')
        .above(Date.now() - 24 * 60 * 60 * 1000)
        .toArray();
      this.messageQueue = msgs.map(m => ({
        id: `queue_${m.id}`,
        roomId: m.roomId,
        content: m.text,
        message_type: m.type,
        file_url: m.fileUrl,
        sender: m.sender,
        timestamp: m.timestamp,
        delivered: false,
      }));
    } catch {}
  }

  /**
   * Get all connected peers with signal strength
   */
  getPeers(): Array<{ id: string; username: string; signalStrength: number; isDirect: boolean }> {
    return Array.from(this.peers.values()).map(p => ({
      id: p.id,
      username: p.username,
      signalStrength: p.signalStrength,
      isDirect: p.isDirect,
    }));
  }

  /**
   * Set callback for incoming messages
   */
  onMessage(callback: (msg: any) => void): void {
    this.onMessageCallback = callback;
  }

  /**
   * Set callback for peer updates
   */
  onPeerUpdate(callback: () => void): void {
    this.onPeerUpdateCallback = callback;
  }

    

  /**
   * Handle WebRTC signaling from global mesh server
   */
  handleSignal(fromPeerId: string, signalType: string, data: any): void {
    const peer = this.peers.get(fromPeerId);
    if (!peer) {
      this.connectToPeer(fromPeerId, fromPeerId);
      return;
    }
    
    const pc = peer.connection;
    try {
      if (signalType === 'offer') {
        pc.setRemoteDescription(new RTCSessionDescription(data))
          .then(() => pc.createAnswer())
          .then(answer => {
            pc.setLocalDescription(answer);
            this.discoveryChannel?.postMessage({
              type: 'webrtc_answer',
              from: this.nodeId,
              to: fromPeerId,
              answer
            });
          });
      } else if (signalType === 'answer') {
        pc.setRemoteDescription(new RTCSessionDescription(data));
      } else if (signalType === 'candidate') {
        pc.addIceCandidate(new RTCIceCandidate(data));
      }
    } catch (err) {
      console.warn('Error handling signal:', err);
    }
  }

  /**
   * Stop the mesh
   */
  

    stop(): void {
    this.discoveryChannel?.close();
    this.peers.forEach(peer => {
      peer.dataChannel?.close();
      peer.connection.close();
    });
    this.peers.clear();
    console.log('🌊 OfflineMesh stopped');
  }
}

export const offlineMesh = new OfflineMeshService();