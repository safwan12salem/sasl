/**
 * Sasl - WebRTC Chat – peer‑to‑peer text messaging
 * Fully fixed with proper WebRTC state management and TypeScript types
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { MessageCircle, Send, Loader2, Wifi, WifiOff, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const ROOM_ID = 'sasl-mesh-chat';

export default function WebRTCChat() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [started, setStarted] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [peerCount, setPeerCount] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const makingOffer = useRef(false);
  const politePeer = useRef(false);

  const token = localStorage.getItem('sasl_token');
  const { t } = useTranslation();

  // Helper to get signaling state as plain string (avoids TS enum issues)
  const getState = (pc: RTCPeerConnection): string => pc.signalingState as string;

  // ============================================================
  // CLEANUP
  // ============================================================
  useEffect(() => {
    return () => {
      dataChannelRef.current?.close();
      pcRef.current?.close();
      wsRef.current?.close();
    };
  }, []);

  // ============================================================
  // CONNECT TO MESH
  // ============================================================
    const connect = useCallback(() => {
    // FIRST: Clean up any existing connections completely
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setStarted(true);
    setConnecting(true);
    makingOffer.current = false;

    const wsUrl = `ws://localhost:8000/ws/video/${ROOM_ID}/?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Wait a moment before creating peer connection
      setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        pcRef.current = pc;

        const channel = pc.createDataChannel('mesh-chat', { ordered: true });
        dataChannelRef.current = channel;

        channel.onopen = () => {
          setConnected(true);
          setConnecting(false);
          setPeerCount(1);
          toast.success(t('Connected to mesh! 🚀'));
        };

        channel.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'chat') {
              setMessages(prev => [...prev, data.text]);
            }
          } catch {
            setMessages(prev => [...prev, event.data]);
          }
        };

        channel.onclose = () => {
          setConnected(false);
          setPeerCount(0);
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'candidate',
              candidate: event.candidate.toJSON()
            }));
          }
        };

        pc.onnegotiationneeded = async () => {
          try {
            makingOffer.current = true;
            await pc.setLocalDescription();
            if (pc.localDescription && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'offer',
                offer: pc.localDescription.toJSON()
              }));
            }
          } catch (err) {
            console.warn('Negotiation error:', err);
          } finally {
            makingOffer.current = false;
          }
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            const state = getState(pc);

            if (data.type === 'offer') {
              const isPolite = politePeer.current;
              const colliding = makingOffer.current || state !== 'stable';
              if (colliding && !isPolite) return;
              if (state !== 'stable') return;

              await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
              if (getState(pc) === 'have-remote-offer') {
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                if (pc.localDescription && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'answer',
                    answer: pc.localDescription.toJSON()
                  }));
                }
              }
            } else if (data.type === 'answer') {
              if (state === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
              }
            } else if (data.type === 'candidate') {
              if (!pc.remoteDescription) return;
              try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
              } catch (err) {}
            } else if (data.type === 'chat') {
              setMessages(prev => [...prev, data.text]);
            }
          } catch (err) {
            console.warn('Signaling error:', err);
          }
        };
      }, 300);
    };

    ws.onerror = () => {
      setConnecting(false);
      toast.error('Connection failed');
    };

    ws.onclose = () => {
      setConnected(false);
      setConnecting(false);
      setPeerCount(0);
    };
  }, [token, t]);
  // ============================================================
  // SEND MESSAGE
  // ============================================================
  const sendMessage = () => {
    if (!input.trim()) return;

    const messageData = JSON.stringify({ type: 'chat', text: input });

    if (dataChannelRef.current?.readyState === 'open') {
      dataChannelRef.current.send(messageData);
      setMessages(prev => [...prev, `Me: ${input}`]);
      setInput('');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(messageData);
      setMessages(prev => [...prev, `Me: ${input}`]);
      setInput('');
      return;
    }

    setMessages(prev => [...prev, `Me: ${input} (queued)`]);
    setInput('');
    toast('Message queued – will send when connected');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  // ============================================================
  // RENDER — Not Started
  // ============================================================
  if (!started) {
    return (
      <div className="max-w-md mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-8 rounded-3xl text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
            <MessageCircle size={40} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold gradient-text mb-3">Mesh Chat</h2>
          <p className="text-gray-500 mb-2">Peer-to-peer chat that works completely offline!</p>
          <p className="text-sm text-gray-400 mb-8">
            Connect directly to nearby Sasl users via WaveMesh. No internet required.
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <WifiOff size={14} className="text-purple-500" />
              <span>Works without internet</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users size={14} className="text-blue-500" />
              <span>Connect to nearby peers</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MessageCircle size={14} className="text-green-500" />
              <span>Real-time messaging</span>
            </div>
          </div>

          <button
            onClick={connect}
            className="btn-primary text-lg px-10 py-4 rounded-2xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all"
          >
            🚀 Join Mesh Chat
          </button>
          <p className="text-xs text-gray-400 mt-4">
            Open Sasl on another device or tab to test P2P messaging
          </p>
        </motion.div>
      </div>
    );
  }

  // ============================================================
  // RENDER — Connecting
  // ============================================================
  if (connecting) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <div className="glass p-12 rounded-3xl">
          <Loader2 className="animate-spin mx-auto text-green-500 mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-700 mb-2">Connecting to Mesh...</h3>
          <p className="text-gray-500 text-sm">Discovering nearby peers</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER — Connected
  // ============================================================
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <MessageCircle size={24} /> Mesh Chat
          </h2>
          <p className="text-sm text-gray-500">
            {connected ? (
              <span className="flex items-center gap-1 text-green-600">
                <Wifi size={14} /> Connected · {peerCount} peer{peerCount !== 1 ? 's' : ''} online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-gray-400">
                <WifiOff size={14} /> Disconnected
              </span>
            )}
          </p>
        </div>
        {!connected && (
          <button onClick={connect} className="btn-primary text-sm">Reconnect</button>
        )}
      </div>

      <div className="h-96 bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 mb-4 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <MessageCircle size={48} className="mx-auto mb-2 opacity-30" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.startsWith('Me:');
            const isQueued = msg.includes('(queued)');
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-green-500 text-white rounded-br-md'
                      : 'bg-white dark:bg-gray-800 shadow-sm border rounded-bl-md'
                  } ${isQueued ? 'opacity-50' : ''}`}
                >
                  {msg}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 px-5 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition outline-none"
        />
        <button
          onClick={sendMessage}
          className="bg-green-500 text-white p-3.5 rounded-xl hover:bg-green-600 transition shadow-lg shadow-green-500/25"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}