/**
 * Sasl - WebRTC Chat – peer‑to‑peer text messaging
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { MessageCircle, Send } from 'lucide-react';

const ROOM_ID = 'sasl-mesh-chat';

export default function WebRTCChat() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [started, setStarted] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const token = localStorage.getItem('sasl_token');

  const connect = useCallback(() => {
    setStarted(true);
    const ws = new WebSocket(`ws://localhost:8000/ws/video/${ROOM_ID}/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      const channel = pc.createDataChannel('chat');
      dataChannelRef.current = channel;

      channel.onopen = () => {
        setConnected(true);
        toast.success('Connected to mesh!');
      };

      channel.onmessage = (event) => {
        setMessages(prev => [...prev, event.data]);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
        }
      };

      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ type: 'offer', offer }));
      });

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } else if (data.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: 'answer', answer }));
        } else if (data.type === 'candidate') {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      };
    };
  }, [token]);

  useEffect(() => {
    return () => {
      pcRef.current?.close();
      wsRef.current?.close();
    };
  }, []);

  const sendMessage = () => {
    if (dataChannelRef.current?.readyState === 'open' && input.trim()) {
      dataChannelRef.current.send(input);
      setMessages(prev => [...prev, `Me: ${input}`]);
      setInput('');
    }
  };

  if (!started) {
    return (
      <div className="max-w-md mx-auto p-4 text-center">
        <h2 className="text-2xl font-bold gradient-text mb-4 flex items-center justify-center gap-2">
          <MessageCircle /> Mesh Chat
        </h2>
        <p className="text-gray-500 mb-6">Peer-to-peer chat that works offline!</p>
        <button onClick={connect} className="btn-primary text-lg px-8 py-3">
          🚀 Join Mesh Chat
        </button>
        <p className="text-xs text-gray-400 mt-3">No internet? No problem. Chat directly with nearby users.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-2xl font-bold gradient-text mb-4">Mesh Chat</h2>
      <p className="text-sm text-gray-500 mb-2">
        Peer‑to‑peer chat over Wi‑Fi (no internet needed).
      </p>
      {!connected ? (
        <p className="text-center py-4">Connecting to mesh...</p>
      ) : (
        <div className="h-60 bg-gray-100 rounded-2xl p-3 overflow-y-auto mb-3">
          {messages.map((msg, i) => (
            <p key={i} className="text-sm">{msg}</p>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          className="input-field flex-1"
          disabled={!connected}
        />
        <button onClick={sendMessage} disabled={!connected} className="btn-primary">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}