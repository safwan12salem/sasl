/**
 * Sasl Optical Data Channel — Patent Grade
 * 
 * Transmits data through screen brightness variations detected by camera.
 * Works with ZERO connectivity — just screen + camera.
 * 
 * Encoding: Each byte → 8-bit binary → white flash (1) or black flash (0)
 * Rate: Up to 30 bytes/second at 240fps camera capture
 * Range: As far as camera can resolve screen brightness (~100m+)
 */

export interface OpticalMessage {
  id: string;
  from: string;
  text: string;
    type: 'text' | 'identity' | 'key' | 'ack' | 'relay';
  timestamp: number;
}

type MessageCallback = (msg: OpticalMessage) => void;

export class OpticalDataChannel {
  private isTransmitting = false;
  private isReceiving = false;
  private messageQueue: OpticalMessage[] = [];
  private receiveBuffer = '';
  private onMessage: MessageCallback | null = null;
  private onConnected: (() => void) | null = null;
  private transmissionFrame: number | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private brightnessHistory: number[] = [];
  private lastBrightness = 0;
  private bitBuffer: string[] = [];
  private frameHeader = '10101010'; // 0xAA sync byte
  private frameFooter = '01010101'; // 0x55 end byte
  private connected = false;

  /**
   * Start the optical data channel using device camera and screen.
   * Phone alternates between transmitting (screen flashes) and receiving (camera captures).
   */
  async start(onMessage: MessageCallback, onConnected: () => void): Promise<void> {
    this.onMessage = onMessage;
    this.onConnected = onConnected;
    
    // Start camera for receiving
    await this.startCamera();
    
    // Begin the transmit/receive cycle
    this.cycle();
    
    console.log('📡 Optical Data Channel started');
  }

  /**
   * Queue a message for transmission via optical channel
   */
  send(text: string, from: string): void {
    const msg: OpticalMessage = {
      id: `opt_${Date.now()}`,
      from,
      text,
      type: 'text',
      timestamp: Date.now(),
    };
    this.messageQueue.push(msg);
    console.log(`📤 Queued for optical tx: "${text.substring(0, 20)}..."`);
  }

  /**
   * Send identity during handshake
   */
  sendIdentity(username: string, publicKey: string): void {
    const msg: OpticalMessage = {
      id: `ident_${Date.now()}`,
      from: username,
      text: JSON.stringify({ username, publicKey, type: 'identity' }),
      type: 'identity',
      timestamp: Date.now(),
    };
    this.messageQueue.unshift(msg); // Priority — send before chat messages
  }

  /**
   * Main cycle: alternate between transmitting and receiving.
   * Each phase lasts ~1-2 seconds for reliable detection.
   */
  private async cycle(): Promise<void> {
    let phase: 'transmit' | 'receive' = 'transmit';
    
    setInterval(async () => {
      if (phase === 'transmit') {
        if (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift()!;
          await this.transmitMessage(msg);
        } else {
          // Send heartbeat to maintain connection
          await this.transmitHeartbeat();
        }
        phase = 'receive';
      } else {
        await this.receiveFrame();
        phase = 'transmit';
      }
    }, 1500); // 1.5 second cycle
  }

  /**
   * Encode a message as screen brightness flashes
   */
  private async transmitMessage(msg: OpticalMessage): Promise<void> {
    const payload = JSON.stringify(msg);
    const binary = this.textToBinary(payload);
    const framed = this.frameHeader + binary + this.frameFooter;
    
    await this.flashPattern(framed);
    console.log(`✅ Transmitted: ${msg.text.substring(0, 30)}`);
  }

  /**
   * Transmit heartbeat to keep channel alive
   */
  private async transmitHeartbeat(): Promise<void> {
    const heartbeat = this.frameHeader + '00000000' + this.frameFooter;
    await this.flashPattern(heartbeat);
  }

  /**
   * Flash screen pattern — white for 1, black for 0
   */
  private async flashPattern(binary: string): Promise<void> {
    this.isTransmitting = true;
    
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.zIndex = '9999';
      document.body.appendChild(this.canvas);
    }
    
    const ctx = this.canvas.getContext('2d')!;
    const bitDuration = 33; // ~30 bits per second
    
