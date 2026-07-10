/**
 * Sasl QR Handshake — One-time identity + key exchange
 * 
 * After this single scan, the optical data channel takes over
 * for continuous message transmission.
 */

export interface HandshakeData {
  username: string;
  publicKey: string;
  peerId: string;
  timestamp: number;
}

type HandshakeCallback = (peer: HandshakeData) => void;

export class QRHandshake {
  private onPeerIdentified: HandshakeCallback | null = null;

  /**
   * Generate a QR code payload containing identity + encryption key
   */
  generateHandshakeCode(username: string, publicKey: string, peerId: string): string {
    const data: HandshakeData = {
      username,
      publicKey,
      peerId,
      timestamp: Date.now(),
    };
    return JSON.stringify(data);
  }

  /**
   * Parse a scanned QR code to extract peer identity
   */
  parseHandshakeCode(code: string): HandshakeData | null {
    try {
      const data: HandshakeData = JSON.parse(code);
      if (!data.username || !data.publicKey || !data.peerId) return null;
      
      // Verify timestamp is recent (within 5 minutes)
      if (Date.now() - data.timestamp > 300000) {
        console.warn('QR code expired');
        return null;
      }
      
      this.onPeerIdentified?.(data);
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Set callback for when a peer is identified via QR
   */
  onPeerDiscovered(callback: HandshakeCallback): void {
    this.onPeerIdentified = callback;
  }
}

export const qrHandshake = new QRHandshake();