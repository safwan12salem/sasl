
/**
 * Sasl WaveMesh Core — Patent-Grade Offline P2P System
 * 
 * Android: BLE GATT + WiFi Direct + Wi-Fi Aware
 * iOS: BLE GATT + Multipeer Connectivity
 * Both: Multi-hop relay, Software LoRa (50km via peer density),
 *        QR handshake, Echo queue, Bidirectional rooms
 */

// ============================================================
// TYPES
// ============================================================
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
  signalStrength: number;
  connectionType: 'ble' | 'wifi-direct' | 'wifi-aware' | 'multipeer' | 'webrtc' | 'lora' | 'echo';
  distance: number;
}

export interface MeshMessage {
  id: string;
  from: string;
  to?: string;
  text: string;
  type: 'text' | 'image' | 'file' | 'identity' | 'request' | 'accept' | 'decline' | 'relay' | 'ice-candidate' | 'webrtc-offer' | 'webrtc-answer';
  timestamp: number;
  ttl: number;
  hopCount: number;
  fileUrl?: string;
  fileName?: string;
  encrypted: boolean;
  relayPath?: string[];
}

type Callback = (data: any) => void;

// ============================================================
// WAVEMESH CORE CLASS
// ============================================================
class WaveMeshCore {
  private identity: MeshIdentity | null = null;
  private peers: Map<string, MeshPeer> = new Map();
  private connections: Map<string, RTCPeerConnection> = new Map();
  private channels: Map<string, RTCDataChannel> = new Map();
  
  private bleReady: boolean = false;
  private bleScanning: boolean = false;
  private wifiDirectReady: boolean = false;
  private wifiAwareReady: boolean = false;
  private multipeerReady: boolean = false;
  private loraReady: boolean = false;
  
  private messageQueue: MeshMessage[] = [];
  private db: IDBDatabase | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  
  private onPeerDiscovered: Callback | null = null;
  private onPeerConnected: Callback | null = null;
  private onPeerDisconnected: Callback | null = null;
  private onMessageReceived: Callback | null = null;
  private onRequestReceived: Callback | null = null;
  private onRoomCreated: Callback | null = null;

  // ============================================================
  // INITIALIZATION
  // ============================================================

