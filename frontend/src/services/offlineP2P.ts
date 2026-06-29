/**
 * Sasl Offline P2P — QR Code Direct Connect (Nearby Users)
 * Uses WebRTC with QR code exchange for zero-infrastructure P2P
 */
class OfflineP2P {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private onMessageCallback: ((msg: any) => void) | null = null;
  private onConnectedCallback: (() => void) | null = null;

  async generateOfferCode(): Promise<string> {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    this.dataChannel = this.pc.createDataChannel('sasl-mesh');
    this.setupDataChannel();
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await new Promise<void>(resolve => {
      if (this.pc!.iceGatheringState === 'complete') resolve();
      this.pc!.onicegatheringstatechange = () => {
        if (this.pc!.iceGatheringState === 'complete') resolve();
      };
    });
    return btoa(JSON.stringify(this.pc.localDescription));
  }

  async acceptOfferCode(code: string): Promise<void> {
    const offer = JSON.parse(atob(code));
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };
    await this.pc.setRemoteDescription(offer);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
  }

  private setupDataChannel(): void {
    if (!this.dataChannel) return;
    this.dataChannel.onopen = () => {
      console.log('🌊 Offline P2P connected!');
      if (this.onConnectedCallback) this.onConnectedCallback();
    };
    this.dataChannel.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (this.onMessageCallback) this.onMessageCallback(msg);
      } catch {
        if (this.onMessageCallback) this.onMessageCallback({ text: event.data });
      }
    };
  }

  sendMessage(msg: any): boolean {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  onMessage(callback: (msg: any) => void): void { this.onMessageCallback = callback; }
  onConnected(callback: () => void): void { this.onConnectedCallback = callback; }

  disconnect(): void {
    this.dataChannel?.close();
    this.pc?.close();
    this.pc = null;
    this.dataChannel = null;
  }

  isConnected(): boolean { return this.dataChannel?.readyState === 'open'; }
}

export const offlineP2P = new OfflineP2P();
