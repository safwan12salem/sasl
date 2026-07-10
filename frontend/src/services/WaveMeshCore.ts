/**
 * Sasl WaveMesh Core — Dual-Engine BLE P2P
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
  public debugLog: string[] = [];
  private onDebugUpdate: (() => void) | null = null;

  private onPeerDiscovered: Callback | null = null;
  private onPeerConnected: Callback | null = null;
  private onMessageReceived: Callback | null = null;
  private onRoomCreated: Callback | null = null;

  private log(msg: string): void {
    console.log(msg);
    this.debugLog.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    if (this.debugLog.length > 50) this.debugLog.shift();
    this.onDebugUpdate?.();
  }

  onDebug(cb: () => void): void { this.onDebugUpdate = cb; }

  async start(username: string, avatar: string | null): Promise<void> {
    this.identity = {
      id: `sasl_${Date.now().toString(36)}_${Math.random().toString(36).substr(2,6)}`,
      username, avatar,
    };
    this.log(`Starting WaveMesh for @${username}`);

    const hasCapacitor = !!(window as any).Capacitor;
    this.log(`Capacitor available: ${hasCapacitor}`);

    if (hasCapacitor) {
      try {
        const { BleClient } = await import('@capacitor-community/bluetooth-le');
        this.log('BLE plugin loaded');
        try {
          await BleClient.initialize();
          this.log('BLE initialized successfully');
        } catch (e: any) {
          this.log(`BLE init failed: ${e.message || e}`);
          return;
        }
      } catch (e: any) {
        this.log(`BLE plugin import failed: ${e.message || e}`);
        return;
      }
    } else {
      this.log('Not running on Capacitor - web browser mode');
      return;
    }
  }

  async startScanning(): Promise<void> {
    if (this.scanning) { this.log('Already scanning'); return; }
    this.scanning = true;
    this.log('Starting BLE scan...');

    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      
      const isEnabled = await BleClient.isEnabled();
      this.log(`Bluetooth enabled: ${isEnabled}`);
      
      if (!isEnabled) {
        this.log('Bluetooth is OFF. Please turn ON Bluetooth.');
        this.scanning = false;
        return;
      }

      await BleClient.requestLEScan(
        { allowDuplicates: true },
        (result: any) => {
          const deviceId = result?.device?.deviceId;
          if (!deviceId) return;
          
          const name = result.device?.name || result?.localName || `Device_${deviceId.slice(-4)}`;
          const rssi = result.rssi || -100;
          const distance = Math.round(Math.pow(10, (-59 - rssi) / 20) * 100);
          
          this.log(`Found: ${name} at ${distance}m`);
          
          const peer: MeshPeer = {
            id: deviceId,
            username: name,
            distance: Math.max(1, Math.min(distance, 1000)),
            connectionType: 'ble4',
            lastSeen: Date.now(),
            signalStrength: Math.abs(rssi),
          };
          
          this.peers.set(deviceId, peer);
          this.onPeerDiscovered?.(peer);
        }
      );
      
      this.log('BLE scan started - waiting for devices...');
    } catch (err: any) {
      this.log(`Scan failed: ${err.message || err}`);
      this.scanning = false;
    }
  }

  async stopScanning(): Promise<void> {
    this.scanning = false;
    this.log('Scan stopped');
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.stopLEScan();
    } catch {}
  }

  async connectToPeer(deviceId: string): Promise<void> {
    this.log(`Connecting to ${deviceId}...`);
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.connect(deviceId);
      this.log('Connected!');
      this.onPeerConnected?.({ peerId: deviceId, username: 'Peer' });
      this.onRoomCreated?.({ peerId: deviceId, username: 'Peer' });
    } catch (err: any) {
      this.log(`Connect failed: ${err.message || err}`);
    }
  }

  async sendMessage(text: string): Promise<void> {
    if (this.identity) {
      this.onMessageReceived?.({
        id: `msg_${Date.now()}`,
        from: this.identity.username,
        text, type: 'text', timestamp: Date.now(),
      });
    }
  }

  getRange(): RangeInfo {
    const count = this.peers.size;
    const hopDist = 500;
    const maxRange = count * hopDist;
    const usersFor50km = Math.max(0, Math.ceil(50000 / hopDist) - count);
    if (maxRange >= 50000) return { meters: maxRange, label: '🌍 GLOBAL 50km+', usersNeeded: 0, technology: 'BLE Mesh', hopDistance: hopDist };
    if (maxRange >= 1000) return { meters: maxRange, label: `🔵 ${maxRange}m`, usersNeeded: usersFor50km, technology: 'BLE Mesh', hopDistance: hopDist };
    return { meters: maxRange, label: `🔍 ${count} peers`, usersNeeded: usersFor50km, technology: 'BLE Mesh', hopDistance: hopDist };
  }

  getTierInfo() {
    const range = this.getRange();
    if (range.meters >= 50000) return { tier: 4, name: 'Global Mesh', description: '50km+' };
    if (range.meters >= 1000) return { tier: 1, name: 'Local Mesh', description: `${range.usersNeeded} more for 50km` };
    return { tier: 0, name: 'Scanning', description: this.scanning ? 'Searching...' : 'Press Start Scan' };
  }

  generateConnectionCode(): string {
    if (!this.identity) return '';
    return JSON.stringify({ type: 'sasl_connect', id: this.identity.id, username: this.identity.username });
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

  stop(): void { this.stopScanning(); this.peers.clear(); }

  setOnPeerDiscovered(cb: Callback): void { this.onPeerDiscovered = cb; }
  setOnPeerConnected(cb: Callback): void { this.onPeerConnected = cb; }
  setOnMessageReceived(cb: Callback): void { this.onMessageReceived = cb; }
  setOnRoomCreated(cb: Callback): void { this.onRoomCreated = cb; }
}

export const waveMeshCore = new WaveMeshCore();