import { BleClient } from '@capacitor-community/bluetooth-le';

const SASL_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';

class BluetoothService {
  private initialized = false;
  private scanning = false;
  private deviceId = '';

  async initialize(): Promise<boolean> {
    try {
      await BleClient.initialize();
      this.initialized = true;
      this.deviceId = `sasl_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🔵 Bluetooth LE ready');
      return true;
    } catch (err) {
      console.log('⚠️ Bluetooth not available:', err);
      return false;
    }
  }

  async startScan(callback: (device: { id: string; name: string }) => void): Promise<void> {
    if (!this.initialized) { const ok = await this.initialize(); if (!ok) return; }
    if (this.scanning) return;
    this.scanning = true;

    try {
      await BleClient.requestLEScan(
        { allowDuplicates: true },
        (result) => {
          if (result.device) {
            const name = result.device?.name || result.localName || `User_${result.device.deviceId.slice(-4)}`;
            console.log('📱 BLE found:', name);
            callback({ id: result.device.deviceId, name: name });
          }
        }
      );
      console.log('🔍 BLE scan active');
    } catch (err) {
      console.log('⚠️ BLE scan failed:', err);
      this.scanning = false;
    }
  }

  async stopScan(): Promise<void> {
    try { await BleClient.stopLEScan(); } catch {}
    this.scanning = false;
  }

  isAvailable(): boolean { return this.initialized; }
  getDeviceId(): string { return this.deviceId; }
}

export const bluetoothService = new BluetoothService();
