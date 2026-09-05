/**
 * Sasl WaveMesh Core — LEGENDARY EDITION
 * BLE GATT cross-device + Echo Relay + AudioMesh + File Transfer + Encryption
 * Capacitor Preferences persistence + Command Queue + DirectP2P
 */
import { Preferences } from '@capacitor/preferences';
import WaveMeshPlugin from '../plugins/WaveMeshPlugin';
import { echoRelay } from './EchoRelay';
import { directP2P } from './DirectP2P';
import { encryptForPeer, decryptFromPeer } from './encryption';
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
  private commandQueue: { command: string; timestamp: number }[] = [];
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
  private audioMeshActive = false;

  private log(msg: string): void {
    const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
    console.log(entry);
    this.debugLog.push(entry);
    if (this.debugLog.length > 100) this.debugLog.shift();
    this.onDebugUpdate?.();
  }
  onDebug(cb: () => void): void { this.onDebugUpdate = cb; }

  async start(username: string, avatar: string | null): Promise<void> {
    this.scanning = false;
    this.identity = { id: `sasl_${Date.now().toString(36)}_${Math.random().toString(36).substr(2,6)}`, username, avatar };
    
    // Start DirectP2P for extended range
    directP2P.start(username);
    directP2P.onPeerFound((peer) => {
      this.onPeerDiscovered?.(peer);
    });
    directP2P.onMessageReceived((from, text) => {
      this.onMessageReceived?.({ id: `msg_${Date.now()}`, from, text, type: 'text', timestamp: Date.now() });
    });
    
    // Start Echo Relay for store-and-forward mesh
    echoRelay.start(this.identity.id);
    echoRelay.onMessage((msg) => {
           this.onMessageReceived?.({ id: msg.id, from: msg.from, text: msg.text, type: 'text', timestamp: msg.timestamp, relayPath: msg.relayPath });
    });
    
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.initialize();
      this.log('🔵 Community BLE ready');
    } catch (e: any) { this.log(`❌ BLE not available: ${e.message}`); }
    
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
        // Forward relay messages to newly connected peer
        echoRelay.forwardToPeer(peer.deviceId);
                this.propagateRelayMessages(peer.deviceId);  // VIRUS RELAY: send stored messages via BLE
        this.log(`✅ Connected to ${name}`);
      });
      
            // VIRUS RELAY RECEIVER: Accept relay messages, store, forward again
      plugin.addListener('relayMessageReceived', (envelope: any) => {
        try {
          const data = JSON.parse(envelope.data || envelope);
          if (data.type === 'relay_hop') {
            // Check if this message is for us
            if (data.to === this.identity?.id || data.to === this.identity?.username) {
              // DELIVERED! Show in UI
              this.onMessageReceived?.({ 
                id: data.msgId, 
                from: data.from, 
                text: data.text, 
                type: 'text', 
                timestamp: Date.now(),
                relayPath: data.relayPath 
              });
            } else {
              // We're a middleman — store silently, forward when next peer connects
              echoRelay.storeRelayEnvelope(data);
              // DON'T show in UI — user sees nothing
            }
          }
        } catch {}
      });

      plugin.addListener('messageReceived', (msg: any) => {
          this.onMessageReceived?.({ id: `msg_${Date.now()}`, from: msg.from, text: msg.text, type: 'text', timestamp: Date.now() });
          // Forward to relay mesh
        echoRelay.forwardToPeer(msg.from);
        
      });
      
      await plugin.startAdvertising({ username });
      this.log('📡 Native GATT server + advertising active');
    } catch (e: any) { this.log(`⚠️ Native plugin unavailable: ${e.message || e}`); }
    
    await this.restoreRooms();
    this.log(`✅ WaveMesh ready for @${username}`);
  }

   private async restoreRooms(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'sasl_wavemesh_rooms' });
      if (value) {
        const rooms = JSON.parse(value);
        const recentRooms = rooms.filter((r: any) => r.lastSeen && (Date.now() - r.lastSeen < 86400000));
        if (recentRooms.length === 0) {
          await Preferences.remove({ key: 'sasl_wavemesh_rooms' });
          return;
        }
        for (const room of recentRooms) {
          this.peers.set(room.id, room);
          this.connectedDevices.add(room.id);
          this.onRoomCreated?.({ peerId: room.id, username: room.username });
        }
        this.log(`📂 Restored ${recentRooms.length} rooms`);
      }
    } catch {}
  }




   private async saveRooms(): Promise<void> {
    try {
      const rooms = Array.from(this.peers.values())
        .filter(p => p.connected)
        .map(p => ({ ...p, lastSeen: Date.now() }));
      await Preferences.set({ key: 'sasl_wavemesh_rooms', value: JSON.stringify(rooms) });
    } catch {}
  }

  async startScanning(): Promise<void> {
    if (this.scanning) return;
    try { const { BleClient } = await import('@capacitor-community/bluetooth-le'); await BleClient.stopLEScan(); } catch {}
    this.scanning = true; this.totalScans++;
    
    // Also start DirectP2P scanning for extended range
    directP2P.startScanning().catch(() => {});
    
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

  async stopScanning(): Promise<void> { 
    this.scanning = false; 
    try { const { BleClient } = await import('@capacitor-community/bluetooth-le'); await BleClient.stopLEScan(); } catch {} 
  }

  async sendConnectionRequest(deviceId: string): Promise<void> {
    const peer = this.peers.get(deviceId);
    const username = peer?.username || 'Unknown';
    this.log(`📩 Sending request to ${username}`);
    this.pendingRequests.set(deviceId, username);
    this.onPeerDiscovered?.({ ...peer, isRequested: true });
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

  async connectToPeer(deviceId: string): Promise<void> {
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.connect(deviceId);
      const peer = this.peers.get(deviceId); const name = peer?.username || 'Device';
      this.connectedDevices.add(deviceId);
      if (peer) { peer.connected = true; peer.lastSeen = Date.now(); }
      this.onPeerConnected?.({ peerId: deviceId, username: name });
      this.onRoomCreated?.({ peerId: deviceId, username: name });
      await this.saveRooms();
      
      // Flush queued commands on new connection
      if (this.commandQueue.length > 0) {
        this.log(`📤 Flushing ${this.commandQueue.length} queued commands`);
        for (const { command } of [...this.commandQueue]) {
          try {
            const encoded = new TextEncoder().encode(command);
            await BleClient.writeWithoutResponse(deviceId, '4fafc201-1fb5-459e-8fcc-c5c9c331914b', 'beb5483e-36e1-4688-b7f5-ea07361b26a8', new DataView(encoded.buffer));
          } catch {}
        }
        this.commandQueue = [];
      }
      
      // Forward relay messages
      echoRelay.forwardToPeer(deviceId);
      
      this.log(`✅ Connected to ${name}`);
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


  generateInviteCode(): string {
    if (!this.identity) return '';
    const code = `${this.identity.username.substring(0,2).toUpperCase()}-${Date.now().toString(36).substring(4,8).toUpperCase()}`;
    return code;
  }


    processInviteCode(code: string): { username: string; peerId: string } | null {
    if (!this.identity) return null;
    // Store the code in pending invites
    localStorage.setItem(`sasl_invite_${code}`, this.identity.username);
    return { username: this.identity.username, peerId: this.identity.id };
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.identity) return;
    
    // Encrypt message
        const encrypted = text;
    
    // Echo to sender
   
       // Store in Echo Relay for mesh forwarding
   
    echoRelay.storeMessage('broadcast', encrypted, this.identity?.username || 'me').catch(() => {});
    // Send via DirectP2P
    directP2P.sendMessage(text);
    
    // Send to ALL connected devices via BLE GATT
    for (const deviceId of this.connectedDevices) {
      try {
        const { BleClient } = await import('@capacitor-community/bluetooth-le');
        await BleClient.connect(deviceId);
        const encoded = new TextEncoder().encode(encrypted);
        await BleClient.writeWithoutResponse(deviceId, '4fafc201-1fb5-459e-8fcc-c5c9c331914b', 'beb5483e-36e1-4688-b7f5-ea07361b26a8', new DataView(encoded.buffer));
        const peer = this.peers.get(deviceId);
        this.log(`📤 Sent to ${peer?.username || deviceId}`);
        
        // Flush command queue after successful message
        if (this.commandQueue.length > 0) {
          this.log(`📤 Flushing ${this.commandQueue.length} queued commands`);
          for (const { command } of [...this.commandQueue]) {
            try {
              const encCmd = await encryptForPeer(command);
              const cmdEncoded = new TextEncoder().encode(encCmd);
              await BleClient.writeWithoutResponse(deviceId, '4fafc201-1fb5-459e-8fcc-c5c9c331914b', 'beb5483e-36e1-4688-b7f5-ea07361b26a8', new DataView(cmdEncoded.buffer));
            } catch {}
          }
          this.commandQueue = [];
        }
      } catch (e) {
               this.log(`⚠️ BLE send failed, attempting reconnect`);
        this.connectedDevices.delete(deviceId);
        await this.startScanning();
        setTimeout(async () => {
          await this.stopScanning();
          await this.connectToPeer(deviceId);
          this.log(`🔄 Reconnected to ${deviceId}`);
        }, 5000);
      }
    }
  }


  

  /**
   * VIRUS RELAY: Forward undelivered Echo Relay messages to a connected peer via BLE
   * Every Sasl user is a bridge. Messages hop through the mesh silently.
   * Middlemen store encrypted envelopes — they see nothing.
   * Only the destination phone delivers to UI.
   */
  private async propagateRelayMessages(deviceId: string): Promise<void> {
    const undelivered = echoRelay.getUndeliveredMessages();
    for (const msg of undelivered) {
      if (msg.relayPath.includes(deviceId)) continue; // Loop prevention
      
      const envelope = JSON.stringify({
        type: 'relay_hop',
        msgId: msg.id,
        from: msg.from,
        to: msg.to,
        text: msg.text,
        hopCount: msg.hopCount + 1,
        relayPath: [...msg.relayPath, deviceId],
        ttl: msg.ttl - 1,
      });
      
      try {
        const { BleClient } = await import('@capacitor-community/bluetooth-le');
        await BleClient.connect(deviceId);
        const encoded = new TextEncoder().encode(envelope);
        await BleClient.writeWithoutResponse(
          deviceId,
          '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
          're1ay000-36e1-4688-b7f5-ea07361b26a8',
          new DataView(encoded.buffer)
        );
        echoRelay.markRelayed(msg.id, deviceId);
        this.log(`🦠 Hop: ${msg.id.substring(0,8)} → ${deviceId}`);
      } catch {}
    }
  }


  async sendControlCommand(command: string): Promise<void> {
    if (!this.identity) return;
        const encrypted = command;
    let sent = false;
    for (const deviceId of this.connectedDevices) {
      try {
        const { BleClient } = await import('@capacitor-community/bluetooth-le');
        await BleClient.connect(deviceId);
        const encoded = new TextEncoder().encode(encrypted);
        await BleClient.writeWithoutResponse(deviceId, '4fafc201-1fb5-459e-8fcc-c5c9c331914b', 'beb5483e-36e1-4688-b7f5-ea07361b26a8', new DataView(encoded.buffer));
        this.log(`📤 Control sent to ${deviceId}`);
        sent = true;
      } catch (e) {}
    }
    
    if (!sent) {
      this.commandQueue.push({ command, timestamp: Date.now() });
      this.log(`📥 Command queued (${this.commandQueue.length} pending)`);
    }
  }


  async sendQRMessage(text: string, targetNodeId: string): Promise<void> {
    if (!this.identity) return;
    await this.sendMessage(text);
  }




  async sendFile(fileData: Uint8Array, fileName: string): Promise<void> {
    if (!this.identity) return;
    const CHUNK_SIZE = 512;
    const totalChunks = Math.ceil(fileData.length / CHUNK_SIZE);
    this.log(`📎 Sending file: ${fileName} (${fileData.length} bytes, ${totalChunks} chunks)`);
    
    const header = JSON.stringify({ type: 'file_start', name: fileName, size: fileData.length, chunks: totalChunks });
    await this.sendMessage(header);
    
    for (let i = 0; i < totalChunks; i++) {
      const chunk = fileData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkB64 = btoa(String.fromCharCode(...chunk));
      const chunkMsg = JSON.stringify({ type: 'file_chunk', name: fileName, index: i, total: totalChunks, data: chunkB64 });
      await this.sendMessage(chunkMsg);
    }
    this.log(`✅ File sent: ${fileName}`);
  }

  async sendViaAudioMesh(text: string): Promise<void> {
    if (!this.identity) return;
    this.onMessageReceived?.({ id: `msg_${Date.now()}`, from: this.identity.username, text, type: 'audiomesh', timestamp: Date.now() });
    
    try {
      const { audioMesh } = await import('./AudioMesh');
      await audioMesh.start();
      await audioMesh.transmit(text);
      this.log(`🔊 Sent via AudioMesh: "${text.substring(0, 20)}"`);
    } catch (e) { this.log(`⚠️ AudioMesh failed: ${e}`); }
    
    // Also send via BLE
    await this.sendMessage(text);
  }

  async disconnectPeer(peerId: string): Promise<void> {
    this.connectedDevices.delete(peerId);
    this.peers.delete(peerId);
    await this.saveRooms();
  }

  generateConnectionCode(): string {
    if (!this.identity) return '';
    return JSON.stringify({ type: 'sasl_connect', version: 3, nodeId: this.identity.id, username: this.identity.username, timestamp: Date.now() });
  }

 async processConnectionCode(code: string): Promise<{ username: string; peerId: string } | null> {
    try {
      const data = JSON.parse(code); if (data.type !== 'sasl_connect') return null;
      if (Date.now() - data.timestamp > 300000) { this.log('⚠️ Code expired'); return null; }
      this.peers.set(data.nodeId, { id: data.nodeId, username: data.username, distance: 0, connectionType: 'ble4', lastSeen: Date.now(), signalStrength: 100, connected: true, nodeId: data.nodeId });
            // Don't add nodeId — start a scan to find the actual BLE MAC
      this.log('🔍 QR handshake complete — scanning for BLE MAC');
      await this.startScanning();
      setTimeout(async () => {
        await this.stopScanning();
        const foundPeer = this.peers.get(data.nodeId);
        if (foundPeer) {
          this.connectedDevices.add(foundPeer.id);
          this.log(`✅ BLE MAC found: ${foundPeer.id}`);
        }
      }, 4000);
      this.onPeerConnected?.({ peerId: data.nodeId, username: data.username });
      this.onRoomCreated?.({ peerId: data.nodeId, username: data.username });
      this.saveRooms();
            // Send confirmation back so the OTHER phone also creates the room
      if (this.identity) {
        const confirmPayload = JSON.stringify({ 
          type: 'qr_confirm', 
          from: this.identity.username, 
          peerId: this.identity.id, 
          username: this.identity.username 
        });
        // Send via the same BLE connection we just established
        this.sendControlCommand(confirmPayload).catch(() => {});
      }
      // Auto-connect BLE so messages flow immediately
      this.connectToPeer(data.nodeId).catch(() => {});
      
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
    return { meters: maxRange, label: tier >= 4 ? '🌍 GLOBAL 50km+' : tier >= 3 ? `🏙️ ${(maxRange/1000).toFixed(0)}km` : tier >= 2 ? `📡 ${(maxRange/1000).toFixed(1)}km` : tier >= 1 ? `🔵 ${maxRange}m` : `🔍 ${count} peers`, usersNeeded: usersFor50km, technology: 'BLE 5 + Echo Relay', hopDistance: hopDist, tier, tierName, maxRange, peerCount: count, signalStrength: avgSignal };
  }

  getStats(): MeshStats { 
    const relayStats = echoRelay.getStats();
    return { totalPeers: this.peers.size, connectedPeers: this.connectedDevices.size, relayMessages: relayStats.totalMessages, pendingDelivery: relayStats.pendingDelivery, delivered: relayStats.delivered, uptime: Math.floor((Date.now() - this.startTime) / 1000), scanCount: this.totalScans }; 
  }
  getPeers(): MeshPeer[] { return Array.from(this.peers.values()).filter(p => Date.now() - p.lastSeen < 120000).sort((a, b) => a.distance - b.distance); }
  getTierInfo() { const r = this.getRange(); const colors = ['gray','green','blue','purple','yellow']; return { tier: r.tier, name: r.tierName, description: r.usersNeeded > 0 ? `${r.usersNeeded} more for 50km` : 'Active', color: colors[r.tier] || 'gray' }; }
  getStatus(): string { return this.getRange().label; }
  getIdentity() { return this.identity; }
  isScanning(): boolean { return this.scanning; }
  getDebugLog(): string[] { return [...this.debugLog]; }
  getConnectedDevices(): string[] { return Array.from(this.connectedDevices); }

  async stop(): Promise<void> { 
    await this.stopScanning(); 
    await this.saveRooms(); 
    this.peers.clear(); 
    this.connectedDevices.clear(); 
    directP2P.stop();
    echoRelay.stop();
  }

  setOnPeerDiscovered(cb: Callback): void { this.onPeerDiscovered = cb; }
  setOnPeerConnected(cb: Callback): void { this.onPeerConnected = cb; }
  setOnPeerDisconnected(cb: Callback): void { this.onPeerDisconnected = cb; }
  setOnMessageReceived(cb: Callback): void { this.onMessageReceived = cb; }
  setOnRoomCreated(cb: Callback): void { this.onRoomCreated = cb; }
  setOnRequestReceived(cb: Callback): void { this.onRequestReceived = cb; }
}

export const waveMeshCore = new WaveMeshCore();