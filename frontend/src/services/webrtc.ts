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
        video: true,
        audio: true,
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
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, this.localStream!);
        } catch (e) {
          // Track already added — skip
        }
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalSend({ type: 'candidate', candidate: event.candidate.toJSON() });
      }
    };

    return pc;
  }

    
  async createOffer(remoteVideoElement: HTMLVideoElement) {
    if (this.pc && this.pc.signalingState !== 'stable' && this.pc.signalingState !== 'closed') {
      return;
    }
    this.pc = this.createPeerConnection();

    this.pc.ontrack = (event) => {
      if (event.streams[0]) {
        remoteVideoElement.srcObject = event.streams[0];
      }
    };

    try {
      const offer = await this.pc.createOffer();
      if (this.pc.signalingState !== 'stable') return;
      await this.pc.setLocalDescription(offer);
      if (this.pc.localDescription) {
        this.signalSend({ type: 'offer', offer: this.pc.localDescription.toJSON() });
      }
    } catch (err) {
      console.warn('Create offer failed:', err);
    }
  }


  async handleOffer(offer: RTCSessionDescriptionInit, remoteVideoElement: HTMLVideoElement) {
    if (this.makingOffer) {
      this.ignoreOffer = true;
      return;
    }

    if (!this.pc) {
      this.pc = this.createPeerConnection();
    }

    this.pc.ontrack = (event) => {
      if (event.streams[0]) {
        remoteVideoElement.srcObject = event.streams[0];
      }
    };

    try {
      if (this.pc.signalingState !== 'stable') {
        this.pc.close();
        this.pc = this.createPeerConnection();
        this.pc.ontrack = (event) => {
          if (event.streams[0]) remoteVideoElement.srcObject = event.streams[0];
        };
      }

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
    } catch (err) {
      console.warn('Handle offer failed:', err);
    }
  }


  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.pc) return;

    try {
      // Only accept answer if we have a local offer pending
      if (this.pc.signalingState !== 'have-local-offer') {
        console.warn('Cannot handle answer in state:', this.pc.signalingState);
        return;
      }

      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
      // Add this after setRemoteDescription in BOTH handleOffer and handleAnswer:
// Process queued candidates
for (const c of this.candidateQueue) {
    try { await this.pc!.addIceCandidate(new RTCIceCandidate(c)); } catch {}
}
this.candidateQueue = [];

    } catch (err) {
      console.warn('Handle answer failed:', err);
    }
  }

 async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc) return;

    // If remote description isn't set yet, queue the candidate
    if (!this.pc.remoteDescription) {
        this.candidateQueue.push(candidate);
        return;
    }

    try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
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


