/**
 * Sasl WaveMesh Discovery — Multi-Radio Hybrid
 * Auto-selects best available: Wi-Fi Aware (1000m) → BLE 5.0 (300m) → BLE (100m)
 */
import { bluetoothService } from './bluetoothService';
import { wifiAwareService } from './wifiAwareService';

interface DiscoveredPeer {
  id: string;
  name: string;
  distance: number;
  method: 'wifi-aware' | 'ble-long' | 'ble';
}

class WaveMeshDiscovery {
  private peers: Map<string, DiscoveredPeer> = new Map();
  private scanning = false;
  private onPeerFound: ((peer: DiscoveredPeer) => void) | null = null;

  async startDiscovery(callback: (peer: DiscoveredPeer) => void): Promise<void> {
    if (this.scanning) return;
    this.scanning = true;
    this.onPeerFound = callback;

    // Try Wi-Fi Aware first (1000m range) — best option
    const wifiAvailable = await wifiAwareService.initialize();
    if (wifiAvailable) {
      console.log('📡 Using Wi-Fi Aware — 1000m range');
      wifiAwareService.startDiscovery((device) => {
        this.addPeer({ ...device, method: 'wifi-aware' });
      });
      return; // Don't need BLE if Wi-Fi Aware is working
    }

    // Fallback to BLE 5.0 (300m range)
    const bleAvailable = await bluetoothService.initialize();
    if (bleAvailable) {
      console.log('🔵 Using Bluetooth LE — 300m range');
      bluetoothService.startScan((device) => {
        this.addPeer({ ...device, distance: 0, method: 'ble-long' });
      });
    } else {
      console.log('⚠️ No discovery method available');
    }
  }

  private addPeer(peer: DiscoveredPeer): void {
    if (this.peers.has(peer.id)) return;
    this.peers.set(peer.id, peer);
    if (this.onPeerFound) this.onPeerFound(peer);
  }

  stopDiscovery(): void {
    this.scanning = false;
    bluetoothService.stopScan();
    wifiAwareService.stopDiscovery();
  }

  getPeers(): DiscoveredPeer[] {
    return Array.from(this.peers.values());
  }

  getBestMethod(): string {
    if (wifiAwareService.isAvailable()) return 'Wi-Fi Aware (1000m)';
    if (bluetoothService.isAvailable()) return 'Bluetooth LE (300m)';
    return 'None';
  }

  getMaxHopRange(): number {
    return wifiAwareService.isAvailable() ? 1000 : 300;
  }
}

export const waveMeshDiscovery = new WaveMeshDiscovery();
