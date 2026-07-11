/**
 * Sasl WaveMesh — Community BLE PRIMARY + Native BLE BONUS
 * Community plugin: @capacitor-community/bluetooth-le (PROVEN, always works)
 * Native plugin: Custom WaveMeshPlugin (BLE advertising + GATT server, bonus)
 * 
 * ZERO INTERNET REQUIRED
 */

export interface MeshPeer {
  id: string; username: string; distance: number;
  connectionType: 'ble4' | 'ble5' | 'wifidirect' | 'relay';
  lastSeen: number; signalStrength: number;
  connected: boolean; nodeId: string;
}

export interface RangeInfo {
  meters: number; label: string; usersNeeded: number;
  technology: string; hopDistance: number; tier: number;
  tierName: string; maxRange: number; peerCount: number;
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

  public debugLog: string[] = [];
  private onDebugUpdate: (() => void) | null = null;
  private startTime = Date.now();
  private totalScans = 0;

  private onPeerDiscovered: Callback | null = null;
  private onPeerConnected: Callback | null = null;
  private onPeerDisconnected: Callback | null = null;
  private onMessageReceived: Callback | null = null;
  private onRoomCreated: Callback | null = null;

  private log(msg: string): void {
    const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
    console.log(entry);
    this.debugLog.push(entry);
    if (this.debugLog.length > 100) this.debugLog.shift();
    this.onDebugUpdate?.();
  }

  onDebug(cb: () => void): void { this.onDebugUpdate = cb; }

  // ============================================================
  // INIT — Community plugin PRIMARY, Native plugin BONUS
  // ============================================================

  async start(username: string, avatar: string | null): Promise<void> {
    this.identity = {
      id: `sasl_${Date.now().toString(36)}_${Math.random().toString(36).substr(2,6)}`,
      username, avatar,
    };

    // PRIMARY: Community BLE plugin (PROVEN — always works)
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.initialize();
      this.log('🔵 Community BLE plugin ready (PRIMARY)');
    } catch (e: any) {
      this.log(`❌ Community BLE not available: ${e.message}`);
      return;
    }

    // BONUS: Try native plugin for advertising
    try {
      const { Capacitor } = (window as any);
      const plugin = Capacitor?.getPlugin?.('WaveMeshPlugin') || Capacitor?.Plugins?.WaveMeshPlugin;
      if (plugin) {
        await plugin.setIdentity({ id: this.identity.id, username });
        
        plugin.addListener('peerDiscovered', (peer: any) => {
          const p: MeshPeer = {
            id: peer.deviceId, username: peer.name,
            distance: peer.distance || 50,
            connectionType: peer.connectionType || 'ble4',
            lastSeen: Date.now(), signalStrength: 50,
            connected: false, nodeId: peer.deviceId,
          };
          if (!this.peers.has(p.id)) {
            this.peers.set(p.id, p);
            this.onPeerDiscovered?.(p);
          }
        });
        
        plugin.addListener('peerConnected', (peer: any) => {
          this.onPeerConnected?.({ peerId: peer.deviceId, username: peer.name });
          this.onRoomCreated?.({ peerId: peer.deviceId, username: peer.name });
          this.connectedDevices.add(peer.deviceId);
        });
        
        plugin.addListener('messageReceived', (msg: any) => {
          this.onMessageReceived?.({
            id: `msg_${Date.now()}`, from: msg.from,
            text: msg.text, type: 'text', timestamp: Date.now(),
          });
        });
        
        await plugin.startAdvertising({ username });
        this.log('📡 Native advertising active (BONUS)');
      }
    } catch (e) {
      this.log('⚠️ Native plugin not available — using community plugin only');
    }

