/**
 * Sasl - Live Beats – real‑time audio streaming using WebRTC data channel.
 * (Prototype: uses AudioContext to capture and play audio, streams over WebSocket signaling)
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Mic, Speaker, Loader2 } from 'lucide-react';

let localStream: MediaStream | null = null;
let pc: RTCPeerConnection | null = null;

export default function LiveBeats() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const startStreaming = useCallback(async () => {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      localStream.getTracks().forEach(track => pc!.addTrack(track, localStream!));

      // Create offer and send to signaling server (we'll use a simple WebSocket)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Here you would send the offer via your signaling WebSocket. For demo, we'll log.
      console.log('Offer created, send to remote:', offer);
      toast.success('Streaming started');
      setIsStreaming(true);
    } catch (err: any) {
      toast.error('Microphone access denied');
    }
  }, []);

  const startListening = useCallback(async () => {
    // Simulate receiving an offer from remote and playing audio
    if (!pc) return;
    try {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      // Normally you'd receive remote offer, but here we fake it.
      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play();
        }
      };
      setIsListening(true);
      toast.success('Listening to stream');
    } catch (err: any) {
      toast.error('Failed to listen');
    }
  }, []);

  const stop = () => {
    if (pc) {
      pc.close();
      pc = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }
    setIsStreaming(false);
    setIsListening(false);
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-2xl font-bold gradient-text mb-4 flex items-center gap-2">
        <Speaker /> Live Beats
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Real‑time audio streaming using WebRTC. Start broadcasting and others can listen.
      </p>
      <div className="flex gap-2 mb-4">
        <button
          onClick={startStreaming}
          disabled={isStreaming}
          className="btn-primary flex items-center gap-1"
        >
          <Mic size={16} /> Start Streaming
        </button>
        <button
          onClick={startListening}
          disabled={isListening || isStreaming}
          className="btn-secondary flex items-center gap-1"
        >
          <Speaker size={16} /> Listen
        </button>
        { (isStreaming || isListening) && (
          <button onClick={stop} className="btn-ghost">Stop</button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-400">Local Audio</p>
          <audio ref={localAudioRef} autoPlay muted className="w-full" />
        </div>
        <div>
          <p className="text-xs text-gray-400">Remote Audio</p>
          <audio ref={remoteAudioRef} autoPlay className="w-full" />
        </div>
      </div>
    </div>
  );
}