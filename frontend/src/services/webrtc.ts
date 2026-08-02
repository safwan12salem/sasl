export class WebRTCConnection {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private signalSend: (msg: any) => void;
  private makingOffer = false;
  private ignoreOffer = false;
  private candidateQueue: RTCIceCandidateInit[] = [];
  
  constructor(signalSend: (msg: any) => void) {
    this.signalSend = signalSend;
  }

  async startLocalStream(videoElement: HTMLVideoElement) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true, audio: true,
      });
      videoElement.srcObject = this.localStream;
      return this.localStream;
    } catch (err) {
      console.warn('Camera/mic access failed:', err);
      throw err;
    }
  }

  setLocalStream(stream: MediaStream) {
    this.localStream = stream;
  }

  stopLocalStream() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
  }

  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: [ "stun:fr-turn3.xirsys.com" ]
      },
      {
        username: "zAS325DYRQzJuudRVtta9PNUpfM3BUU8TpiG18zUHLIb_GUm--OVl1hB7ITd8s90AAAAAGpvO91zYXNs",
        credential: "03c44a60-8e70-11f1-8e76-fecd1aef9c76",
        urls: [
          "turn:fr-turn3.xirsys.com:80?transport=udp",
          "turn:fr-turn3.xirsys.com:3478?transport=udp",
          "turn:fr-turn3.xirsys.com:80?transport=tcp",
          "turn:fr-turn3.xirsys.com:3478?transport=tcp",
          "turns:fr-turn3.xirsys.com:443?transport=tcp",
          "turns:fr-turn3.xirsys.com:5349?transport=tcp"
        ]
      }
    ]
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try { pc.addTrack(track, this.localStream!); } catch (e) {}
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalSend({ type: 'candidate', candidate: event.candidate.toJSON() });
      }
    };

    return pc;
  }

  async createOffer(remoteVideoElement: HTMLVideoElement) {
    if (this.pc && this.pc.signalingState !== 'stable' && this.pc.signalingState !== 'closed') return;
    this.pc = this.createPeerConnection();

   this.pc.ontrack = (event) => {
  if (event.streams[0] && event.track.kind === 'video') {
    if (remoteVideoElement.srcObject !== event.streams[0]) {
            remoteVideoElement.srcObject = event.streams[0];

      remoteVideoElement.load();
      // TEST: raw DOM video element
var testVideo = document.createElement('video');
testVideo.srcObject = event.streams[0];
testVideo.autoplay = true;
testVideo.playsInline = true;
testVideo.style.cssText = 'position:fixed;top:50px;left:50px;width:300px;height:200px;z-index:99999;border:3px solid red;background:black;';
document.body.appendChild(testVideo);
testVideo.play().catch(() => {});


      remoteVideoElement.style.width = '100%';
      remoteVideoElement.style.height = '100%';
      setTimeout(() => remoteVideoElement.play().catch(() => {}), 200);
    }
  }
};

    try {
      const offer = await this.pc.createOffer();
      if (this.pc.signalingState !== 'stable') return;
      await this.pc.setLocalDescription(offer);
      if (this.pc.localDescription) {
        this.signalSend({ type: 'offer', offer: this.pc.localDescription.toJSON() });
      }
    } catch (err: any) {
      console.warn('Create offer failed:', err);
    }
  }

  async handleOffer(offer: RTCSessionDescriptionInit, remoteVideoElement: HTMLVideoElement) {
    if (this.makingOffer) { this.ignoreOffer = true; return; }
    if (!this.pc) { this.pc = this.createPeerConnection(); }

        this.pc.ontrack = (event) => {
      if (event.streams[0] && event.track.kind === 'video') {
        if (remoteVideoElement.srcObject !== event.streams[0]) {
                    remoteVideoElement.srcObject = event.streams[0];
                    var testVideo = document.createElement('video');
testVideo.srcObject = event.streams[0];
testVideo.autoplay = true;
testVideo.playsInline = true;
testVideo.style.cssText = 'position:fixed;top:50px;left:50px;width:300px;height:200px;z-index:99999;border:3px solid red;background:black;';
document.body.appendChild(testVideo);
testVideo.play().catch(() => {});
          remoteVideoElement.load();

          remoteVideoElement.style.width = '100%';
          remoteVideoElement.style.height = '100%';
          setTimeout(() => remoteVideoElement.play().catch(() => {}), 200);
        }
      }
    };

    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      for (const c of this.candidateQueue) {
        try { await this.pc!.addIceCandidate(new RTCIceCandidate(c)); } catch {}
      }
      this.candidateQueue = [];
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      if (this.pc.localDescription) {
        this.signalSend({ type: 'answer', answer: this.pc.localDescription.toJSON() });
      }
    } catch (err: any) {
      console.warn('Handle offer failed:', err);
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.pc) return;
    try {
      if (this.pc.signalingState !== 'have-local-offer') return;
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
      for (const c of this.candidateQueue) {
        try { await this.pc!.addIceCandidate(new RTCIceCandidate(c)); } catch {}
      }
      this.candidateQueue = [];
    } catch (err: any) {
      console.warn('Handle answer failed:', err);
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc) return;
    if (!this.pc.remoteDescription) {
      this.candidateQueue.push(candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err: any) {
      console.warn('Add ICE candidate failed:', err);
    }
  }

  disconnect() {
    this.pc?.close();
    this.pc = null;
    this.stopLocalStream();
    this.makingOffer = false;
    this.ignoreOffer = false;
    this.candidateQueue = [];
  }
}