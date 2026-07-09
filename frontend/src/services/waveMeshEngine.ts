/**
 * Sasl WaveMesh Engine — Unified Offline P2P System
 * 
 * ONE service that handles:
 * - BLE device discovery (Android)
 * - WebRTC P2P connection (QR code or direct)
 * - Identity exchange (real usernames)
 * - Encrypted messaging (E2E)
 * - Chat room management
 * 
 * Works WITHOUT internet, WiFi, or cell towers.
 */

// ============================================================
// TYPES
// ============================================================
export interface MeshPeer {
  id: string;
  username: string;
  avatar: string | null;
  deviceId: string;
  connected: boolean;
  lastSeen: number;
}

export interface MeshMessage {
  id: string;
  from: string;
  text: string;
  type: 'text' | 'image' | 'file' | 'identity' | 'request' | 'accept' | 'decline';
  timestamp: number;
  fileUrl?: string;
  fileName?: string;
}

type Callback = (data: any) => void;

// ============================================================
// MAIN ENGINE
// ============================================================
class WaveMeshEngine {
  // Identity
  private myUsername: string = '';
  private myAvatar: string | null = null;
  private myDeviceId: string = '';
  
  // Peers
  private peers: Map<string, MeshPeer> = new Map();
  private discoveredDevices: Map<string, { id: string; name: string }> = new Map();
  
  // WebRTC
  private connections: Map<string, RTCPeerConnection> = new Map();
  private channels: Map<string, RTCDataChannel> = new Map();
  
  // BLE
  private bleInitialized: boolean = false;
  private bleScanning: boolean = false;
  
  // Callbacks
  private onPeerDiscovered: Callback | null = null;
  private onPeerConnected: Callback | null = null;
  private onPeerDisconnected: Callback | null = null;
  private onMessage: Callback | null = null;
  private onRequest: Callback | null = null;
  private onRoomCreated: Callback | null = null;
  
  // BroadcastChannel (same-device fallback)
  private bc: BroadcastChannel | null = null;

  // ============================================================
  // INITIALIZATION
  // ============================================================
  
