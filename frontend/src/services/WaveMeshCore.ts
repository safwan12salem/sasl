
/**
 * Sasl WaveMesh — Dual-Engine BLE P2P
 * 
 * PRIMARY: @capacitor-community/bluetooth-le (proven, tested)
 * SECONDARY: Custom WaveMeshPlugin Java (BLE 5 Coded PHY)
 * AUTO-FALLBACK: If custom plugin fails, uses community plugin
 * NO UUID FILTER: Finds ALL nearby devices for maximum discovery
 */

export interface MeshPeer {
  id: string;
  username: string;
  distance: number;
  connectionType: 'ble4' | 'ble5' | 'wifidirect' | 'relay';
  lastSeen: number;
  signalStrength: number;
}

export interface RangeInfo {
  meters: number;
  label: string;
  usersNeeded: number;
  technology: string;
  hopDistance: number;
}

type Callback = (data: any) => void;

class WaveMeshCore {
  private identity: { id: string; username: string; avatar: string | null } | null = null;
  private peers: Map<string, MeshPeer> = new Map();
  private scanning = false;
  private usingCustomPlugin = false;
  private usingCommunityPlugin = false;

  private onPeerDiscovered: Callback | null = null;
  private onPeerConnected: Callback | null = null;
  private onMessageReceived: Callback | null = null;
  private onRoomCreated: Callback | null = null;

  async start(username: string, avatar: string | null): Promise<void> {
    this.identity = {
      id: `sasl_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`,
      username,
      avatar,
    };

    // Try custom plugin first (BLE 5)
    try {
      const { Capacitor } = (window as any);
      const customPlugin = Capacitor?.getPlugin?.('WaveMeshPlugin') || Capacitor?.Plugins?.WaveMeshPlugin;
      if (customPlugin) {
        await customPlugin.setIdentity({ id: this.identity.id, username });
        customPlugin.addListener('peerDiscovered', (peer: any) => {
          this.addPeer({
            id: peer.deviceId,
            username: peer.name,
            distance: peer.distance || 100,
            connectionType: peer.connectionType || 'ble5',
            lastSeen: Date.now(),
            signalStrength: peer.signalStrength || 50,
          });
        });
        customPlugin.addListener('peerConnected', (peer: any) => {
          this.onPeerConnected?.({ peerId: peer.deviceId, username: peer.name });
          this.onRoomCreated?.({ peerId: peer.deviceId, username: peer.name });
        });
        customPlugin.addListener('messageReceived', (msg: any) => {
          this.onMessageReceived?.({ id: `msg_${Date.now()}`, from: msg.from, text: msg.text, type: 'text', timestamp: Date.now() });
        });
        this.usingCustomPlugin = true;
        console.log('🔵 Using custom WaveMeshPlugin (BLE 5)');
      }
    } catch (err) {
      console.log('⚠️ Custom plugin not available, will use community plugin');
    }

    // Always try community plugin as fallback/primary
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.initialize();
      this.usingCommunityPlugin = true;
      console.log('🔵 Community BLE plugin ready (fallback)');
    } catch (err) {
      console.log('⚠️ Community BLE plugin not available');
    }

