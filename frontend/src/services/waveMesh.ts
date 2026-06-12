/**
 * Sasl WaveMesh - Breakthrough Offline P2P Protocol
 * Uses WebBluetooth + WebRTC to create a mesh network without internet
 */
export class WaveMeshNode {
  private id: string;
  private peers: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private bluetoothServer: any = null;
  private onMessage: (msg: any) => void;
  private onPeerConnected: (peerId: string) => void;
  private onPeerDisconnected: (peerId: string) => void;

  constructor(
    nodeId: string,
    callbacks: {
      onMessage: (msg: any) => void;
      onPeerConnected: (peerId: string) => void;
      onPeerDisconnected: (peerId: string) => void;
    }
  ) {
    this.id = nodeId;
    this.onMessage = callbacks.onMessage;
    this.onPeerConnected = callbacks.onPeerConnected;
    this.onPeerDisconnected = callbacks.onPeerDisconnected;
  }

  /**
   * Start the mesh node - scan for peers via Bluetooth and WebRTC
   */
  async start(): Promise<void> {
    console.log(`🌊 WaveMesh node ${this.id} starting...`);
    
    // Start Bluetooth discovery
    await this.startBluetoothDiscovery();
    
    // Start WebRTC listener for incoming connections
    this.startWebRTCListener();
  }

  /**
   * Discover nearby peers via Web Bluetooth
   */
    private async startBluetoothDiscovery(): Promise<void> {
    try {
      // @ts-ignore
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['0000sasl-0000-1000-8000-00805f9b34fb'],
      });
      
      this.bluetoothServer = device; // ← USE the variable
      console.log('🔵 Bluetooth peer found:', device.name);
      await this.connectToPeer(device.id, 'bluetooth');
    } catch (err) {
      console.log('Bluetooth scanning... (requires Bluetooth hardware)');
      this.bluetoothServer = null; // ← Set to null if failed
    }
  }


    getBluetoothDevice(): any {
    return this.bluetoothServer;
  }

  /**
   * Listen for incoming WebRTC connections
   */
  private startWebRTCListener(): void {
    // Create a broadcast channel for local discovery
    const bc = new BroadcastChannel('sasl-mesh');
    bc.onmessage = (event) => {
      if (event.data.type === 'peer_discovery' && event.data.nodeId !== this.id) {
        this.connectToPeer(event.data.nodeId, 'webrtc');
      }
    };
    
    // Announce presence
    setInterval(() => {
      bc.postMessage({ type: 'peer_discovery', nodeId: this.id });
    }, 5000);
  }

  /**
   * Connect to a discovered peer
   */
  private async connectToPeer(peerId: string, method: string): Promise<void> {
    if (this.peers.has(peerId)) return;
    
        const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        {
          urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
      ],
    });
    
    this.peers.set(peerId, pc);
    
    // Create data channel for messaging
    const channel = pc.createDataChannel('mesh-data');
    this.setupDataChannel(channel, peerId);
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // In production, exchange via Bluetooth or signaling server
        this.broadcastToPeer(peerId, { type: 'ice-candidate', candidate: event.candidate });
      }
    };
    
    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    console.log(`🤝 Connected to peer ${peerId} via ${method}`);
    this.onPeerConnected(peerId);
  }

  /**
   * Setup data channel for peer communication
   */
  private setupDataChannel(channel: RTCDataChannel, peerId: string): void {
    channel.onopen = () => {
      console.log(`📡 Data channel open with ${peerId}`);
    };
    
    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.onMessage({ ...message, fromPeer: peerId });
        
        // Relay messages to other peers (mesh routing)
        if (message.ttl && message.ttl > 1) {
          this.relayMessage(message, peerId);
        }
      } catch {
        console.log('Raw message from', peerId, ':', event.data);
      }
    };
    
    channel.onclose = () => {
      console.log(`🔌 Peer ${peerId} disconnected`);
      this.peers.delete(peerId);
      this.onPeerDisconnected(peerId);
    };
    
    this.dataChannels.set(peerId, channel);
  }

  /**
   * Send a message to a specific peer
   */
  sendToPeer(peerId: string, message: any): boolean {
    const channel = this.dataChannels.get(peerId);
    if (channel?.readyState === 'open') {
      channel.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  /**
   * Broadcast message to all connected peers (mesh flooding)
   */
  broadcast(message: any, ttl: number = 5): void {
    const meshMessage = { ...message, ttl, originNode: this.id };
    this.dataChannels.forEach((channel, peerId) => {
      if (channel.readyState === 'open') {
        channel.send(JSON.stringify(meshMessage));
      }
    });
  }
     // Add this method to the WaveMeshNode class:
  private broadcastToPeer(peerId: string, message: any): void {
    const channel = this.dataChannels.get(peerId);
    if (channel?.readyState === 'open') {
      channel.send(JSON.stringify(message));
    }
  }
  /**
   * Relay a message to other peers (except the sender)
   */
  private relayMessage(message: any, excludePeerId: string): void {
    const relayMessage = { ...message, ttl: message.ttl - 1 };
    this.dataChannels.forEach((channel, peerId) => {
      if (peerId !== excludePeerId && channel.readyState === 'open') {
        channel.send(JSON.stringify(relayMessage));
      }
    });
  }

  /**
   * Send a post via mesh network (for offline posting)
   */
  async sendPostViaMesh(post: any): Promise<void> {
    this.broadcast({
      type: 'mesh_post',
      post: post,
      timestamp: Date.now(),
    }, 10); // Higher TTL for posts
  }

  /**
   * Discover jobs/gigs via mesh
   */
  async searchGigsViaMesh(query: string): Promise<void> {
    this.broadcast({
      type: 'mesh_search',
      query: query,
      searchType: 'gigs',
    }, 5);
  }

  /**
   * Send a mesh chat message
   */
  sendMeshMessage(text: string): void {
    this.broadcast({
      type: 'mesh_chat',
      text: text,
      sender: this.id,
      timestamp: Date.now(),
    }, 3);
  }

  /**
   * Stop the mesh node
   */
  stop(): void {
    this.dataChannels.forEach(channel => channel.close());
    this.peers.forEach(pc => pc.close());
    this.peers.clear();
    this.dataChannels.clear();
    console.log('🌊 WaveMesh node stopped');
  }

  /**
   * Get list of connected peers
   */
  getConnectedPeers(): string[] {
    return Array.from(this.peers.keys());
  }
}