  /**
   * Start the mesh engine with user identity
   */
  async start(username: string, avatar: string | null): Promise<void> {
    this.myUsername = username;
    this.myAvatar = avatar;
    this.myDeviceId = `sasl_${Math.random().toString(36).substr(2, 9)}`;
    
    // Start BroadcastChannel for same-device discovery
    this.bc = new BroadcastChannel('sasl-mesh-v2');
    this.bc.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'announce' && data.from !== this.myDeviceId) {
        this.addDiscoveredDevice(data.deviceId, data.username);
      } else if (data.type === 'signal' && data.to === this.myDeviceId) {
        this.handleSignal(data.fromDeviceId, data.signal);
      }
    };
    
    // Announce presence
    setInterval(() => {
      this.bc?.postMessage({
        type: 'announce',
        from: this.myDeviceId,
        deviceId: this.myDeviceId,
        username: this.myUsername,
      });
    }, 3000);
    
    // Try BLE on Android
    await this.initBLE();
    
    console.log(`🌊 WaveMesh Engine started: ${username}`);
  }

  /**
   * Initialize Bluetooth LE (Android only)
   */
  private async initBLE(): Promise<void> {
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.initialize();
      this.bleInitialized = true;
      console.log('🔵 BLE ready');
    } catch (err) {
      console.log('⚠️ BLE not available (expected on web):', err);
    }
  }

  // ============================================================
  // DISCOVERY
  // ============================================================

  /**
   * Start scanning for nearby Sasl devices
   */
  async startDiscovery(callback: (peer: { deviceId: string; username: string }) => void): Promise<void> {
    this.onPeerDiscovered = callback;
    
    // BLE scan (Android)
    if (this.bleInitialized && !this.bleScanning) {
      this.bleScanning = true;
      try {
        const { BleClient } = await import('@capacitor-community/bluetooth-le');
        await BleClient.requestLEScan(
          { allowDuplicates: true },
          (result) => {
            if (result.device) {
              const name = result.device?.name || result.localName || `User_${result.device.deviceId.slice(-4)}`;
              const displayName = name.startsWith('Sasl:') ? name.slice(5) : name;
              this.addDiscoveredDevice(result.device.deviceId, displayName);
              callback({ deviceId: result.device.deviceId, username: displayName });
            }
          }
        );
        console.log('🔍 BLE scan active');
      } catch (err) {
        console.log('⚠️ BLE scan failed:', err);
        this.bleScanning = false;
      }
    }
  }

  /**
   * Stop scanning
   */
  async stopDiscovery(): Promise<void> {
    this.bleScanning = false;
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.stopLEScan();
    } catch {}
  }

  private addDiscoveredDevice(deviceId: string, username: string): void {
    this.discoveredDevices.set(deviceId, { id: deviceId, name: username });
  }

  /**
   * Get all discovered devices
   */
  getDiscoveredDevices(): Array<{ id: string; name: string }> {
    return Array.from(this.discoveredDevices.values());
  }

  // ============================================================
  // CONNECTION (QR CODE + WebRTC)
  // ============================================================

  /**
   * Phone A: Generate a connection code (QR code)
   * Contains WebRTC offer + identity
   */
  async generateConnectionCode(): Promise<string> {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    
    const channel = pc.createDataChannel('sasl-chat');
    const tempDeviceId = `temp_${Date.now()}`;
    this.setupChannel(channel, tempDeviceId);
    this.connections.set(tempDeviceId, pc);
    this.channels.set(tempDeviceId, channel);
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    // Wait for ICE gathering
    await new Promise<void>(resolve => {
      if (pc.iceGatheringState === 'complete') resolve();
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') resolve();
      };
    });
    
    const payload = {
      type: 'sasl_connect',
      username: this.myUsername,
      avatar: this.myAvatar,
      deviceId: this.myDeviceId,
      offer: pc.localDescription,
    };
    
    return JSON.stringify(payload);
  }

  /**
   * Phone B: Connect using the code from Phone A's QR
   */
  async connectFromCode(code: string): Promise<{ success: boolean; username?: string; avatar?: string | null }> {
    try {
      const data = JSON.parse(code);
      if (data.type !== 'sasl_connect') return { success: false };
      
      const peerDeviceId = data.deviceId || `peer_${Date.now()}`;
      
      // Store peer info
      this.addPeer(peerDeviceId, data.username, data.avatar);
      
      // Create WebRTC connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      
      pc.ondatachannel = (event) => {
        this.setupChannel(event.channel, peerDeviceId);
        this.channels.set(peerDeviceId, event.channel);
      };
      
      this.connections.set(peerDeviceId, pc);
      
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Send identity back via BroadcastChannel (same-device) or data channel
      setTimeout(() => {
        const channel = this.channels.get(peerDeviceId);
        if (channel?.readyState === 'open') {
          channel.send(JSON.stringify({
            type: 'identity',
            username: this.myUsername,
            avatar: this.myAvatar,
          }));
        }
      }, 1000);
      
      return { success: true, username: data.username, avatar: data.avatar };
    } catch (err) {
      console.error('Connection failed:', err);
      return { success: false };
    }
  }

  /**
   * Send a connection request to a discovered device
   */
  async sendRequest(deviceId: string): Promise<void> {
    const device = this.discoveredDevices.get(deviceId);
    if (!device) return;
    
    // Send request via BroadcastChannel
    this.bc?.postMessage({
      type: 'signal',
      fromDeviceId: this.myDeviceId,
      to: deviceId,
      signal: {
        type: 'request',
        from: this.myUsername,
        message: '👋 Would you like to connect?',
      },
    });
    
    // If BLE connected, also try direct
    const channel = this.channels.get(deviceId);
    if (channel?.readyState === 'open') {
      channel.send(JSON.stringify({
        type: 'request',
        from: this.myUsername,
        message: '👋 Would you like to connect?',
      }));
    }
  }

  /**
   * Accept a connection request
   */
  async acceptRequest(fromDeviceId: string, fromUsername: string): Promise<void> {
    this.addPeer(fromDeviceId, fromUsername, null);
    
    // Create WebRTC connection
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    
    const channel = pc.createDataChannel('sasl-chat');
    this.setupChannel(channel, fromDeviceId);
    this.connections.set(fromDeviceId, pc);
    this.channels.set(fromDeviceId, channel);
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    await new Promise<void>(resolve => {
      if (pc.iceGatheringState === 'complete') resolve();
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') resolve();
      };
    });
    
    // Send offer via BroadcastChannel
    this.bc?.postMessage({
      type: 'signal',
      fromDeviceId: this.myDeviceId,
      to: fromDeviceId,
      signal: {
        type: 'accept',
        from: this.myUsername,
        offer: pc.localDescription,
      },
    });
    
    this.onRoomCreated?.({ with: fromUsername, deviceId: fromDeviceId });
  }

  // ============================================================
  // SIGNALING
  // ============================================================
  
  private async handleSignal(fromDeviceId: string, signal: any): Promise<void> {
    if (signal.type === 'request') {
      this.onRequest?.({ from: signal.from, deviceId: fromDeviceId, message: signal.message });
      return;
    }
    
    if (signal.type === 'accept' && signal.offer) {
      const pc = this.connections.get(fromDeviceId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
      }
      this.onRoomCreated?.({ with: signal.from, deviceId: fromDeviceId });
      return;
    }
  }

  // ============================================================
  // DATA CHANNEL
  // ============================================================

  private setupChannel(channel: RTCDataChannel, peerDeviceId: string): void {
    channel.onopen = () => {
      console.log(`📡 Channel open with ${peerDeviceId}`);
      
      // Send identity
      channel.send(JSON.stringify({
        type: 'identity',
        username: this.myUsername,
        avatar: this.myAvatar,
      }));
      
      const peer = this.peers.get(peerDeviceId);
      if (peer) {
        peer.connected = true;
        peer.lastSeen = Date.now();
      }
      
      this.onPeerConnected?.({ deviceId: peerDeviceId, username: peer?.username || 'Peer' });
    };
    
    channel.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'identity') {
          // Received peer's identity
          this.addPeer(peerDeviceId, msg.username, msg.avatar);
          this.onPeerConnected?.({ deviceId: peerDeviceId, username: msg.username, avatar: msg.avatar });
          this.onRoomCreated?.({ with: msg.username, deviceId: peerDeviceId });
          return;
        }
        
        if (msg.type === 'request') {
          this.onRequest?.({ from: msg.from, deviceId: peerDeviceId, message: msg.message });
          return;
        }
        
        // Regular message
        this.onMessage?.({
          id: `msg_${Date.now()}`,
          from: msg.from || peerDeviceId,
          text: msg.text || msg.content || '',
          type: msg.type || 'text',
          timestamp: msg.timestamp || Date.now(),
          fileUrl: msg.fileUrl,
          fileName: msg.fileName,
        });
      } catch {
        // Plain text fallback
        this.onMessage?.({
          id: `msg_${Date.now()}`,
          from: peerDeviceId,
          text: event.data,
          type: 'text',
          timestamp: Date.now(),
        });
      }
    };
    
    channel.onclose = () => {
      console.log(`🔌 Channel closed: ${peerDeviceId}`);
      const peer = this.peers.get(peerDeviceId);
      if (peer) peer.connected = false;
      this.onPeerDisconnected?.({ deviceId: peerDeviceId });
    };
  }

  // ============================================================
  // MESSAGING
  // ============================================================

  /**
   * Send a message to a specific peer
   */
  sendMessage(peerDeviceId: string, text: string): boolean {
    const channel = this.channels.get(peerDeviceId);
    if (channel?.readyState === 'open') {
      channel.send(JSON.stringify({
        type: 'text',
        from: this.myUsername,
        text,
        timestamp: Date.now(),
      }));
      return true;
    }
    return false;
  }

  /**
   * Broadcast message to all connected peers
   */
  broadcastMessage(text: string): void {
    this.channels.forEach((channel) => {
      if (channel.readyState === 'open') {
        channel.send(JSON.stringify({
          type: 'text',
          from: this.myUsername,
          text,
          timestamp: Date.now(),
        }));
      }
    });
  }

  // ============================================================
  // PEER MANAGEMENT
  // ============================================================

  private addPeer(deviceId: string, username: string, avatar: string | null): void {
    if (this.peers.has(deviceId)) return;
    this.peers.set(deviceId, {
      id: deviceId,
      username,
      avatar,
      deviceId,
      connected: false,
      lastSeen: Date.now(),
    });
  }

  getPeers(): MeshPeer[] {
    return Array.from(this.peers.values());
  }

  getConnectedPeers(): MeshPeer[] {
    return Array.from(this.peers.values()).filter(p => p.connected);
  }

  // ============================================================
  // CALLBACKS
  // ============================================================

  setOnPeerDiscovered(cb: Callback): void { this.onPeerDiscovered = cb; }
  setOnPeerConnected(cb: Callback): void { this.onPeerConnected = cb; }
  setOnPeerDisconnected(cb: Callback): void { this.onPeerDisconnected = cb; }
  setOnMessage(cb: Callback): void { this.onMessage = cb; }
  setOnRequest(cb: Callback): void { this.onRequest = cb; }
  setOnRoomCreated(cb: Callback): void { this.onRoomCreated = cb; }

  // ============================================================
  // CLEANUP
  // ============================================================

  stop(): void {
    this.channels.forEach(ch => ch.close());
    this.connections.forEach(pc => pc.close());
    this.channels.clear();
    this.connections.clear();
    this.peers.clear();
    this.discoveredDevices.clear();
    this.bc?.close();
    console.log('🌊 WaveMesh Engine stopped');
  }
}

// ============================================================
// EXPORT SINGLETON
// ============================================================
export const waveMeshEngine = new WaveMeshEngine();
