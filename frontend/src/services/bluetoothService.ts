import { BleClient } from '@capacitor-community/bluetooth-le';

const SASL_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const SASL_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

class BluetoothService {
  private initialized = false;
  private scanning = false;
  private advertising = false;
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

  async startAdvertising(username: string): Promise<void> {
    if (!this.initialized) await this.initialize();
    if (this.advertising) return;
    
    try {
      await BleClient.startAdvertising({
        services: [SASL_SERVICE_UUID],
        name: `Sasl:${username}`,
        includeDeviceName: true,
      });
      this.advertising = true;
      console.log('📡 Broadcasting as:', username);
    } catch (err) {
      console.log('⚠️ Advertising failed:', err);
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
            const name = result.device?.name || result.localName || `Sasl_${result.device.deviceId.slice(-4)}`;
            if (name.includes('Sasl:')) {
              console.log('📱 Found:', name);
              callback({ id: result.device.deviceId, name: name.replace('Sasl:', '') });
            }
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

  async stopAdvertising(): Promise<void> {
    try { await BleClient.stopAdvertising(); } catch {}
    this.advertising = false;
  }

  isAvailable(): boolean { return this.initialized; }
  getDeviceId(): string { return this.deviceId; }
}

export const bluetoothService = new BluetoothService();
