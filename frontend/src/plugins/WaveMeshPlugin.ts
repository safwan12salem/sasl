import { registerPlugin } from '@capacitor/core';

export interface WaveMeshPluginInterface {
  setIdentity(options: { id: string; username: string }): Promise<void>;
  startBLEScan(): Promise<void>;
  stopBLEScan(): Promise<void>;
  connectToPeer(options: { deviceAddress: string }): Promise<void>;
  sendOverBLE(options: { peerAddress: string; type: string; data: string }): Promise<void>;
  startWifiDirectDiscovery(): Promise<void>;
  sendOverWifiDirect(options: { peerAddress: string; type: string; data: string }): Promise<void>;
  startWifiAwareDiscovery(): Promise<void>;
  getCapabilities(): Promise<{ bleReady: boolean; wifiDirectReady: boolean; wifiAwareReady: boolean; multipeerReady: boolean }>;
  stop(): Promise<void>;
  addListener(eventName: string, listenerFunc: (data: any) => void): Promise<{ remove: () => void }>;
  removeAllListeners(): Promise<void>;
}

const WaveMeshPlugin = registerPlugin<WaveMeshPluginInterface>('WaveMeshPlugin');

export default WaveMeshPlugin;
