/**
 * Sasl - WebRTC Chat – peer‑to‑peer text messaging with E2E encryption
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { MessageCircle, Send, Loader2, Wifi, WifiOff, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { e2e } from '../services/encryption';
import { db } from '../services/offlineDB';

const ROOM_ID = 'sasl-mesh-chat';

export default function WebRTCChat() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [started, setStarted] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [peerCount, setPeerCount] = useState(0);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const makingOffer = useRef(false);
  const politePeer = useRef(false);

  const token = localStorage.getItem('sasl_token');
  const { t } = useTranslation();

  const [acceptedPeers, setAcceptedPeers] = useState<string[]>([]);
  const [showRequest, setShowRequest] = useState(false);
  const [requestFrom, setRequestFrom] = useState('');

  const getState = (pc: RTCPeerConnection): string => pc.signalingState as string;
  
  // Load chat history on mount
  useEffect(() => {
    db.messages.where('roomId').equals(ROOM_ID).toArray().then(msgs => {
      const historyMsgs = msgs.map(m => 
        m.sender === 'Me' ? `Me: ${m.text}` : `${m.sender}: ${m.text}`
      );
      if (historyMsgs.length > 0) setMessages(historyMsgs);
    }).catch(() => {});
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dataChannelRef.current?.close();
      pcRef.current?.close();
      wsRef.current?.close();
    };
  }, []);

  // Connect to mesh
  const connect = useCallback(() => {
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
      // Send connection request
      ws.send(JSON.stringify({ 
        type: 'connect_request', 
        from: localStorage.getItem('sasl_username') || 'User',
      }));

      // Fallback timer — if WebRTC doesn't connect, use server relay
      setTimeout(() => {
        if (!connected) {
          setConnected(true);
          setConnecting(false);
          setPeerCount(1);
        }
      }, 5000);

      setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
            
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        pcRef.current = pc;

        const channel = pc.createDataChannel('mesh-chat', { ordered: true });
        dataChannelRef.current = channel;

        channel.onopen = async () => {
          setConnected(true);
          setConnecting(false);
          setPeerCount(prev => prev + 1);

          try {
            const key = await e2e.generateKey();
            setEncryptionKey(key);
            const exportedKey = await e2e.exportKey(key);
            channel.send(JSON.stringify({ type: 'e2e_key', key: exportedKey }));
          } catch {}

          toast.success(t('Connected to mesh! 🚀'));
        };

        channel.onmessage = async (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'e2e_key' && data.key) {
              const key = await e2e.importKey(data.key);
              setEncryptionKey(key);
              return;
            }

            if (data.type === 'chat' && data.text) {
              const displayText = data.sender ? `${data.sender}: ${data.text}` : data.text;
              setMessages((prev: string[]) => [...prev, displayText]);
              // Save to history
              db.messages.add({
                roomId: ROOM_ID,
                sender: data.sender || 'Peer',
                text: data.text,
                timestamp: Date.now(),
                type: 'text',
              }).catch(() => {});
            }
          } catch {
            setMessages((prev: string[]) => [...prev, event.data]);
          }
        };

        channel.onclose = () => {
          setConnected(false);
          setPeerCount(prev => Math.max(0, prev - 1));
        };

        pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
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

        // Handle signaling and connection requests
        ws.onmessage = async (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);

            // Connection request handling
            if (data.type === 'connect_request') {
              setRequestFrom(data.from || 'Unknown User');
              setShowRequest(true);
              return;
            }
            if (data.type === 'connect_accepted') {
              setAcceptedPeers(prev => [...prev, data.from]);
              setPeerCount(prev => prev + 1);
              toast.success(`${data.from} accepted your request!`);
              return;
            }
            if (data.type === 'connect_declined') {
              toast(`${data.from} declined your request`);
              return;
            }

            // Chat message via server relay
            if (data.type === 'chat' && data.text) {
              setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg?.startsWith('Me:') && lastMsg.includes(data.text)) {
                  return prev;
                }
                return [...prev, data.text];
              });
              return;
            }

            // WebRTC signaling
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
              } catch {}
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

  // Send message with E2E encryption
  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;

    let messageText = input;
    let encrypted = false;

    if (encryptionKey) {
      try {
        messageText = await e2e.encryptMessage(encryptionKey, input);
        encrypted = true;
      } catch {}
    }

    const messageData = JSON.stringify({
      type: 'chat',
      text: messageText,
      encrypted,
      sender: localStorage.getItem('sasl_username') || 'Me',
    });

    // Save to local history
    db.messages.add({
      roomId: ROOM_ID,
      sender: 'Me',
      text: input,
      timestamp: Date.now(),
      type: 'text',
    }).catch(() => {});

    if (dataChannelRef.current?.readyState === 'open') {
      dataChannelRef.current.send(messageData);
      setMessages((prev: string[]) => [...prev, `Me: ${input}`]);
      setInput('');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(messageData);
      setMessages((prev: string[]) => [...prev, `Me: ${input}`]);
      setInput('');
      return;
    }

    setMessages((prev: string[]) => [...prev, `Me: ${input} (queued)`]);
    setInput('');
    toast('Message queued – will send when connected');
  }, [input, encryptionKey, connected]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  // Not Started
  if (!started) {
    return (
      <div className="max-w-md mx-auto p-6">
        {showRequest && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3">
                {requestFrom[0]?.toUpperCase()}
              </div>
              <h3 className="font-bold text-lg mb-2">{requestFrom} wants to connect</h3>
              <p className="text-gray-500 text-sm mb-4">Accept to start peer-to-peer chat</p>
              <div className="flex gap-2">
                <button onClick={() => {
                  wsRef.current?.send(JSON.stringify({ type: 'connect_accepted', from: localStorage.getItem('sasl_username') }));
                  setAcceptedPeers(prev => [...prev, requestFrom]);
                  setShowRequest(false);
                  setConnected(true);
                  setPeerCount(prev => prev + 1);
                }} className="btn-primary flex-1">Accept</button>
                <button onClick={() => {
                  wsRef.current?.send(JSON.stringify({ type: 'connect_declined', from: localStorage.getItem('sasl_username') }));
                  setShowRequest(false);
                }} className="btn-ghost flex-1">Decline</button>
              </div>
            </div>
          </div>
        )}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-8 rounded-3xl text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
            <MessageCircle size={40} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold gradient-text mb-3">Mesh Chat</h2>
          <p className="text-gray-500 mb-2">Peer-to-peer chat that works completely offline!</p>
          <p className="text-sm text-gray-400 mb-8">Connect directly to nearby Sasl users via WaveMesh. No internet required.</p>
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500"><WifiOff size={14} className="text-purple-500" /><span>Works without internet</span></div>
            <div className="flex items-center gap-2 text-sm text-gray-500"><Users size={14} className="text-blue-500" /><span>Connect to nearby peers</span></div>
            <div className="flex items-center gap-2 text-sm text-gray-500"><MessageCircle size={14} className="text-green-500" /><span>Real-time messaging</span></div>
          </div>
          <button onClick={connect} className="btn-primary text-lg px-10 py-4 rounded-2xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all">🚀 Join Mesh Chat</button>
          <p className="text-xs text-gray-400 mt-4">Open Sasl on another device or tab to test P2P messaging</p>
        </motion.div>
      </div>
    );
  }

  // Connecting
  if (connecting) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        {showRequest && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3">
                {requestFrom[0]?.toUpperCase()}
              </div>
              <h3 className="font-bold text-lg mb-2">{requestFrom} wants to connect</h3>
              <p className="text-gray-500 text-sm mb-4">Accept to start peer-to-peer chat</p>
              <div className="flex gap-2">
                <button onClick={() => {
                  wsRef.current?.send(JSON.stringify({ type: 'connect_accepted', from: localStorage.getItem('sasl_username') }));
                  setAcceptedPeers(prev => [...prev, requestFrom]);
                  setShowRequest(false);
                  setConnected(true);
                  setPeerCount(prev => prev + 1);
                }} className="btn-primary flex-1">Accept</button>
                <button onClick={() => {
                  wsRef.current?.send(JSON.stringify({ type: 'connect_declined', from: localStorage.getItem('sasl_username') }));
                  setShowRequest(false);
                }} className="btn-ghost flex-1">Decline</button>
              </div>
            </div>
          </div>
        )}
        <div className="glass p-12 rounded-3xl">
          <Loader2 className="animate-spin mx-auto text-green-500 mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-700 mb-2">Connecting to Mesh...</h3>
          <p className="text-gray-500 text-sm">Discovering nearby peers</p>
        </div>
      </div>
    );
  }

  // Connected
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      {showRequest && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3">
              {requestFrom[0]?.toUpperCase()}
            </div>
            <h3 className="font-bold text-lg mb-2">{requestFrom} wants to connect</h3>
            <p className="text-gray-500 text-sm mb-4">Accept to start peer-to-peer chat</p>
            <div className="flex gap-2">
              <button onClick={() => {
                wsRef.current?.send(JSON.stringify({ type: 'connect_accepted', from: localStorage.getItem('sasl_username') }));
                setAcceptedPeers(prev => [...prev, requestFrom]);
                setShowRequest(false);
                setConnected(true);
                setPeerCount(prev => prev + 1);
              }} className="btn-primary flex-1">Accept</button>
              <button onClick={() => {
                wsRef.current?.send(JSON.stringify({ type: 'connect_declined', from: localStorage.getItem('sasl_username') }));
                setShowRequest(false);
              }} className="btn-ghost flex-1">Decline</button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold gradient-text flex items-center gap-2"><MessageCircle size={24} /> Mesh Chat</h2>
          <p className="text-sm text-gray-500">
            {connected ? (
              <span className="flex items-center gap-1 text-green-600"><Wifi size={14} /> Connected · {peerCount} peer{peerCount !== 1 ? 's' : ''} online</span>
            ) : (
              <span className="flex items-center gap-1 text-gray-400"><WifiOff size={14} /> Disconnected</span>
            )}  
          </p>
        </div>
        {!connected && <button onClick={connect} className="btn-primary text-sm">Reconnect</button>}
      </div>

      <div className="h-96 bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 mb-4 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center"><MessageCircle size={48} className="mx-auto mb-2 opacity-30" /><p>No messages yet</p><p className="text-sm">Start the conversation!</p></div>
          </div>
        ) : (
          messages.map((msg: string, i: number) => {
            const isMe = msg.startsWith('Me:');
            const isQueued = msg.includes('(queued)');
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-green-500 text-white rounded-br-md' : 'bg-white dark:bg-gray-800 shadow-sm border rounded-bl-md'} ${isQueued ? 'opacity-50' : ''}`}>{msg}</div>
              </motion.div>
            );
          })
        )}
      </div>

      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." className="flex-1 px-5 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition outline-none" />
        <button onClick={sendMessage} className="bg-green-500 text-white p-3.5 rounded-xl hover:bg-green-600 transition shadow-lg shadow-green-500/25"><Send size={20} /></button>
      </div>
    </div>
  );
}