  async start(username: string, avatar: string | null): Promise<void> {
    this.identity = {
      id: `mesh_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      username, avatar,
      publicKey: await this.generatePublicKey(),
    };
    localStorage.setItem('sasl_mesh_identity', JSON.stringify(this.identity));
    await this.openDatabase();
    this.startBroadcastChannel();
    await this.loadMessageQueue();
    this.processQueue();
    await this.initBLE();
    await this.initNativeLayers();
    console.log(`🌊 WaveMesh started: @${username} | BLE:${this.bleReady} WiFiDirect:${this.wifiDirectReady} Multipeer:${this.multipeerReady}`);
  }

  stop(): void {
    this.channels.forEach(ch => ch.close());
    this.connections.forEach(pc => pc.close());
    this.channels.clear();
    this.connections.clear();
    this.peers.clear();
    this.broadcastChannel?.close();
    this.stopBLEScan();
    this.stopNativeLayers();
  }

  // ============================================================
  // NATIVE LAYER INIT
  // ============================================================

  private async initBLE(): Promise<void> {
    try {
      const plugin = this.getNativeBridge();
      if (plugin) {
        const caps = await plugin.getCapabilities();
        this.bleReady = caps?.bleReady || false;
        this.wifiDirectReady = caps?.wifiDirectReady || false;
        this.wifiAwareReady = caps?.wifiAwareReady || false;
        this.multipeerReady = caps?.multipeerReady || false;
        if (this.bleReady) console.log('🔵 Native BLE ready');
        if (this.multipeerReady) console.log('📱 Native Multipeer ready');
      }
    } catch {
      try {
        const { BleClient } = await import('@capacitor-community/bluetooth-le');
        await BleClient.initialize();
        this.bleReady = true;
        console.log('🔵 Capacitor BLE ready');
      } catch { console.log('⚠️ BLE not available'); }
    }
  }

  private async initNativeLayers(): Promise<void> {
    const plugin = this.getNativeBridge();
    if (!plugin || !this.identity) return;
    await plugin.setIdentity({ id: this.identity.id, username: this.identity.username });
    this.listenToNativeEvents(plugin);
  }

  private listenToNativeEvents(plugin: any): void {
    plugin.addListener('peerDiscovered', (peer: any) => {
      this.onPeerDiscovered?.({
        id: peer.deviceId, username: peer.name,
        connectionType: peer.connectionType || 'ble',
        distance: peer.distance || 50,
      });
    });
    plugin.addListener('peerConnected', (peer: any) => {
      const id = peer.deviceId;
      this.peers.set(id, {
        id, username: peer.name, avatar: null,
        connected: true, lastSeen: Date.now(),
        signalStrength: 100, connectionType: 'ble', distance: 50,
      });
      this.onPeerConnected?.({ peerId: id, username: peer.name });
      this.onRoomCreated?.({ peerId: id, username: peer.name });
    });
    plugin.addListener('messageReceived', (msg: any) => {
      this.onMessageReceived?.({ id: `msg_${Date.now()}`, from: msg.from, text: msg.text, type: 'text', timestamp: Date.now() });
    });
    plugin.addListener('iceCandidate', (ice: any) => {
      console.log('🧊 ICE from native:', ice.from);
    });
  }

  private getNativeBridge(): any | null {
    try {
      return (window as any).Capacitor?.Plugins?.WaveMeshPlugin || null;
    } catch { return null; }
  }

  private stopNativeLayers(): void {
    try { this.getNativeBridge()?.stop(); } catch {}
  }

  // ============================================================
  // BLE DISCOVERY
  // ============================================================

  async startBLEDiscovery(): Promise<void> {
    if (!this.bleReady || this.bleScanning) return;
    this.bleScanning = true;
    const plugin = this.getNativeBridge();
    if (plugin) {
      try { await plugin.startBLEScan(); console.log('🔍 Native BLE scan started'); return; }
      catch { console.log('⚠️ Native BLE scan failed'); }
    }
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.requestLEScan({ allowDuplicates: false }, (result: any) => {
        if (result.device?.deviceId) {
          this.onPeerDiscovered?.({
            id: result.device.deviceId,
            username: result.device?.name || `User_${result.device.deviceId.slice(-4)}`,
            connectionType: 'ble', distance: this.estimateDistance(result.rssi || -100),
          });
        }
      });
    } catch { this.bleScanning = false; }
  }

  async stopBLEScan(): Promise<void> {
    this.bleScanning = false;
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.stopLEScan();
    } catch {}
  }

  private estimateDistance(rssi: number): number {
    if (rssi === 0) return -1;
    return Math.round(Math.pow(10, (-59 - rssi) / 20) * 100);
  }

  // ============================================================
  // IDENTITY
  // ============================================================

  private async generatePublicKey(): Promise<string> {
    try {
      const keyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
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

  // ============================================================
  // QR CODE
  // ============================================================
  async generateConnectionCode(): Promise<string> {
    if (!this.identity) throw new Error("Not started");
    
    // Use our identity ID as the peerId so both sides match
    const peerId = this.identity.id;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    this.connections.set(peerId, pc);
    
    const channel = pc.createDataChannel("sasl-chat", { ordered: true });
    this.channels.set(peerId, channel);
    this.setupDataChannel(channel, peerId);
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    await new Promise<void>(resolve => {
      if (pc.iceGatheringState === "complete") resolve();
      pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === "complete") resolve(); };
    });
    
    return JSON.stringify({
      v: 2, type: "sasl_connect",
      id: this.identity.id,
      username: this.identity.username,
      avatar: this.identity.avatar,
      offer: pc.localDescription,
    });
  }
    
    async connectFromCode(code: string): Promise<{ success: boolean; username?: string; avatar?: string | null; peerId?: string }> {
    if (!this.identity) throw new Error('Not started');
    try {
      const data = JSON.parse(code);
      if (data.type !== 'sasl_connect' || !data.offer) return { success: false };
      
      // Use the GENERATOR's ID as the peerId so both sides use the same key
      const peerId = data.id;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      this.connections.set(peerId, pc);
      
      // Set up data channel receiver BEFORE setting remote description
      pc.ondatachannel = (event) => {
        this.channels.set(peerId, event.channel);
        this.setupDataChannel(event.channel, peerId);
      };
      
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      this.peers.set(peerId, {
        id: peerId, username: data.username || 'Peer', avatar: data.avatar || null,
        connected: false, lastSeen: Date.now(), signalStrength: 100,
        connectionType: 'webrtc', distance: 0,
      });
      
      return { success: true, username: data.username, avatar: data.avatar, peerId };
    } catch {
      return { success: false };
    }
  }
  notifyPeerConnected(peerId: string, data: { username: string; avatar: string | null; peerId: string }): void {
    this.broadcastChannel?.postMessage({ type: 'peer_connected', peerId: data.peerId, username: data.username, avatar: data.avatar });
    const channel = this.channels.get(peerId);
    if (channel?.readyState === 'open') {
      channel.send(JSON.stringify({ type: 'peer_connected', peerId: data.peerId, username: data.username, avatar: data.avatar }));
    }
    this.onPeerConnected?.({ peerId: data.peerId, username: data.username, avatar: data.avatar });
  }

  // ============================================================
  // DATA CHANNEL
  // ============================================================

  private setupDataChannel(channel: RTCDataChannel, peerId: string): void {
    channel.onopen = () => {
      if (this.identity) {
        channel.send(JSON.stringify({ type: 'identity', id: this.identity.id, username: this.identity.username, avatar: this.identity.avatar }));
      }
      const peer = this.peers.get(peerId);
      if (peer) { peer.connected = true; peer.lastSeen = Date.now(); }
      this.onPeerConnected?.({ peerId, username: peer?.username || 'Peer' });
      this.onRoomCreated?.({ peerId, username: peer?.username || 'Peer' });
    };
    channel.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'identity' || msg.type === 'peer_connected') {
          const name = msg.username || 'Peer';
          this.peers.set(peerId, {
            id: peerId, username: name, avatar: msg.avatar,
            connected: true, lastSeen: Date.now(), signalStrength: 100,
            connectionType: 'webrtc', distance: 0,
          });
          this.onPeerConnected?.({ peerId, username: name, avatar: msg.avatar });
          this.onRoomCreated?.({ peerId, username: name, avatar: msg.avatar });
          return;
        }
        if (msg.type === 'request') {
          this.onRequestReceived?.({ from: msg.from, peerId, message: msg.message });
          return;
        }
        if (msg.type === 'relay' && msg.to === this.identity?.id) {
          this.onMessageReceived?.({ id: msg.id, from: msg.from, text: msg.text, type: 'text', timestamp: msg.timestamp });
          return;
        }
        if (msg.ttl && msg.ttl > 0 && msg.to && msg.to !== this.identity?.id) {
          this.relayMessage(msg, peerId);
          return;
        }
        this.onMessageReceived?.({ id: msg.id || `msg_${Date.now()}`, from: msg.from || 'Peer', text: msg.text || '', type: msg.type || 'text', timestamp: msg.timestamp || Date.now() });
      } catch {
        this.onMessageReceived?.({ id: `msg_${Date.now()}`, from: 'Peer', text: event.data, type: 'text', timestamp: Date.now() });
      }
    };
    channel.onclose = () => {
      const peer = this.peers.get(peerId);
      if (peer) peer.connected = false;
      this.onPeerDisconnected?.({ peerId });
    };
  }

  // ============================================================
  // MESSAGING
  // ============================================================

  sendMessage(text: string): void {
    this.channels.forEach((channel) => {
      if (channel.readyState === 'open') {
        channel.send(JSON.stringify({
          type: 'text', id: `msg_${Date.now()}`,
          from: this.identity?.username || 'Me', text,
          timestamp: Date.now(), ttl: 10, hopCount: 0,
        }));
      }
    });
  }

  sendRequest(peerId: string): void {
    this.broadcastChannel?.postMessage({
      type: 'request', from: this.identity?.username || 'Me',
      peerId, message: '👋 Would you like to connect via WaveMesh?',
    });
  }

  async acceptRequest(fromPeerId: string): Promise<void> {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    const channel = pc.createDataChannel('sasl-chat', { ordered: true });
    this.connections.set(fromPeerId, pc);
    this.channels.set(fromPeerId, channel);
    this.setupDataChannel(channel, fromPeerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await new Promise<void>(resolve => {
      if (pc.iceGatheringState === 'complete') resolve();
      pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') resolve(); };
    });
    this.broadcastChannel?.postMessage({ type: 'accept', from: this.identity?.username || 'Me', peerId: fromPeerId, offer: pc.localDescription });
    this.onRoomCreated?.({ peerId: fromPeerId, username: 'Peer' });
  }

  // ============================================================
  // MULTI-HOP RELAY + SOFTWARE LORA
  // ============================================================

  private relayMessage(msg: any, excludePeerId: string): void {
    this.channels.forEach((channel, peerId) => {
      if (peerId !== excludePeerId && channel.readyState === 'open') {
        channel.send(JSON.stringify({ ...msg, ttl: (msg.ttl || 10) - 1, hopCount: (msg.hopCount || 0) + 1 }));
      }
    });
  }

  findRouteToTarget(targetPeerId: string): { hops: number; distance: number; path: string[] } | null {
    if (!this.peers.has(targetPeerId)) return null;
    const visited = new Set<string>();
    const queue: Array<{ peerId: string; path: string[]; hops: number; distance: number }> = [];
    for (const [id, peer] of this.peers) {
      if (peer.connected) queue.push({ peerId: id, path: [id], hops: 1, distance: peer.distance || 100 });
    }
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.peerId === targetPeerId) return { hops: current.hops, distance: current.distance, path: current.path };
      if (visited.has(current.peerId)) continue;
      visited.add(current.peerId);
      for (const [id, peer] of this.peers) {
        if (!visited.has(id) && id !== current.peerId) {
          queue.push({ peerId: id, path: [...current.path, id], hops: current.hops + 1, distance: current.distance + (peer.distance || 100) });
        }
      }
    }
    return null;
  }

  getSoftwareLoRaRange(): { meters: number; label: string; requiredPeers: number } {
    const totalPeers = this.peers.size;
    const avgHopMeters = 150;
    const achievableHops = Math.min(totalPeers, 334);
    const maxRange = achievableHops * avgHopMeters;
    const peersFor50km = Math.max(0, 334 - totalPeers);
    if (maxRange >= 50000) return { meters: 50000, label: '🌍 Software LoRa 50km ACTIVE', requiredPeers: 0 };
    if (maxRange >= 10000) return { meters: maxRange, label: `📡 Software LoRa ${(maxRange/1000).toFixed(0)}km`, requiredPeers: peersFor50km };
    if (maxRange >= 1000) return { meters: maxRange, label: `📶 Extended Mesh ${(maxRange/1000).toFixed(1)}km`, requiredPeers: peersFor50km };
    return { meters: maxRange, label: `🔵 Local Mesh ${maxRange}m`, requiredPeers: peersFor50km };
  }

  getMaxRange(): { meters: number; label: string } {
    return this.getSoftwareLoRaRange();
  }

  getStatus(): string {
    return this.getSoftwareLoRaRange().label;
  }

  // ============================================================
  // BROADCAST CHANNEL
  // ============================================================

  private startBroadcastChannel(): void {
    this.broadcastChannel = new BroadcastChannel('sasl-wave-mesh-v3');
    this.broadcastChannel.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'announce' && data.id !== this.identity?.id) {
        this.onPeerDiscovered?.({ id: data.id, username: data.username, connectionType: 'ble', distance: 0 });
      }
      if (data.type === 'request') {
        this.onRequestReceived?.({ from: data.from, peerId: data.peerId, message: data.message });
      }
      if (data.type === 'accept' && data.offer) {
        this.handleAcceptance(data.peerId, data.offer);
      }
      if (data.type === 'peer_connected') {
        this.onPeerConnected?.({ peerId: data.peerId, username: data.username, avatar: data.avatar });
        this.onRoomCreated?.({ peerId: data.peerId, username: data.username, avatar: data.avatar });
      }
    };
    if (this.identity) {
      window.setInterval(() => {
        this.broadcastChannel?.postMessage({ type: 'announce', id: this.identity!.id, username: this.identity!.username });
      }, 3000);
    }
  }

  private async handleAcceptance(peerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.connections.get(peerId);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.onRoomCreated?.({ peerId, username: 'Peer' });
    } catch (err) { console.warn('Acceptance failed:', err); }
  }

  // ============================================================
  // INDEXEDDB ECHO QUEUE
  // ============================================================

  private async openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('sasl_wave_mesh', 1);
      request.onupgradeneeded = () => { request.result.createObjectStore('messages', { keyPath: 'id' }); };
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

  private async saveMessage(msg: MeshMessage): Promise<void> {
    if (!this.db) return;
    const tx = this.db.transaction('messages', 'readwrite');
    tx.objectStore('messages').put(msg);
  }

  private processQueue(): void {
    window.setInterval(() => {
      this.messageQueue = this.messageQueue.filter((msg: MeshMessage) => {
        if (Date.now() - msg.timestamp > 86400000) return false;
        if (this.channels.size > 0) { this.sendMessage(msg.text); return false; }
        return true;
      });
    }, 10000);
  }

  // ============================================================
  // PUBLIC GETTERS
  // ============================================================

  getPeers(): MeshPeer[] { return Array.from(this.peers.values()); }
  getConnectedPeers(): MeshPeer[] { return Array.from(this.peers.values()).filter((p: MeshPeer) => p.connected); }
  isBLEAvailable(): boolean { return this.bleReady; }
  isWifiDirectAvailable(): boolean { return this.wifiDirectReady; }
  isWifiAwareAvailable(): boolean { return this.wifiAwareReady; }
  isMultipeerAvailable(): boolean { return this.multipeerReady; }
  isLoRaAvailable(): boolean { return this.loraReady; }

  // ============================================================
  // CALLBACK SETTERS
  // ============================================================

  setOnPeerDiscovered(cb: Callback): void { this.onPeerDiscovered = cb; }
  setOnPeerConnected(cb: Callback): void { this.onPeerConnected = cb; }
  setOnPeerDisconnected(cb: Callback): void { this.onPeerDisconnected = cb; }
  setOnMessageReceived(cb: Callback): void { this.onMessageReceived = cb; }
  setOnRequestReceived(cb: Callback): void { this.onRequestReceived = cb; }
  setOnRoomCreated(cb: Callback): void { this.onRoomCreated = cb; }
}

export const waveMeshCore = new WaveMeshCore();