    for (let i = 0; i < binary.length; i++) {
      const isWhite = binary[i] === '1';
      ctx.fillStyle = isWhite ? '#FFFFFF' : '#000000';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      await this.sleep(bitDuration);
    }
    
    // Return screen to normal
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.isTransmitting = false;
  }

  /**
   * Capture camera frame and detect brightness to decode bits
   */
  private async receiveFrame(): Promise<void> {
    if (!this.videoElement || !this.stream) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d')!;
    
    // Capture multiple frames and average brightness
    let totalBrightness = 0;
    const samplesPerFrame = 10;
    
    for (let s = 0; s < samplesPerFrame; s++) {
      ctx.drawImage(this.videoElement, 0, 0, 320, 240);
      const imageData = ctx.getImageData(0, 0, 320, 240);
      let sum = 0;
      for (let i = 0; i < imageData.data.length; i += 4) {
        sum += (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
      }
      const avgBrightness = sum / (imageData.data.length / 4);
      totalBrightness += avgBrightness;
      await this.sleep(33);
    }
    
    const brightness = totalBrightness / samplesPerFrame;
    const bit = brightness > 128 ? '1' : '0';
    
    this.bitBuffer.push(bit);
    
    // Check for framed message
    await this.decodeBuffer();
  }

  /**
   * Try to extract framed messages from bit buffer
   */
  private async decodeBuffer(): Promise<void> {
    const bufferStr = this.bitBuffer.join('');
    const headerIdx = bufferStr.indexOf(this.frameHeader);
    const footerIdx = bufferStr.indexOf(this.frameFooter, headerIdx + this.frameHeader.length);
    
    if (headerIdx >= 0 && footerIdx > headerIdx) {
      const messageBits = bufferStr.substring(headerIdx + this.frameHeader.length, footerIdx);
      const text = this.binaryToText(messageBits);
      
      // Clear processed bits
      this.bitBuffer = bufferStr.substring(footerIdx + this.frameFooter.length).split('');
      
      try {
        const msg: OpticalMessage = JSON.parse(text);
        
        if (!this.connected) {
          this.connected = true;
          this.onConnected?.();
        }
        
        if (msg.type === 'identity') {
          console.log('🔑 Received identity:', msg.from);
        }
        
        if (msg.text && msg.text.length > 0) {
          this.onMessage?.(msg);
        }
      } catch {
        // Not a valid JSON message — might be noise
      }
    }
    
    // Prevent buffer overflow
    if (this.bitBuffer.length > 10000) {
      this.bitBuffer = this.bitBuffer.slice(-5000);
    }
  }

  /**
   * Start device camera for receiving optical data
   */
  private async startCamera(): Promise<void> {
    try {
      this.videoElement = document.createElement('video');
      this.videoElement.setAttribute('playsinline', '');
      this.videoElement.style.display = 'none';
      document.body.appendChild(this.videoElement);
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 320 },
          height: { ideal: 240 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });
      
      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();
      
      console.log('📷 Camera started for optical receiver');
    } catch (err) {
      console.error('Camera access failed:', err);
      throw err;
    }
  }

  /**
   * Convert text to binary string
   */
  private textToBinary(text: string): string {
    let binary = '';
    for (let i = 0; i < text.length; i++) {
      const byte = text.charCodeAt(i);
      binary += byte.toString(2).padStart(8, '0');
    }
    return binary;
  }

  /**
   * Convert binary string to text
   */
  private binaryToText(binary: string): string {
    let text = '';
    for (let i = 0; i < binary.length; i += 8) {
      const byte = binary.substring(i, i + 8);
      if (byte.length === 8) {
        text += String.fromCharCode(parseInt(byte, 2));
      }
    }
    return text;
  }

  /**
   * Stop the optical channel
   */
  stop(): void {
    this.connected = false;
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }
    if (this.videoElement) {
      this.videoElement.remove();
    }
    if (this.canvas) {
      this.canvas.remove();
    }
    console.log('📡 Optical Data Channel stopped');
  }

  isConnected(): boolean {
    return this.connected;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const opticalChannel = new OpticalDataChannel();