export class WebRTCConnection {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private signalSend: (msg: any) => void;
  private makingOffer = false;
  private ignoreOffer = false;

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

  stopLocalStream() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
  }

  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    // Add local tracks
    this.localStream?.getTracks().forEach((track) => {
      if (this.localStream) pc.addTrack(track, this.localStream);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalSend({ type: 'candidate', candidate: event.candidate.toJSON() });
      }
    };

    // Handle negotiation needed
    pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;
        await pc.setLocalDescription();
        if (pc.localDescription) {
          this.signalSend({ type: 'offer', offer: pc.localDescription.toJSON() });
        }
      } catch (err) {
        console.warn('Negotiation failed:', err);
      } finally {
        this.makingOffer = false;
      }
    };

    return pc;
  }

  async createOffer(remoteVideoElement: HTMLVideoElement) {
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

  async handleOffer(
    offer: RTCSessionDescriptionInit,
    remoteVideoElement: HTMLVideoElement
  ) {
    // If we're making an offer, ignore incoming offers (polite peer)
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
      // Check state before setting remote description
      if (this.pc.signalingState !== 'stable') {
        console.warn('Cannot handle offer in state:', this.pc.signalingState);
        return;
      }

      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      
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
    } catch (err) {
      console.warn('Handle answer failed:', err);
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc) return;

    try {
      // Only add candidates when we have a remote description
      if (this.pc.signalingState === 'stable' && !this.pc.remoteDescription) {
        // Queue candidate for later or ignore
        return;
      }

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
  }
}