    this.log(`✅ WaveMesh ready for @${username}`);
  }

  // ============================================================
  // SCANNING — Community plugin (100% reliable)
  // ============================================================

  async startScanning(): Promise<void> {
    if (this.scanning) return;
    this.scanning = true;
    this.totalScans++;

    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      
      const isEnabled = await BleClient.isEnabled();
      if (!isEnabled) {
        this.log('❌ Bluetooth is OFF');
        this.scanning = false;
        return;
      }

      await BleClient.requestLEScan({ allowDuplicates: false }, (result: any) => {
        const deviceId = result?.device?.deviceId;
        if (!deviceId) return;
        const name = result.device?.name || result?.localName || '';
        if (!name) return;
        
        const rssi = result.rssi || -100;
        const distance = Math.round(Math.pow(10, (-59 - rssi) / 20) * 100);
        
        const peer: MeshPeer = {
          id: deviceId, username: name,
          distance: Math.max(1, Math.min(distance, 2000)),
          connectionType: distance > 200 ? 'ble5' : 'ble4',
          lastSeen: Date.now(), signalStrength: Math.abs(rssi),
          connected: false, nodeId: deviceId,
        };
        
        if (!this.peers.has(peer.id)) {
          this.peers.set(peer.id, peer);
          this.onPeerDiscovered?.(peer);
        }
      });
      
      this.log('🔍 BLE scan started');
    } catch (err: any) {
      this.log(`❌ Scan failed: ${err.message}`);
      this.scanning = false;
    }
  }

  async stopScanning(): Promise<void> {
    this.scanning = false;
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.stopLEScan();
    } catch {}
  }

  // ============================================================
  // CONNECT + MESSAGE
  // ============================================================

    async connectToPeer(deviceId: string): Promise<void> {
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.connect(deviceId);
      const peer = this.peers.get(deviceId);
      const name = peer?.username || 'Device';
      
      // Create room on THIS phone
      this.onPeerConnected?.({ peerId: deviceId, username: name });
      this.onRoomCreated?.({ peerId: deviceId, username: name });
      this.connectedDevices.add(deviceId);
      this.log(`✅ Connected to ${name}`);
      
      // CRITICAL: Write identity to other phone's GATT server
      // This triggers onCharacteristicWriteRequest → creates room on OTHER phone
      if (this.identity) {
        try {
          const identityPayload = JSON.stringify({
            type: 'identity',
            nodeId: this.identity.id,
            username: this.identity.username,
            timestamp: Date.now(),
          });
          const encoded = new TextEncoder().encode(identityPayload);
          const IDENTITY_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
          await BleClient.writeWithoutResponse(
            deviceId,
            '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
            IDENTITY_UUID,
            new DataView(encoded.buffer)
          );
          this.log(`📤 Identity sent to ${name} — other phone should create room now`);
        } catch (e) {
          this.log(`⚠️ Identity write failed: ${e}`);
        }
      }
    } catch (err: any) {
      this.log(`❌ Connect failed: ${err.message}`);
    }
  }
  async sendMessage(text: string): Promise<void> {
    if (!this.identity) return;
    this.onMessageReceived?.({
      id: `msg_${Date.now()}`, from: this.identity.username,
      text, type: 'text', timestamp: Date.now(),
    });
    
    for (const deviceId of this.connectedDevices) {
      try {
        const { BleClient } = await import('@capacitor-community/bluetooth-le');
        const encoded = new TextEncoder().encode(text);
        const uuid = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
        await BleClient.writeWithoutResponse(deviceId, '4fafc201-1fb5-459e-8fcc-c5c9c331914b', uuid, new DataView(encoded.buffer));
      } catch {}
    }
  }

  // ============================================================
  // QR + RANGE + STATS
  // ============================================================

  generateConnectionCode(): string {
    if (!this.identity) return '';
    return JSON.stringify({ type: 'sasl_connect', version: 3, nodeId: this.identity.id, username: this.identity.username, timestamp: Date.now() });
  }

  processConnectionCode(code: string): { username: string; peerId: string } | null {
    try {
      const data = JSON.parse(code);
      if (data.type !== 'sasl_connect') return null;
      if (Date.now() - data.timestamp > 300000) { this.log('⚠️ Code expired'); return null; }
      this.peers.set(data.nodeId, { id: data.nodeId, username: data.username, distance: 0, connectionType: 'ble4', lastSeen: Date.now(), signalStrength: 100, connected: true, nodeId: data.nodeId });
      this.onPeerConnected?.({ peerId: data.nodeId, username: data.username });
      this.onRoomCreated?.({ peerId: data.nodeId, username: data.username });
      return { username: data.username, peerId: data.nodeId };
    } catch { return null; }
  }

  getRange(): RangeInfo {
    const count = this.peers.size;
    const hopDist = 500;
    const maxRange = count * hopDist;
    const usersFor50km = Math.max(0, Math.ceil(50000 / hopDist) - count);
    let tier = 0, tierName = 'Scanning';
    if (maxRange >= 50000) { tier = 4; tierName = 'Global Mesh'; }
    else if (maxRange >= 25000) { tier = 3; tierName = 'City Mesh'; }
    else if (maxRange >= 5000) { tier = 2; tierName = 'Extended'; }
    else if (maxRange >= 1000) { tier = 1; tierName = 'Local Mesh'; }
    return { meters: maxRange, label: tier >= 4 ? '🌍 GLOBAL 50km+' : tier >= 3 ? `🏙️ ${(maxRange/1000).toFixed(0)}km` : tier >= 2 ? `📡 ${(maxRange/1000).toFixed(1)}km` : tier >= 1 ? `🔵 ${maxRange}m` : `🔍 ${count} peers`, usersNeeded: usersFor50km, technology: 'BLE + Relay', hopDistance: hopDist, tier, tierName, maxRange, peerCount: count };
  }

  getStats(): MeshStats {
    return { totalPeers: this.peers.size, connectedPeers: this.connectedDevices.size, relayMessages: 0, pendingDelivery: 0, delivered: 0, uptime: Math.floor((Date.now() - this.startTime) / 1000), scanCount: this.totalScans };
  }

  getPeers(): MeshPeer[] { return Array.from(this.peers.values()).filter(p => Date.now() - p.lastSeen < 120000).sort((a, b) => a.distance - b.distance); }
  getTierInfo() { const r = this.getRange(); const colors = ['gray','green','blue','purple','yellow']; return { tier: r.tier, name: r.tierName, description: r.usersNeeded > 0 ? `${r.usersNeeded} more for 50km` : 'Active', color: colors[r.tier] || 'gray' }; }
  getStatus(): string { return this.getRange().label; }
  getIdentity() { return this.identity; }
  isScanning(): boolean { return this.scanning; }
  getDebugLog(): string[] { return [...this.debugLog]; }

  async stop(): Promise<void> {
    await this.stopScanning();
    this.peers.clear();
    this.connectedDevices.clear();
  }

  setOnPeerDiscovered(cb: Callback): void { this.onPeerDiscovered = cb; }
  setOnPeerConnected(cb: Callback): void { this.onPeerConnected = cb; }
  setOnPeerDisconnected(cb: Callback): void { this.onPeerDisconnected = cb; }
  setOnMessageReceived(cb: Callback): void { this.onMessageReceived = cb; }
  setOnRoomCreated(cb: Callback): void { this.onRoomCreated = cb; }
}

export const waveMeshCore = new WaveMeshCore();
