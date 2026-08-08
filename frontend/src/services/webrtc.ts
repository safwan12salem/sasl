export class WebRTCConnection {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private signalSend: (msg: any) => void;
  private makingOffer = false;
  private ignoreOffer = false;
  private candidateQueue: RTCIceCandidateInit[] = [];
  private remoteVideoElement: HTMLVideoElement | null = null;
  
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
      iceTransportPolicy: 'all',
      iceCandidatePoolSize: 2,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { 
          urls: [
            'turn:global.relay.metered.ca:80?transport=udp',
            'turn:global.relay.metered.ca:80?transport=tcp',
            'turn:global.relay.metered.ca:443?transport=tcp',
          ],
          username: '9a949126f260451ca16f969e',
          credential: 'HNHbY2NEDOgMoMfd'
        },
      ]
    });

    // Add local tracks IMMEDIATELY so they're in the SDP
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        try { pc.addTrack(track, this.localStream!); } catch (e) {}
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalSend({ type: 'candidate', candidate: event.candidate.toJSON() });
      }
    };

    // Handle incoming remote tracks
           pc.ontrack = (event) => {
      console.log('🔥 ONTRACK FIRED! Track kind:', event.track.kind, 'Streams:', event.streams.length);
      if (event.streams[0] && this.remoteVideoElement) {
        console.log('🔥 Setting remote video srcObject');
        this.remoteVideoElement.srcObject = event.streams[0];
        this.remoteVideoElement.style.display = 'block';
        this.remoteVideoElement.muted = false;
        this.remoteVideoElement.play().then(() => {
          console.log('▶️ Remote video playing');
                }).catch(e => {
          console.log('▶️ Play blocked, waiting for tap');
          const playVideo = () => {
            if (this.remoteVideoElement) {
              this.remoteVideoElement.play().catch(() => {});
            }
          };
          document.addEventListener('click', playVideo, { once: true });
          document.addEventListener('touchstart', playVideo, { once: true });
        });
            }
    };

    return pc;
  }

  async createOffer(remoteVideoElement: HTMLVideoElement) {
    this.remoteVideoElement = remoteVideoElement;
    
    if (this.pc && this.pc.signalingState !== 'closed') {
      this.pc.close();
    }
    this.pc = this.createPeerConnection();

    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      if (this.pc.localDescription) {
        this.signalSend({ type: 'offer', offer: this.pc.localDescription.toJSON() });
      }
    } catch (err: any) {
      console.warn('Create offer failed:', err);
    }
  }


  async handleOffer(offer: RTCSessionDescriptionInit, remoteVideoElement: HTMLVideoElement) {
    this.remoteVideoElement = remoteVideoElement;
    if (this.makingOffer) { this.ignoreOffer = true; return; }
    
    // Always close old connection if exists, create fresh one
    if (this.pc) { this.pc.close(); }
    this.pc = this.createPeerConnection(); // This already adds tracks

    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      // DO NOT add tracks again here — they're already added by createPeerConnection()
      
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
    this.remoteVideoElement = null;
  }
}  

