import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';

interface Props {
  roomId: string;
  onClose: () => void;
   onVideoCall?: () => void;  // Add ? to make optional
  onVoiceCall?: () => void; 
}

export default function WebRTCPrivateChat({ roomId, onClose }: Props) {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const token = localStorage.getItem('sasl_token');

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/video/${roomId}/?token=${token}`);
    wsRef.current = ws;
    ws.onopen = () => {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pcRef.current = pc;
      const channel = pc.createDataChannel('private-chat');
      channel.onopen = () => setConnected(true);
      channel.onmessage = (e) => setMessages(prev => [...prev, e.data]);
      channelRef.current = channel;

      pc.onicecandidate = (e) => {
        if (e.candidate) ws.send(JSON.stringify({ type: 'candidate', candidate: e.candidate }));
      };

      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ type: 'offer', offer }));
      });

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'answer') await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        else if (data.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: 'answer', answer }));
        } else if (data.type === 'candidate') await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      };
    };
    return () => {
      wsRef.current?.close();
      pcRef.current?.close();
    };
  }, [roomId, token]);

  const send = () => {
    if (channelRef.current?.readyState === 'open') {
      channelRef.current.send(input);
      setMessages(prev => [...prev, `Me: ${input}`]);
      setInput('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-full max-w-md p-4">
        <div className="flex justify-between mb-2">
          <h3 className="font-bold">Private Chat</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="h-60 bg-gray-100 rounded p-2 overflow-y-auto mb-2">
          {messages.map((m, i) => <p key={i} className="text-sm">{m}</p>)}
        </div>
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} className="input-field flex-1" placeholder="Message..." />
          <button onClick={send} disabled={!connected} className="btn-primary"><Send size={16} /></button>
        </div>
      </div>
    </div>
  );
}