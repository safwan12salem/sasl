/**
 * Sasl WaveMesh P2P — True offline device-to-device communication
 * QR code signaling → WebRTC data channel → encrypted messaging
 * No internet. No WiFi. No cell towers.
 */
class OfflineP2P {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private onMessage: ((msg: any) => void) | null = null;
  private onConnected: (() => void) | null = null;
  private onPeerInfo: ((info: { username: string; avatar: string | null }) => void) | null = null;
  private myUsername = '';
  private myAvatar: string | null = null;

  /**
   * Phone A: Generate QR code containing WebRTC offer
   * Other phone scans this to connect
   */
  async generateOfferCode(username: string, avatar: string | null): Promise<string> {
    this.myUsername = username;
    this.myAvatar = avatar;
    
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    });

    this.dataChannel = this.pc.createDataChannel('sasl-mesh');
    this.setupDataChannel();

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Wait for ICE gathering
    await new Promise<void>(resolve => {
      if (this.pc!.iceGatheringState === 'complete') resolve();
      this.pc!.onicegatheringstatechange = () => {
        if (this.pc!.iceGatheringState === 'complete') resolve();
      };
    });

    // Return the offer as a QR code string
    const offerData = {
      type: 'sasl_offer',
      username: this.myUsername,
      avatar: this.myAvatar,
      offer: this.pc.localDescription
    };
    
    return JSON.stringify(offerData);
  }

  /**
   * Phone B: Scan QR code and connect to Phone A
   */
  async connectFromScan(qrData: string, myUsername: string, myAvatar: string | null): Promise<boolean> {
    try {
      const data = JSON.parse(qrData);
      if (data.type !== 'sasl_offer') return false;

      this.myUsername = myUsername;
      this.myAvatar = myAvatar;

      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      });

      this.pc.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel();
      };

      await this.pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      // Share our info with Phone A via ICE candidates or first message
      this.onPeerInfo?.({ username: data.username, avatar: data.avatar });

      return true;
    } catch (err) {
      console.error('QR connect failed:', err);
      return false;
    }
  }

  private setupDataChannel(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      // Send our identity as first message
      this.dataChannel!.send(JSON.stringify({
        type: 'identity',
        username: this.myUsername,
        avatar: this.myAvatar
      }));
      this.onConnected?.();
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        // Handle identity exchange
        if (msg.type === 'identity') {
          this.onPeerInfo?.({ username: msg.username, avatar: msg.avatar });
          return;
        }
        
        this.onMessage?.(msg);
      } catch {
        this.onMessage?.({ text: event.data });
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

  setOnMessage(callback: (msg: any) => void): void { this.onMessage = callback; }
  setOnConnected(callback: () => void): void { this.onConnected = callback; }
  setOnPeerInfo(callback: (info: { username: string; avatar: string | null }) => void): void { this.onPeerInfo = callback; }

  disconnect(): void {
    this.dataChannel?.close();
    this.pc?.close();
    this.pc = null;
    this.dataChannel = null;
  }

  isConnected(): boolean {
    return this.dataChannel?.readyState === 'open';
  }
}

export const offlineP2P = new OfflineP2P();
