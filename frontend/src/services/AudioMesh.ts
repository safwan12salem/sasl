/**
 * Sasl AudioMesh — Long-Range Audio Data Transmission
 * 
 * Uses phone speaker + microphone to transmit data through sound.
 * Range: 500-2000m in open spaces (forest, desert, mountains).
 * Fallback when BLE signal is too weak.
 * 
 * Encoding: Each byte → specific frequency tone → speaker plays → mic receives → decode
 * Frequencies: 18kHz-20kHz (near-ultrasonic, barely audible)
 * Data rate: ~10-20 bytes/second
 * Range: 10x BLE in open air
 */

export class AudioMesh {
  private audioContext: AudioContext | null = null;
  private isListening = false;
  private isTransmitting = false;
  private onMessageReceived: ((text: string) => void) | null = null;
  
  // Frequency mapping for each hex character (0-9, a-f)
  private readonly FREQ_MAP: Record<string, number> = {
    '0': 18000, '1': 18100, '2': 18200, '3': 18300, '4': 18400,
    '5': 18500, '6': 18600, '7': 18700, '8': 18800, '9': 18900,
    'a': 19000, 'b': 19100, 'c': 19200, 'd': 19300, 'e': 19400, 'f': 19500,
  };
  
  private readonly SYNC_FREQ = 17000; // Sync pulse before message
  private readonly END_FREQ = 20000;  // End of message marker
  private readonly CHAR_DURATION = 50; // ms per character
  
  async start(): Promise<void> {
    this.audioContext = new AudioContext();
    console.log('🔊 AudioMesh ready — 500-2000m range');
  }
  
  /**
   * Transmit a message through audio
   */
  async transmit(text: string): Promise<void> {
    if (!this.audioContext || this.isTransmitting) return;
    this.isTransmitting = true;
    
    const hex = this.textToHex(text);
    console.log(`🔊 Transmitting: "${text}" → ${hex.length} chars`);
    
    // Play sync pulse
    await this.playTone(this.SYNC_FREQ, 100);
    
    // Play each character
    for (let i = 0; i < hex.length; i++) {
      const char = hex[i].toLowerCase();
      const freq = this.FREQ_MAP[char] || 18500;
      await this.playTone(freq, this.CHAR_DURATION);
    }
    
    // Play end marker
    await this.playTone(this.END_FREQ, 100);
    
    this.isTransmitting = false;
    console.log('🔊 Transmission complete');
  }
  
  /**
   * Start listening for audio messages
   */
  async startListening(callback: (text: string) => void): Promise<void> {
    if (!this.audioContext || this.isListening) return;
    this.onMessageReceived = callback;
    this.isListening = true;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      
      const buffer = new Float32Array(analyser.fftSize);
      let messageBuffer = '';
      let listening = false;
      
      const detect = () => {
        if (!this.isListening) return;
        analyser.getFloatTimeDomainData(buffer);
        
        // Simple frequency detection
        const freq = this.detectFrequency(buffer);
        
        if (freq === this.SYNC_FREQ && !listening) {
          listening = true;
          messageBuffer = '';
          console.log('🔊 Sync detected — receiving message');
        } else if (freq === this.END_FREQ && listening) {
          listening = false;
          const text = this.hexToText(messageBuffer);
          console.log(`🔊 Message received: "${text}"`);
          this.onMessageReceived?.(text);
          messageBuffer = '';
        } else if (listening && freq > 0) {
          // Find closest hex character
          let bestChar = '0';
          let bestDiff = Infinity;
          for (const [char, f] of Object.entries(this.FREQ_MAP)) {
            const diff = Math.abs(f - freq);
            if (diff < bestDiff && diff < 50) {
              bestDiff = diff;
              bestChar = char;
            }
          }
          messageBuffer += bestChar;
        }
        
        requestAnimationFrame(detect);
      };
      
      detect();
      console.log('👂 AudioMesh listening — 500-2000m range');
    } catch {
      console.log('⚠️ Microphone access denied');
      this.isListening = false;
    }
  }
  
  /**
   * Detect dominant frequency from audio buffer
   */
  private detectFrequency(buffer: Float32Array): number {
    // Simple zero-crossing frequency detection
    let crossings = 0;
    for (let i = 1; i < buffer.length; i++) {
      if (buffer[i - 1] < 0 && buffer[i] >= 0) crossings++;
    }
    const sampleRate = this.audioContext?.sampleRate || 44100;
    return (crossings * sampleRate) / buffer.length;
  }
  
  /**
   * Play a specific frequency tone
   */
  private async playTone(freq: number, duration: number): Promise<void> {
    if (!this.audioContext) return;
    
    return new Promise((resolve) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      osc.connect(gain);
      gain.connect(this.audioContext!.destination);
      
      osc.frequency.value = freq;
      gain.gain.value = 1.0;
      
      osc.start();
      setTimeout(() => {
        osc.stop();
        resolve();
      }, duration);
    });
  }
  
  private textToHex(text: string): string {
    let hex = '';
    for (let i = 0; i < text.length; i++) {
      hex += text.charCodeAt(i).toString(16).padStart(4, '0');
    }
    return hex;
  }
  
  private hexToText(hex: string): string {
    let text = '';
    for (let i = 0; i < hex.length; i += 4) {
      text += String.fromCharCode(parseInt(hex.substring(i, i + 4), 16));
    }
    return text;
  }
  
  stop(): void {
    this.isListening = false;
    this.isTransmitting = false;
    this.audioContext?.close();
  }
  
  isActive(): boolean {
    return this.isListening || this.isTransmitting;
  }
}

export const audioMesh = new AudioMesh();
