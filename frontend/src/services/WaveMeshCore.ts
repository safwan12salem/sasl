/**
 * Sasl WaveMesh Core — BLE GATT ONLY (True Cross-Device)
 * No BroadcastChannel for cross-device. All communication via BLE GATT.
 */
import WaveMeshPlugin from '../plugins/WaveMeshPlugin';

export interface MeshPeer {
  id: string; username: string; distance: number;
  connectionType: 'ble4' | 'ble5' | 'wifidirect' | 'relay';
  lastSeen: number; signalStrength: number;
  connected: boolean; nodeId: string; isRequested?: boolean;
}

export interface RangeInfo {
  meters: number; label: string; usersNeeded: number;
  technology: string; hopDistance: number; tier: number;
  tierName: string; maxRange: number; peerCount: number;
  signalStrength?: number;
}

export interface MeshStats {
  totalPeers: number; connectedPeers: number;
  relayMessages: number; pendingDelivery: number;
  delivered: number; uptime: number; scanCount: number;
}

type Callback = (data: any) => void;

class WaveMeshCore {
  private identity: { id: string; username: string; avatar: string | null } | null = null;
  private peers: Map<string, MeshPeer> = new Map();
  private scanning = false;
  private connectedDevices: Set<string> = new Set();
    private broadcastChannel: BroadcastChannel | null = null;
  public debugLog: string[] = [];
  private onDebugUpdate: (() => void) | null = null;
  private startTime = Date.now();
  private totalScans = 0;
  private onPeerDiscovered: Callback | null = null;
  private onPeerConnected: Callback | null = null;
  private onPeerDisconnected: Callback | null = null;
  private onMessageReceived: Callback | null = null;
  private onRoomCreated: Callback | null = null;
  private onRequestReceived: Callback | null = null;
  private pendingRequests: Map<string, string> = new Map();

  private log(msg: string): void {
    const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
    console.log(entry);
    this.debugLog.push(entry);
    if (this.debugLog.length > 100) this.debugLog.shift();
    this.onDebugUpdate?.();
  }
  onDebug(cb: () => void): void { this.onDebugUpdate = cb; }

  async start(username: string, avatar: string | null): Promise<void> {
    this.identity = { id: `sasl_${Date.now().toString(36)}_${Math.random().toString(36).substr(2,6)}`, username, avatar };
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.initialize();
      this.log('🔵 Community BLE ready');
          this.broadcastChannel = new BroadcastChannel("sasl-wave-mesh-v5");
    this.broadcastChannel.onmessage = (event) => {
      if (event.data.from !== this.identity?.username) {
        this.onMessageReceived?.(event.data);
      }
    };
    } catch (e: any) { this.log(`❌ BLE not available: ${e.message}`); return; }
    
    // Try native plugin for advertising + GATT server
    try {
      const plugin = WaveMeshPlugin;
      await plugin.setIdentity({ id: this.identity.id, username });
      
      plugin.addListener('peerDiscovered', (peer: any) => {
        const p: MeshPeer = { id: peer.deviceId, username: peer.name, distance: peer.distance || 50, connectionType: peer.connectionType || 'ble4', lastSeen: Date.now(), signalStrength: peer.signalStrength || 50, connected: false, nodeId: peer.deviceId };
        if (!this.peers.has(p.id)) { this.peers.set(p.id, p); this.onPeerDiscovered?.(p); }
      });
      
      plugin.addListener('peerConnected', (peer: any) => {
        const name = peer.name || 'Peer';
        this.connectedDevices.add(peer.deviceId);
        this.onPeerConnected?.({ peerId: peer.deviceId, username: name });
        this.onRoomCreated?.({ peerId: peer.deviceId, username: name });
        this.log(`✅ Connected to ${name}`);
      });
      
      plugin.addListener('messageReceived', (msg: any) => {
        this.onMessageReceived?.({ id: `msg_${Date.now()}`, from: msg.from, text: msg.text, type: 'text', timestamp: Date.now() });
      });
      
      await plugin.startAdvertising({ username });
      this.log('📡 Native GATT server + advertising active');
    } catch (e: any) { this.log(`⚠️ Native plugin unavailable: ${e.message || e}`); }
    