    if (!this.usingCustomPlugin && !this.usingCommunityPlugin) {
      console.error('❌ No BLE plugins available');
    }
  }

  private addPeer(peer: MeshPeer): void {
    if (!this.peers.has(peer.id) || this.peers.get(peer.id)!.distance !== peer.distance) {
      this.peers.set(peer.id, peer);
      this.onPeerDiscovered?.(peer);
    }
  }

  async startScanning(): Promise<void> {
    if (this.scanning) return;
    this.scanning = true;

    // Try custom plugin first
    if (this.usingCustomPlugin) {
      try {
        const { Capacitor } = (window as any);
        const plugin = Capacitor?.getPlugin?.('WaveMeshPlugin') || Capacitor?.Plugins?.WaveMeshPlugin;
        if (plugin) {
          await plugin.startBLEScan();
          console.log('🔍 Custom plugin scan started');
          return;
        }
      } catch (err) {
        console.log('⚠️ Custom plugin scan failed, trying community plugin');
      }
    }

    // Fallback to community plugin (PROVEN)
    if (this.usingCommunityPlugin) {
      try {
        const { BleClient } = await import('@capacitor-community/bluetooth-le');
        
        // NO UUID FILTER — find ALL devices
        await BleClient.requestLEScan(
          { allowDuplicates: true },
          (result: any) => {
            if (!result?.device?.deviceId) return;
            
            const name = result.device?.name || 
                        result?.localName || 
                        `Device_${result.device.deviceId.slice(-4)}`;
            const rssi = result.rssi || -100;
            const distance = Math.round(Math.pow(10, (-59 - rssi) / 20) * 100);
            
            if (distance > 1000) return; // Ignore very far devices
            
            this.addPeer({
              id: result.device.deviceId,
              username: name,
              distance: Math.max(1, Math.min(distance, 1000)),
              connectionType: distance > 200 ? 'ble5' : 'ble4',
              lastSeen: Date.now(),
              signalStrength: Math.abs(rssi),
            });
          }
        );
        console.log('🔍 Community BLE scan started (no filter)');
        return;
      } catch (err) {
        console.error('❌ Community BLE scan failed:', err);
        this.scanning = false;
      }
    }
    
    console.error('❌ No BLE plugin available for scanning');
    this.scanning = false;
  }

  async stopScanning(): Promise<void> {
    this.scanning = false;
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.stopLEScan();
    } catch {}
    try {
      const { Capacitor } = (window as any);
      const plugin = Capacitor?.getPlugin?.('WaveMeshPlugin') || Capacitor?.Plugins?.WaveMeshPlugin;
      if (plugin) await plugin.stopBLEScan();
    } catch {}
  }

  async connectToPeer(deviceId: string): Promise<void> {
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.connect(deviceId);
      console.log(`🔗 Connected: ${deviceId}`);
      this.onPeerConnected?.({ peerId: deviceId, username: 'Connected Peer' });
      this.onRoomCreated?.({ peerId: deviceId, username: 'Connected Peer' });
    } catch (err) {
      console.error('Connect failed:', err);
    }
  }

  async sendMessage(text: string): Promise<void> {
    if (this.identity) {
      this.onMessageReceived?.({
        id: `msg_${Date.now()}`,
        from: this.identity.username,
        text,
        type: 'text',
        timestamp: Date.now(),
      });
    }
  }

  getRange(): RangeInfo {
    const count = this.peers.size;
    const hopDist = 500; // BLE 5 Coded PHY
    const maxRange = count * hopDist;
    const usersFor50km = Math.max(0, Math.ceil(50000 / hopDist) - count);
    
    if (maxRange >= 50000) return { meters: maxRange, label: '🌍 GLOBAL MESH 50km+', usersNeeded: 0, technology: 'BLE 5 Mesh', hopDistance: hopDist };
    if (maxRange >= 25000) return { meters: maxRange, label: `🏙️ City ${(maxRange/1000).toFixed(0)}km`, usersNeeded: usersFor50km, technology: 'BLE 5 Mesh', hopDistance: hopDist };
    if (maxRange >= 5000) return { meters: maxRange, label: `📡 ${(maxRange/1000).toFixed(1)}km`, usersNeeded: usersFor50km, technology: 'BLE 5 Mesh', hopDistance: hopDist };
    if (maxRange >= 1000) return { meters: maxRange, label: `🔵 ${maxRange}m`, usersNeeded: usersFor50km, technology: 'BLE 5 Mesh', hopDistance: hopDist };
    return { meters: maxRange, label: `🔍 ${count} peers · Need ${usersFor50km} for 50km`, usersNeeded: usersFor50km, technology: 'BLE 5 Mesh', hopDistance: hopDist };
  }

  getTierInfo(): { tier: number; name: string; description: string } {
    const range = this.getRange();
    if (range.meters >= 50000) return { tier: 4, name: 'Global Mesh', description: '50km+ active' };
    if (range.meters >= 25000) return { tier: 3, name: 'City Mesh', description: `${range.usersNeeded} more for 50km` };
    if (range.meters >= 5000) return { tier: 2, name: 'Extended', description: `${range.usersNeeded} more for 50km` };
    if (range.meters >= 1000) return { tier: 1, name: 'Local Mesh', description: `${range.usersNeeded} more for 50km` };
    return { tier: 0, name: 'Scanning', description: 'Discovering peers...' };
  }

  generateConnectionCode(): string {
    if (!this.identity) return '';
    return JSON.stringify({ type: 'sasl_connect', id: this.identity.id, username: this.identity.username, timestamp: Date.now() });
  }

  processConnectionCode(code: string): { username: string; peerId: string } | null {
    try {
      const data = JSON.parse(code);
      if (data.type === 'sasl_connect') {
        this.onPeerConnected?.({ peerId: data.id, username: data.username });
        this.onRoomCreated?.({ peerId: data.id, username: data.username });
        return { username: data.username, peerId: data.id };
      }
      return null;
    } catch { return null; }
  }

  getPeers(): MeshPeer[] {
    return Array.from(this.peers.values())
      .filter(p => Date.now() - p.lastSeen < 120000)
      .sort((a, b) => a.distance - b.distance);
  }

  getStatus(): string { return this.getRange().label; }
  getIdentity() { return this.identity; }
  isScanning(): boolean { return this.scanning; }

  stop(): void {
    this.stopScanning();
    this.peers.clear();
  }

  setOnPeerDiscovered(cb: Callback): void { this.onPeerDiscovered = cb; }
  setOnPeerConnected(cb: Callback): void { this.onPeerConnected = cb; }
  setOnMessageReceived(cb: Callback): void { this.onMessageReceived = cb; }
  setOnRoomCreated(cb: Callback): void { this.onRoomCreated = cb; }
}

export const waveMeshCore = new WaveMeshCore();