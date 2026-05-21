export class WebRTCConnection {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private signalSend: (msg: any) => void;

  constructor(signalSend: (msg: any) => void) {
    this.signalSend = signalSend;
  }

  async startLocalStream(videoElement: HTMLVideoElement) {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    videoElement.srcObject = this.localStream;
    return this.localStream;
  }

  stopLocalStream() {
    this.localStream?.getTracks().forEach((t) => t.stop());
  }

  async createOffer(remoteVideoElement: HTMLVideoElement) {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    this.localStream
      ?.getTracks()
      .forEach((track) => this.pc!.addTrack(track, this.localStream!));
    this.pc.ontrack = (event) => {
      remoteVideoElement.srcObject = event.streams[0];
    };
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalSend({ type: 'candidate', candidate: event.candidate });
      }
    };
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.signalSend({ type: 'offer', offer: offer });
  }

  async handleOffer(
    offer: RTCSessionDescriptionInit,
    remoteVideoElement: HTMLVideoElement
  ) {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    this.pc.ontrack = (event) => {
      remoteVideoElement.srcObject = event.streams[0];
    };
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalSend({ type: 'candidate', candidate: event.candidate });
      }
    };
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    this.localStream
      ?.getTracks()
      .forEach((track) => this.pc!.addTrack(track, this.localStream!));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.signalSend({ type: 'answer', answer: answer });
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (this.pc) {
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (this.pc) {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  disconnect() {
    this.pc?.close();
    this.stopLocalStream();
  }
}