    this.restoreRooms();
    this.log(`✅ WaveMesh ready for @${username}`);
  }

  private restoreRooms(): void {
    try {
      const saved = localStorage.getItem('sasl_wavemesh_rooms');
      if (saved) {
        const rooms = JSON.parse(saved);
        for (const room of rooms) {
          this.peers.set(room.id, room);
          this.onRoomCreated?.({ peerId: room.id, username: room.username });
        }
        this.log(`📂 Restored ${rooms.length} rooms`);
      }
    } catch {}
  }

  private saveRooms(): void {
    try {
      const rooms = Array.from(this.peers.values()).filter(p => p.connected);
      localStorage.setItem('sasl_wavemesh_rooms', JSON.stringify(rooms));
    } catch {}
  }

  async startScanning(): Promise<void> {
    if (this.scanning) return;
    this.scanning = true; this.totalScans++;
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      if (!await BleClient.isEnabled()) { this.log('❌ Bluetooth OFF'); this.scanning = false; return; }
      await BleClient.requestLEScan({ allowDuplicates: false }, (result: any) => {
        const deviceId = result?.device?.deviceId; if (!deviceId) return;
        const name = result.device?.name || result?.localName || `Device_${deviceId.slice(-4)}`;
        const rssi = result.rssi || -100;
        const distance = Math.round(Math.pow(10, (-59 - rssi) / 20) * 100);
        const peer: MeshPeer = {
          id: deviceId, username: name,
          distance: Math.max(1, Math.min(distance, 2000)),
          connectionType: distance > 200 ? 'ble5' : 'ble4',
          lastSeen: Date.now(), signalStrength: Math.abs(rssi),
          connected: false, nodeId: deviceId,
        };
        if (!this.peers.has(peer.id)) { this.peers.set(peer.id, peer); this.onPeerDiscovered?.(peer); }
        else { this.peers.set(peer.id, { ...this.peers.get(peer.id)!, distance: peer.distance, signalStrength: peer.signalStrength }); }
      });
      this.log('🔍 BLE scan started');
    } catch (err: any) { this.log(`❌ Scan failed: ${err.message}`); this.scanning = false; }
  }

  async stopScanning(): Promise<void> { this.scanning = false; try { const { BleClient } = await import('@capacitor-community/bluetooth-le'); await BleClient.stopLEScan(); } catch {} }

  // ============================================================
  // REQUEST/ACCEPT — Via BLE GATT write (CROSS-DEVICE)
  // ============================================================
  
  async sendConnectionRequest(deviceId: string): Promise<void> {
    const peer = this.peers.get(deviceId);
    const username = peer?.username || 'Unknown';
    this.log(`📩 Sending request to ${username}`);
    this.pendingRequests.set(deviceId, username);
    this.onPeerDiscovered?.({ ...peer, isRequested: true });
    
    // Send request via BLE GATT write to the other phone
    if (this.identity) {
      try {
        const { BleClient } = await import('@capacitor-community/bluetooth-le');
        const payload = JSON.stringify({ type: 'request', from: this.identity.username, peerId: this.identity.id, message: '👋 Wants to connect!' });
        const encoded = new TextEncoder().encode(payload);
        await BleClient.writeWithoutResponse(deviceId, '4fafc201-1fb5-459e-8fcc-c5c9c331914b', '6e400001-b5a3-f393-e0a9-e50e24dcca9e', new DataView(encoded.buffer));
        this.log(`📤 Request sent via BLE to ${username}`);
      } catch (e) { this.log(`⚠️ BLE request send failed`); }
    }
  }

  getPendingRequests(): { deviceId: string; username: string }[] {
    return Array.from(this.pendingRequests.entries()).map(([deviceId, username]) => ({ deviceId, username }));
  }

  acceptRequest(deviceId: string): void {
    const username = this.pendingRequests.get(deviceId) || 'Peer';
    this.pendingRequests.delete(deviceId);
    this.log(`✅ Request accepted from ${username}`);
    this.connectToPeer(deviceId);
  }

  // ============================================================
  // BLE CONNECT
  // ============================================================
  
  async connectToPeer(deviceId: string): Promise<void> {
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.connect(deviceId);
      const peer = this.peers.get(deviceId); const name = peer?.username || 'Device';
      this.connectedDevices.add(deviceId);
      if (peer) { peer.connected = true; peer.lastSeen = Date.now(); }
      this.onPeerConnected?.({ peerId: deviceId, username: name });
      this.onRoomCreated?.({ peerId: deviceId, username: name });
      this.saveRooms();
      this.log(`✅ Connected to ${name}`);
      
      // Send identity via BLE
      if (this.identity) {
        try {
          const payload = JSON.stringify({ type: 'identity', nodeId: this.identity.id, username: this.identity.username });
          const encoded = new TextEncoder().encode(payload);
          await BleClient.writeWithoutResponse(deviceId, '4fafc201-1fb5-459e-8fcc-c5c9c331914b', '6e400001-b5a3-f393-e0a9-e50e24dcca9e', new DataView(encoded.buffer));
          this.log(`📤 Identity sent to ${name}`);
        } catch (e) { this.log(`⚠️ Identity send failed`); }
      }
    } catch (err: any) { this.log(`❌ Connect failed: ${err.message}`); }
  }

  // ============================================================
  // MESSAGING — Via BLE GATT (CROSS-DEVICE)
  // ============================================================
  
    async sendMessage(text: string): Promise<void> {
    if (!this.identity) return;
    
    const msgId = `msg_${Date.now()}`;
    const msg = { id: msgId, from: this.identity.username, text, type: 'text', timestamp: Date.now() };
    
    // Echo to sender's UI
    this.onMessageReceived?.(msg);
    
    // Send to ALL connected devices via BLE GATT
    for (const deviceId of this.connectedDevices) {
      try {
        const { BleClient } = await import('@capacitor-community/bluetooth-le');
        const encoded = new TextEncoder().encode(text);
        await BleClient.writeWithoutResponse(deviceId, '4fafc201-1fb5-459e-8fcc-c5c9c331914b', 'beb5483e-36e1-4688-b7f5-ea07361b26a8', new DataView(encoded.buffer));
        const peer = this.peers.get(deviceId);
        this.log(`📤 Sent to ${peer?.username || deviceId}`);
      } catch (e) { this.log(`⚠️ BLE send failed`); }
    }
    
    // Also broadcast via BroadcastChannel with SAME msgId
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(msg);
    }
  }

  // ============================================================
  // QR HANDSHAKE
  // ============================================================
  
  generateConnectionCode(): string {
    if (!this.identity) return '';
    return JSON.stringify({ type: 'sasl_connect', version: 3, nodeId: this.identity.id, username: this.identity.username, timestamp: Date.now() });
  }

  processConnectionCode(code: string): { username: string; peerId: string } | null {
    try {
      const data = JSON.parse(code); if (data.type !== 'sasl_connect') return null;
      if (Date.now() - data.timestamp > 300000) { this.log('⚠️ Code expired'); return null; }
      this.peers.set(data.nodeId, { id: data.nodeId, username: data.username, distance: 0, connectionType: 'ble4', lastSeen: Date.now(), signalStrength: 100, connected: true, nodeId: data.nodeId });
      this.connectedDevices.add(data.nodeId);
      this.onPeerConnected?.({ peerId: data.nodeId, username: data.username });
      this.onRoomCreated?.({ peerId: data.nodeId, username: data.username });
      this.saveRooms();
      
      // Send QR confirmation via BLE so the other phone also creates the room
      if (this.identity) {
        const { BleClient } = require('@capacitor-community/bluetooth-le');
        const payload = JSON.stringify({ type: 'qr_confirm', from: this.identity.username, peerId: this.identity.id, username: this.identity.username });
        const encoded = new TextEncoder().encode(payload);
        BleClient.writeWithoutResponse(data.nodeId, '4fafc201-1fb5-459e-8fcc-c5c9c331914b', '6e400001-b5a3-f393-e0a9-e50e24dcca9e', new DataView(encoded.buffer)).catch(() => {});
      }
      
      return { username: data.username, peerId: data.nodeId };
    } catch { return null; }
  }

  getRange(): RangeInfo {
    const count = this.peers.size;
    const connectedPeers = Array.from(this.peers.values()).filter(p => p.connected);
    const avgSignal = connectedPeers.length > 0 ? Math.round(connectedPeers.reduce((sum, p) => sum + p.signalStrength, 0) / connectedPeers.length) : 0;
    const hopDist = avgSignal > 50 ? 500 : 200;
    const maxRange = count * hopDist;
    const usersFor50km = Math.max(0, Math.ceil(50000 / hopDist) - count);
    let tier = 0, tierName = 'Scanning';
    if (maxRange >= 50000) { tier = 4; tierName = 'Global Mesh'; }
    else if (maxRange >= 25000) { tier = 3; tierName = 'City Mesh'; }
    else if (maxRange >= 5000) { tier = 2; tierName = 'Extended'; }
    else if (maxRange >= 1000) { tier = 1; tierName = 'Local Mesh'; }
    return { meters: maxRange, label: tier >= 4 ? '🌍 GLOBAL 50km+' : tier >= 3 ? `🏙️ ${(maxRange/1000).toFixed(0)}km` : tier >= 2 ? `📡 ${(maxRange/1000).toFixed(1)}km` : tier >= 1 ? `🔵 ${maxRange}m` : `🔍 ${count} peers`, usersNeeded: usersFor50km, technology: 'BLE 5 Long Range', hopDistance: hopDist, tier, tierName, maxRange, peerCount: count, signalStrength: avgSignal };
  }


  // ============================================================
  // AUDIO MESH — Sonic data transmission (long range through obstacles)
  // ============================================================
  
  async sendViaAudioMesh(text: string): Promise<void> {
    if (!this.identity) return;
    const msg = { id: `msg_${Date.now()}`, from: this.identity.username, text, type: 'audiomesh', timestamp: Date.now() };
    this.onMessageReceived?.(msg);
    
    try {
      const { audioMesh } = await import('./AudioMesh');
      await audioMesh.start();
      await audioMesh.transmit(text);
      this.log(`🔊 Sent via AudioMesh: "${text.substring(0, 20)}"`);
    } catch (e) {
      this.log(`⚠️ AudioMesh failed: ${e}`);
    }
  }

  // ============================================================
  // FILE TRANSFER — Chunked BLE file transfer (offline)
  // ============================================================
  
  async sendFile(fileData: Uint8Array, fileName: string): Promise<void> {
    if (!this.identity) return;
    const CHUNK_SIZE = 512;
    const totalChunks = Math.ceil(fileData.length / CHUNK_SIZE);
    this.log(`📎 Sending file: ${fileName} (${fileData.length} bytes, ${totalChunks} chunks)`);
    
    const header = JSON.stringify({ type: 'file_start', name: fileName, size: fileData.length, chunks: totalChunks });
    await this.broadcastData(header, 'message');
    
    for (let i = 0; i < totalChunks; i++) {
      const chunk = fileData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkB64 = btoa(String.fromCharCode(...chunk));
      const chunkMsg = JSON.stringify({ type: 'file_chunk', name: fileName, index: i, total: totalChunks, data: chunkB64 });
      await this.broadcastData(chunkMsg, 'message');
    }
    this.log(`✅ File sent: ${fileName}`);
  }

  async sendVoiceMessage(audioData: Uint8Array): Promise<void> {
    if (!this.identity) return;
    const msg = { id: `msg_${Date.now()}`, from: this.identity.username, text: '🎤 Voice message', type: 'voice', timestamp: Date.now() };
    this.onMessageReceived?.(msg);
    await this.sendFile(audioData, `voice_${Date.now()}.wav`);
  }

  // ============================================================
  // BROADCAST DATA — Dual transport (BLE + BroadcastChannel)
  // ============================================================
  
  private async broadcastData(data: string, type: string): Promise<void> {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    for (const deviceId of this.connectedDevices) {
      try {
        const { BleClient } = await import('@capacitor-community/bluetooth-le');
        const encoded = new TextEncoder().encode(payload);
        await BleClient.writeWithoutResponse(deviceId, '4fafc201-1fb5-459e-8fcc-c5c9c331914b', 'beb5483e-36e1-4688-b7f5-ea07361b26a8', new DataView(encoded.buffer));
      } catch {}
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ id: `msg_${Date.now()}`, from: this.identity?.username, text: payload, type, timestamp: Date.now() });
    }
  }

  // ============================================================
  // SIGNAL HEALTH — Bluetooth environment analysis
  // ============================================================
  
  getBluetoothEnvironment(): { totalDevices: number; potentialRelays: number; signalQuality: 'excellent' | 'good' | 'fair' | 'poor' } {
    const allDevices = Array.from(this.peers.values());
    const saslDevices = allDevices.filter(p => p.connected);
    const otherDevices = allDevices.filter(p => !p.connected);
    const signalQuality = saslDevices.length > 0 
      ? (saslDevices[0].signalStrength > 60 ? 'excellent' : saslDevices[0].signalStrength > 40 ? 'good' : saslDevices[0].signalStrength > 20 ? 'fair' : 'poor')
      : 'poor';
    return { totalDevices: allDevices.length, potentialRelays: otherDevices.length, signalQuality };
  }

  getSignalHealth(): { warning: string | null; suggestion: string | null; shouldRelay: boolean } {
    const range = this.getRange();
    const env = this.getBluetoothEnvironment();
    if (env.signalQuality === 'poor' && range.peerCount === 0) {
      return { warning: '📡 Weak signal — move closer or find open space', suggestion: `${env.potentialRelays} Bluetooth devices nearby can help reflect signal`, shouldRelay: false };
    }
    if (env.signalQuality === 'fair' && range.usersNeeded > 0) {
      return { warning: '⚠️ Signal could be stronger', suggestion: `${range.usersNeeded} more Sasl users needed for ${(range.meters/1000).toFixed(1)}km relay mesh`, shouldRelay: true };
    }
    if (env.signalQuality === 'good' && range.usersNeeded > 0) {
      return { warning: null, suggestion: `${range.usersNeeded} more Sasl users needed for 50km global mesh`, shouldRelay: range.usersNeeded <= 100 };
    }
    return { warning: null, suggestion: null, shouldRelay: false };
  }

  isRelayActive(): boolean { return this.getSignalHealth().shouldRelay; }

  getStats(): MeshStats { return { totalPeers: this.peers.size, connectedPeers: this.connectedDevices.size, relayMessages: 0, pendingDelivery: 0, delivered: 0, uptime: Math.floor((Date.now() - this.startTime) / 1000), scanCount: this.totalScans }; }
  getPeers(): MeshPeer[] { return Array.from(this.peers.values()).filter(p => Date.now() - p.lastSeen < 120000).sort((a, b) => a.distance - b.distance); }
  getTierInfo() { const r = this.getRange(); const colors = ['gray','green','blue','purple','yellow']; return { tier: r.tier, name: r.tierName, description: r.usersNeeded > 0 ? `${r.usersNeeded} more for 50km` : 'Active', color: colors[r.tier] || 'gray' }; }
   
  getStatus(): string { return this.getRange().label; }
  getIdentity() { return this.identity; }
  isScanning(): boolean { return this.scanning; }
  getDebugLog(): string[] { return [...this.debugLog]; }
  getConnectedDevices(): string[] { return Array.from(this.connectedDevices); }

  async stop(): Promise<void> { await this.stopScanning(); this.saveRooms(); this.peers.clear(); this.connectedDevices.clear(); }

  setOnPeerDiscovered(cb: Callback): void { this.onPeerDiscovered = cb; }
  setOnPeerConnected(cb: Callback): void { this.onPeerConnected = cb; }
  setOnPeerDisconnected(cb: Callback): void { this.onPeerDisconnected = cb; }
  setOnMessageReceived(cb: Callback): void { this.onMessageReceived = cb; }
  setOnRoomCreated(cb: Callback): void { this.onRoomCreated = cb; }
  setOnRequestReceived(cb: Callback): void { this.onRequestReceived = cb; }
}

export const waveMeshCore = new WaveMeshCore();

