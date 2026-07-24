export class WebRTCConnection {
  private pc: RTCPeerConnection;
  private sendFn: (msg: any) => void;

  constructor(sendFn: (msg: any) => void) {
    this.sendFn = sendFn;
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendFn({ type: 'ice', candidate: event.candidate });
      }
    };

    this.pc.ontrack = (event) => {
      const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
      if (remoteVideo && event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
      }
    };
  }

  async createOffer(stream: MediaStream) {
    stream.getTracks().forEach(track => this.pc.addTrack(track, stream));
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.sendFn({ type: 'offer', sdp: offer.sdp });
  }

  async handleOffer(sdp: string, stream: MediaStream) {
    stream.getTracks().forEach(track => this.pc.addTrack(track, stream));
    await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.sendFn({ type: 'answer', sdp: answer.sdp });
  }

  async handleAnswer(sdp: string) {
    await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
  }

  async handleIce(candidate: any) {
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {}
  }

  close() {
    this.pc.close();
  }
}
