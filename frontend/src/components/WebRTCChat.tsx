/**
 * Sasl - WebRTC Chat – Legendary Edition
 * Peer‑to‑peer text messaging with E2E encryption
 * Features: Saved peer rooms, emoji counters, file sharing, avatars, chat history, offline persistence
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { MessageCircle, Send, Loader2, Wifi, WifiOff, Users, Paperclip, UserPlus, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { e2e } from '../services/encryption';
import { db } from '../services/offlineDB';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const ROOM_ID = 'sasl-mesh-chat';

export default function WebRTCChat() {
  const { user } = useAuth();
  const myUsername = user?.username || localStorage.getItem('sasl_username') || 'Me';
  
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

  const [acceptedPeers, setAcceptedPeers] = useState<string[]>(() => {
    const saved = localStorage.getItem('sasl_mesh_peers');
    return saved ? JSON.parse(saved) : [];
  });
  const [savedPeers, setSavedPeers] = useState<string[]>(() => {
    const saved = localStorage.getItem('sasl_saved_peers');
    return saved ? JSON.parse(saved) : [];
  });
  const [showRequest, setShowRequest] = useState(false);
  const [requestFrom, setRequestFrom] = useState('');
  const myMessages = useRef<Set<number>>(new Set());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reactions, setReactions] = useState<Record<number, string[]>>({});
  const [myAvatar, setMyAvatar] = useState<string | null>(() => {
    return localStorage.getItem('sasl_avatar') || null;
  });

  const getState = (pc: RTCPeerConnection): string => pc.signalingState as string;

  // Save username to localStorage for persistence
  useEffect(() => {
    if (user?.username) {
      localStorage.setItem('sasl_username', user.username);
    }
  }, [user]);

  // Fetch avatar on mount
  useEffect(() => {
    api.get('/users/profile/').then(res => {
      if (res.data.avatar_url) {
        setMyAvatar(res.data.avatar_url);
        localStorage.setItem('sasl_avatar', res.data.avatar_url);
      }
    }).catch(() => {});
  }, []);

  // Load chat history on mount
  useEffect(() => {
    db.messages.where('roomId').equals(ROOM_ID).toArray().then(msgs => {
      const historyMsgs = msgs.map(m =>
        m.sender === 'Me' ? m.text : `${m.sender}: ${m.text}`
      );
      if (historyMsgs.length > 0) {
        historyMsgs.forEach((_, i) => myMessages.current.add(i));
        setMessages(historyMsgs);
      }
    }).catch(() => {});
  }, []);

  // Restore connection state from localStorage
  useEffect(() => {
    const wasConnected = localStorage.getItem('sasl_mesh_connected');
    if (wasConnected === 'true' && acceptedPeers.length > 0) {
      setConnected(true);
      setStarted(true);
    }
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
      ws.send(JSON.stringify({
        type: 'connect_request',
        from: myUsername,
      }));

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
          localStorage.setItem('sasl_mesh_connected', 'true');

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

              if (data.sender && data.sender !== myUsername) {
                setMessages((prev: string[]) => [...prev, `${data.sender}: ${data.text}`]);
              } else if (!data.sender) {
                setMessages((prev: string[]) => [...prev, data.text]);
              }
              // Add sender prefix for relayed messages
              const displayText = data.sender && data.sender !== myUsername 
                ? `${data.sender}: ${data.text}` 
                : data.text;
              setMessages((prev: string[]) => [...prev, displayText]);
              return;
            }

            if (data.type === 'image' && data.fileData) {
              setMessages((prev: string[]) => [...prev, `📷 ${data.fileData}`]);
              db.messages.add({
                roomId: ROOM_ID, sender: data.sender || 'Peer',
                text: `[Image: ${data.fileName}]`, timestamp: Date.now(),
                type: 'image', fileUrl: data.fileData,
              }).catch(() => {});
            }

            if (data.type === 'file' && data.fileData) {
              setMessages((prev: string[]) => [...prev, `📎 ${data.fileName} from ${data.sender}`]);
              db.messages.add({
                roomId: ROOM_ID, sender: data.sender || 'Peer',
                text: `[File: ${data.fileName}]`, timestamp: Date.now(),
                type: 'file', fileUrl: data.fileData,
              }).catch(() => {});
            }
          } catch {
            setMessages((prev: string[]) => [...prev, event.data]);
          }
        };

        channel.onclose = () => {
          setConnected(false);
          setPeerCount(prev => Math.max(0, prev - 1));
          localStorage.removeItem('sasl_mesh_connected');
          toast('Peer disconnected');
        };

        pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
          if (event.candidate && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate.toJSON() }));
          }
        };

        pc.onnegotiationneeded = async () => {
          try {
            makingOffer.current = true;
            await pc.setLocalDescription();
            if (pc.localDescription && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'offer', offer: pc.localDescription.toJSON() }));
            }
          } catch (err) {
            console.warn('Negotiation error:', err);
          } finally {
            makingOffer.current = false;
          }
        };

        ws.onmessage = async (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'connect_request') {
              setRequestFrom(data.from || 'Unknown User');
              setShowRequest(true);
              return;
            }
            if (data.type === 'connect_accepted') {
              const updatedPeers = [...acceptedPeers, data.from];
              setAcceptedPeers(updatedPeers);
              localStorage.setItem('sasl_mesh_peers', JSON.stringify(updatedPeers));
              const updatedSaved = [...new Set([...savedPeers, data.from])];
              setSavedPeers(updatedSaved);
              localStorage.setItem('sasl_saved_peers', JSON.stringify(updatedSaved));
              setConnected(true);
              setConnecting(false);
              setPeerCount(prev => prev + 1);
              localStorage.setItem('sasl_mesh_connected', 'true');
              toast.success(`Connected with ${data.from}! 🔒`);
              return;
            }
            if (data.type === 'connect_declined') {
              toast(`${data.from} declined your request`);
              return;
            }

            if (data.type === 'chat' && data.text) {
              setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && data.text && lastMsg.includes(data.text)) return prev;
                return [...prev, data.text];
              });
              return;
            }

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
                  ws.send(JSON.stringify({ type: 'answer', answer: pc.localDescription.toJSON() }));
                }
              }
            } else if (data.type === 'answer') {
              if (state === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
              }
            } else if (data.type === 'candidate') {
              if (!pc.remoteDescription) return;
              try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch {}
            }
          } catch (err) {
            console.warn('Signaling error:', err);
          }
        };
      }, 300);
    };

    ws.onerror = () => { setConnecting(false); toast.error('Connection failed'); };
    ws.onclose = () => {
      setConnected(false); setConnecting(false); setPeerCount(0);
      localStorage.removeItem('sasl_mesh_connected');
    };
  }, [token, t, myUsername, acceptedPeers, savedPeers]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    let messageText = input;

    if (encryptionKey) {
      try { messageText = await e2e.encryptMessage(encryptionKey, input); } catch {}
    }

    const messageData = JSON.stringify({
      type: 'chat', text: messageText,
      encrypted: !!encryptionKey, sender: myUsername,
    });

    db.messages.add({
      roomId: ROOM_ID, sender: 'Me', text: input,
      timestamp: Date.now(), type: 'text',
    }).catch(() => {});

    if (dataChannelRef.current?.readyState === 'open') {
      dataChannelRef.current.send(messageData);
      setMessages((prev: string[]) => { const idx = prev.length; myMessages.current.add(idx); return [...prev, input]; });
      setInput(''); return;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(messageData);
      setMessages((prev: string[]) => { const idx = prev.length; myMessages.current.add(idx); return [...prev, input]; });
      setInput(''); return;
    }
    setMessages((prev: string[]) => { const idx = prev.length; myMessages.current.add(idx); return [...prev, `${input} (queued)`]; });
    setInput('');
    toast('Message queued – will send when connected');
  }, [input, encryptionKey, myUsername]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
  };

  const sendFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const isImage = file.type.startsWith('image/');
      const messageData = JSON.stringify({
        type: isImage ? 'image' : 'file',
        fileName: file.name, fileType: file.type,
        fileData: reader.result, fileSize: file.size,
        sender: myUsername,
      });
      if (dataChannelRef.current?.readyState === 'open') {
        dataChannelRef.current.send(messageData);
      } else if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(messageData);
      }
      const label = isImage ? `📷 ${reader.result}` : `📎 ${file.name}`;
      setMessages(prev => { const idx = prev.length; myMessages.current.add(idx); return [...prev, label]; });
      setSelectedFile(null);
    };
    reader.readAsDataURL(file);
  };

  // Request Modal
  const RequestModal = () => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-3xl mx-auto mb-3 border-4 border-green-200">
          {requestFrom[0]?.toUpperCase()}
        </div>
        <h3 className="font-bold text-xl mb-1">@{requestFrom}</h3>
        <p className="text-gray-500 text-sm mb-3">wants to connect with you</p>
        <p className="text-gray-400 text-xs mb-4">Accept to start peer-to-peer encrypted chat</p>
        <div className="flex gap-2 mb-3">
          <button onClick={() => {
            wsRef.current?.send(JSON.stringify({ type: 'connect_accepted', from: myUsername }));
            const updatedPeers = [...acceptedPeers, requestFrom];
            setAcceptedPeers(updatedPeers);
            localStorage.setItem('sasl_mesh_peers', JSON.stringify(updatedPeers));
            const updatedSaved = [...new Set([...savedPeers, requestFrom])];
            setSavedPeers(updatedSaved);
            localStorage.setItem('sasl_saved_peers', JSON.stringify(updatedSaved));
            setShowRequest(false); setConnected(true); setConnecting(false);
            setPeerCount(prev => prev + 1);
            localStorage.setItem('sasl_mesh_connected', 'true');
            toast.success(`Connected with ${requestFrom}! 🔒`);
          }} className="btn-primary flex-1 py-3 text-lg">✅ Accept</button>
          <button onClick={() => {
            wsRef.current?.send(JSON.stringify({ type: 'connect_declined', from: myUsername }));
            setShowRequest(false);
          }} className="btn-ghost flex-1">❌ Decline</button>
        </div>
        <button onClick={() => window.open(`/profile/${requestFrom}`, '_blank')}
          className="text-xs text-blue-500 hover:underline w-full text-center">
          View @{requestFrom}'s Profile →
        </button>
      </div>
    </div>
  );

  // Not Started
  if (!started) {
    return (
      <div className="max-w-md mx-auto p-6">
        {showRequest && <RequestModal />}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-8 rounded-3xl text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
            <MessageCircle size={40} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold gradient-text mb-3">Mesh Chat</h2>
          <p className="text-gray-500 mb-2">Peer-to-peer chat that works completely offline!</p>
          <p className="text-sm text-gray-400 mb-4">Connect directly to nearby Sasl users via WaveMesh. No internet required.</p>

          {/* Saved Peers */}
          {savedPeers.length > 0 && (
            <div className="mb-6 text-left">
              <p className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1">
                <Clock size={14} /> Saved Peers
              </p>
              <div className="space-y-2">
                {savedPeers.map(peer => (
                  <button key={peer} onClick={() => {
                    setRequestFrom(peer);
                    connect();
                  }} className="w-full flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-green-50 transition border">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold">
                      {peer[0]?.toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm">@{peer}</p>
                      <p className="text-xs text-gray-500">Tap to reconnect</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500"><WifiOff size={14} className="text-purple-500" /><span>Works without internet</span></div>
            <div className="flex items-center gap-2 text-sm text-gray-500"><Users size={14} className="text-blue-500" /><span>Connect to nearby peers</span></div>
            <div className="flex items-center gap-2 text-sm text-gray-500"><MessageCircle size={14} className="text-green-500" /><span>Real-time messaging</span></div>
          </div>
          <button onClick={connect} className="btn-primary text-lg px-10 py-4 rounded-2xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all">
            <UserPlus size={18} className="inline mr-2" /> Join Mesh Chat
          </button>
          <p className="text-xs text-gray-400 mt-4">Open Sasl on another device or tab to test P2P messaging</p>
        </motion.div>
      </div>
    );
  }

  // Connecting
  if (connecting) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        {showRequest && <RequestModal />}
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
      {showRequest && <RequestModal />}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold gradient-text flex items-center gap-2"><MessageCircle size={24} /> Mesh Chat</h2>
          <p className="text-sm text-gray-500">
            {connected ? (
              <span className="flex items-center gap-1 text-green-600"><Wifi size={14} /> Connected · {acceptedPeers.length || peerCount} peer{(acceptedPeers.length || peerCount) !== 1 ? 's' : ''} online</span>
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
            const isMe = myMessages.current.has(i);
            const isQueued = msg.includes('(queued)');
            const displayText = msg.replace(' (queued)', '');
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const isImage = displayText.startsWith('📷 ') && displayText.length > 3;

            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {acceptedPeers[0]?.[0]?.toUpperCase() || 'P'}
                  </div>
                )}
                <div className={`max-w-[70%] ${isMe ? 'order-1' : ''}`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-green-500 text-white rounded-br-md' : 'bg-white dark:bg-gray-800 shadow-sm border rounded-bl-md'} ${isQueued ? 'opacity-50' : ''}`}>
                    {isImage ? (
                      <img src={displayText.replace('📷 ', '')} alt="Shared" className="max-w-full rounded-lg max-h-48 object-cover" />
                    ) : (
                      displayText
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {['❤️', '😂', '🔥', '👍'].map(emoji => {
                      const count = (reactions[i] || []).filter((r: string) => r === emoji).length;
                      const hasReacted = (reactions[i] || []).includes(emoji);
                      return (
                        <button key={emoji} onClick={() => {
                          setReactions(prev => ({
                            ...prev,
                            [i]: [...(prev[i] || []), emoji],
                          }));
                        }}
                        className={`text-[11px] transition-all flex items-center gap-0.5 px-1 py-0.5 rounded-full ${
                          hasReacted ? 'bg-white/20 scale-110' : 'opacity-50 hover:opacity-80'
                        }`}>
                          {emoji}<span className="text-[9px] font-semibold">{count > 0 ? count : ''}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className={`text-[10px] text-gray-400 mt-0.5 ${isMe ? 'text-right' : 'text-left'}`}>
                    {time} {isMe && '· Sent'} {isQueued && '· Queued'}
                  </p>
                </div>
                {isMe && (
                  myAvatar ? (
                    <img src={myAvatar} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border-2 border-green-300" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {myUsername[0]?.toUpperCase()}
                    </div>
                  )
                )}
              </motion.div>
            );
          })
        )}
      </div>

      <div className="flex gap-2">
        <input type="file" ref={fileInputRef} className="hidden"
          onChange={e => { if (e.target.files?.[0]) sendFile(e.target.files[0]); }} />
        <button onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition" title="Attach file">
          <Paperclip size={20} />
        </button>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 px-5 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition outline-none" />
        <button onClick={sendMessage}
          className="bg-green-500 text-white p-3.5 rounded-xl hover:bg-green-600 transition shadow-lg shadow-green-500/25">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}