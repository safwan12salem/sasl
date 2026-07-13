/**
 * Sasl Signal Reflection Mapper
 * 
 * Maps the Bluetooth environment to find the best signal path.
 * Uses passive BLE detection of nearby devices as reference points.
 * Calculates optimal positioning for maximum range through obstacles.
 * 
 * NEVER connects to non-Sasl devices. Detection only.
 */

export interface SignalDevice {
  id: string;
  name: string;
  distance: number;
  signalStrength: number;
  type: 'sasl' | 'bluetooth' | 'unknown';
}

export interface SignalPath {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  suggestion: string;
  nearbyDevices: number;
  saslPeers: number;
  reflectionPoints: string[];
}

export class SignalMapper {
  private devices: SignalDevice[] = [];
  private lastScanTime = 0;

  /**
   * Add detected devices from BLE scan
   */
  addDevices(devices: SignalDevice[]): void {
    for (const device of devices) {
      const existing = this.devices.find(d => d.id === device.id);
      if (existing) {
        existing.distance = device.distance;
        existing.signalStrength = device.signalStrength;
      } else {
        this.devices.push(device);
      }
    }
    this.lastScanTime = Date.now();
  }

  /**
   * Find the best signal path to connect
   * Uses nearby Bluetooth devices as reflection reference points
   */
  analyzePath(): SignalPath {
    const saslPeers = this.devices.filter(d => d.type === 'sasl');
    const bluetoothDevices = this.devices.filter(d => d.type === 'bluetooth');
    const allDevices = this.devices.length;
    
    // Calculate reflection points (devices with strong signals between us and target)
    const strongReflectors = bluetoothDevices.filter(d => d.signalStrength > 50);
    const reflectionNames = strongReflectors.slice(0, 3).map(d => d.name);
    
    // Determine signal quality based on Sasl peers and environment
    let quality: SignalPath['quality'] = 'poor';
    let suggestion = '';
    
    if (saslPeers.length > 0) {
      const avgSignal = saslPeers.reduce((s, d) => s + d.signalStrength, 0) / saslPeers.length;
      if (avgSignal > 60) {
        quality = 'excellent';
        suggestion = '✅ Strong connection — chat freely!';
      } else if (avgSignal > 40) {
        quality = 'good';
        suggestion = bluetoothDevices.length > 5 
          ? `📡 Good signal. ${bluetoothDevices.length} nearby devices helping reflect signal.`
          : '📡 Good signal. Move slightly for better connection.';
      } else if (avgSignal > 20) {
        quality = 'fair';
        suggestion = strongReflectors.length > 0
          ? `⚠️ Signal fading. Point toward ${reflectionNames[0] || 'open area'} for better reception.`
          : '⚠️ Weak signal. Move closer or find open space.';
      } else {
        quality = 'poor';
        suggestion = allDevices > 0
          ? `🔴 Very weak signal. ${allDevices} devices detected — try moving toward them.`
          : '🔴 No signal. Move to an open area or closer to the other user.';
      }
    } else if (bluetoothDevices.length > 0) {
      quality = 'fair';
      suggestion = `🔍 No Sasl peers yet. ${bluetoothDevices.length} Bluetooth devices nearby — signal may reflect.`;
    } else {
      quality = 'poor';
      suggestion = '🔍 Scanning... Move to an open area.';
    }

    return {
      quality,
      suggestion,
      nearbyDevices: allDevices,
      saslPeers: saslPeers.length,
      reflectionPoints: reflectionNames,
    };
  }

  /**
   * Get the best direction to face for maximum signal
   * Based on strongest Bluetooth device locations
   */
  getBestDirection(): string | null {
    const strongDevices = this.devices
      .filter(d => d.signalStrength > 40)
      .sort((a, b) => b.signalStrength - a.signalStrength)
      .slice(0, 1);
    
    if (strongDevices.length > 0) {
      return `Point toward "${strongDevices[0].name}" for better signal`;
    }
    return null;
  }

  /**
   * Get environment summary for display
   */
  getEnvironmentSummary(): string {
    const bluetoothCount = this.devices.filter(d => d.type === 'bluetooth').length;
    const saslCount = this.devices.filter(d => d.type === 'sasl').length;
    const total = this.devices.length;
    
    if (total === 0) return 'No devices detected';
    return `${total} devices (${saslCount} Sasl · ${bluetoothCount} BT)`;
  }

  clear(): void {
    this.devices = [];
  }
}

export const signalMapper = new SignalMapper();
