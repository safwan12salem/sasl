import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Zap, Camera, WifiOff, Shield, Send, LogOut, Copy, Menu, X, ArrowLeft, MessageCircle, Link, Smile, Radio, Bluetooth } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { waveMeshCore } from '../services/WaveMeshCore';
import { DirectPeer } from '../services/DirectP2P';
import { directP2P } from '../services/DirectP2P';
import { echoRelay } from '../services/EchoRelay';
import { useTranslation } from 'react-i18next';

interface ChatMessage {
  id: string;
  from: string;
  text: string;
  timestamp: number;
  isMe: boolean;
}

interface ChatRoom {
  id: string;
  name: string;
  lastMessage: string;
  unread: number;
}

const EMOJIS = ['😀','😂','🥰','😍','🤩','😎','🔥','❤️','💔','🎉','✨','💯','🙏','👋','🚀'];

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes: Record<string, string> = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
  const colors = ['from-green-400 to-emerald-500', 'from-blue-400 to-indigo-500', 'from-purple-400 to-pink-500'];
  const colorIndex = name.charCodeAt(0) % colors.length;
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white font-bold`}>
      {name[0]?.toUpperCase() || '?'}
    </div>
  );
}

export default function WaveMesh() {
  const { user } = useAuth();
  const myUsername = user?.username || 'Me';
  const { t } = useTranslation();

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [tab, setTab] = useState<'rooms' | 'discover' | 'connect'>('rooms');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [pasteInput, setPasteInput] = useState('');
  const [meshStatus, setMeshStatus] = useState('Initializing...');
  const [showEmoji, setShowEmoji] = useState(false);
  const [peers, setPeers] = useState<DirectPeer[]>([]);
  const [relayStats, setRelayStats] = useState(echoRelay.getStats());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    waveMeshCore.start(myUsername, null);

    waveMeshCore.setOnPeerDiscovered((peer: any) => {
      setPeers(prev => {
        if (prev.find(p => p.id === peer.id)) return prev;
        return [...prev, peer];
      });
    });

    waveMeshCore.setOnPeerConnected((data: any) => {
      const room: ChatRoom = {
        id: data.peerId,
        name: data.username || 'Peer',
        lastMessage: 'Connected via Direct P2P',
        unread: 0,
      };
      setRooms(prev => {
        const exists = prev.find(r => r.id === room.id);
        if (exists) return prev.map(r => r.id === room.id ? { ...r, name: room.name } : r);
        return [room, ...prev];
      });
      setActiveRoom(room);
      setShowSidebar(false);
      toast.success(`🔗 Connected with ${data.username || 'Peer'}!`);
    });

    waveMeshCore.setOnMessageReceived((msg: any) => {
      setMessages(prev => [...prev, {
        id: msg.id,
        from: msg.from,
        text: msg.text,
        timestamp: msg.timestamp,
        isMe: msg.from === myUsername,
      }]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    waveMeshCore.setOnRoomCreated((data: any) => {
      const room: ChatRoom = {
        id: data.peerId,
        name: data.username || 'Peer',
        lastMessage: 'Room created',
        unread: 0,
      };
      setRooms(prev => {
        const exists = prev.find(r => r.id === room.id);
        if (exists) return prev.map(r => r.id === room.id ? { ...r, name: room.name } : r);
        return [room, ...prev];
      });
      setActiveRoom(room);
      setShowSidebar(false);
    });

    const interval = setInterval(() => {
      setMeshStatus(waveMeshCore.getStatus());
      setPeers(directP2P.getPeers());
      setRelayStats(echoRelay.getStats());
    }, 2000);

    return () => { clearInterval(interval); waveMeshCore.stop(); };
  }, []);

  const generateQRCode = () => {
    setShowQRModal(true);
    setQrCode(waveMeshCore.generateConnectionCode());
  };

  const handlePasteCode = () => {
    if (!pasteInput.trim()) return toast.error('Enter a code');
    const result = waveMeshCore.processConnectionCode(pasteInput.trim());
    if (result) {
      setPasteInput('');
      setShowQRModal(false);
      toast.success(`🔗 Connected with @${result.username}!`);
    } else {
      toast.error('Invalid code');
    }
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    waveMeshCore.sendDirectMessage(input);
    setInput('');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const leaveRoom = (roomId: string) => {
    setRooms(prev => prev.filter(r => r.id !== roomId));
    if (activeRoom?.id === roomId) {
      setActiveRoom(null);
      setMessages([]);
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-50 via-white to-green-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      
      <AnimatePresence>
        {(showSidebar || window.innerWidth >= 1024) && (
          <motion.div initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
            className="w-[85vw] max-w-[320px] md:w-80 lg:w-96 border-r border-gray-200/50 dark:border-gray-800/50 flex flex-col bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl fixed md:relative z-30 h-full shadow-2xl md:shadow-none">
            
            <div className="p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
                  <Radio size={24} className="text-green-500" />WaveMesh 3.0
                </h2>
                <button onClick={() => setShowSidebar(false)} className="md:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  {meshStatus}
                </p>
                <p className="text-[10px] text-gray-400">
                  {peers.length} peers · {relayStats.pendingDelivery} pending relay
                </p>
              </div>
            </div>

            <div className="flex mx-4 mt-3 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl p-1">
              {[
                { key: 'rooms' as const, label: 'Chats', icon: MessageCircle },
                { key: 'discover' as const, label: 'Nearby', icon: Bluetooth },
                { key: 'connect' as const, label: 'Connect', icon: Link },
              ].map(tb => (
                <button key={tb.key} onClick={() => setTab(tb.key)}
                  className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 rounded-xl transition-all ${
                    tab === tb.key ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm' : 'text-gray-500'
                  }`}>
                  <tb.icon size={16} /> {tb.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto mt-2 px-3 pb-3">
              {tab === 'rooms' && (
                <div className="space-y-1">
                  {rooms.length === 0 ? (
                    <div className="text-center py-16 px-4 text-gray-400">
                      <MessageCircle size={36} className="mx-auto mb-2 opacity-50" />
                      <p className="font-semibold">No conversations</p>
                      <p className="text-sm">Nearby peers will appear automatically</p>
                    </div>
                  ) : (
                    rooms.map(room => (
                      <button key={room.id} onClick={() => { setActiveRoom(room); setShowSidebar(false); }}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all text-left ${
                          activeRoom?.id === room.id ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-2 border-transparent'
                        }`}>
                        <Avatar name={room.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">@{room.name}</p>
                          <p className="text-xs text-gray-500 truncate">{room.lastMessage}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
              
              {tab === 'discover' && (
                <div className="space-y-1">
                  {peers.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <Bluetooth size={36} className="mx-auto mb-3 text-gray-300" />
                      <p className="font-semibold text-gray-500">Scanning for nearby Sasl users...</p>
                      <p className="text-sm text-gray-400">BLE 5 Long Range · 2000m max</p>
                      <div className="flex justify-center gap-1 mt-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  ) : (
                    peers.map((peer, i) => (
                      <div key={peer.id || i} className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                        <Avatar name={peer.username} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">@{peer.username}</p>
                          <p className="text-xs text-green-500">
                            🟢 {peer.connectionType.toUpperCase()} · ~{peer.distance}m
                          </p>
                        </div>
                        <button onClick={() => waveMeshCore.sendRelayMessage(peer.id, '👋 Hello from WaveMesh!')}
                          className="p-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition">
                          <Send size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
              
              {tab === 'connect' && (
                <div className="space-y-4 p-2">
                  <div className="glass p-4 rounded-2xl text-center">
                    <p className="text-xs text-gray-500 mb-1">Your Sasl ID</p>
                    <code className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg break-all">
                      {waveMeshCore.getIdentity()?.id || 'Initializing...'}
                    </code>
                  </div>
                  
                  <button onClick={generateQRCode} className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg">
                    <QrCode size={20} /> Share Connection Code
                  </button>
                  
                  <div className="flex gap-2">
                    <input value={pasteInput} onChange={e => setPasteInput(e.target.value)}
                      placeholder="Paste connection code..."
                      className="flex-1 px-4 py-2.5 rounded-xl border text-sm dark:bg-gray-700 dark:border-gray-600" />
                    <button onClick={handlePasteCode} className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-semibold">
                      Connect
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 text-center">
              <p className="text-[10px] text-gray-400">🌊 Direct P2P + Echo Relay · 2000m Range</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col z-10 min-w-0">
        {!activeRoom ? (
          <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
            <div className="text-center max-w-md w-full">
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}
                className="w-20 h-20 sm:w-28 sm:h-28 mx-auto mb-4 sm:mb-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-green-500/30">
                <Radio size={36} className="text-white sm:size-14" />
              </motion.div>
              <h2 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2 sm:mb-3">Sasl WaveMesh 3.0</h2>
              <p className="text-gray-500 mb-1 sm:mb-2 text-sm sm:text-lg">
                <span className="font-semibold text-green-600">Direct P2P</span> up to 2000m · No internet needed
              </p>
              <p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-8 px-2">
                BLE 5 Long Range + WiFi Direct chain + Echo Relay mesh
              </p>
              
              <button onClick={() => setShowSidebar(true)} className="md:hidden mx-auto mb-3 sm:mb-4 p-2.5 sm:p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                <Menu size={20} className="sm:size-6" />
              </button>
              
              <div className="flex gap-2 sm:gap-3 justify-center flex-wrap px-2">
                <button onClick={() => { setTab('discover'); setShowSidebar(true); }}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-semibold shadow-lg text-xs sm:text-base">
                  🔍 Scan for Peers
                </button>
                <button onClick={generateQRCode}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-semibold shadow-lg flex items-center gap-2 text-xs sm:text-base">
                  <QrCode size={16} /> Share Code
                </button>
              </div>
              
              <div className="mt-6 sm:mt-8 flex items-center justify-center gap-3 sm:gap-6 text-[10px] sm:text-xs text-gray-400 flex-wrap">
                <span className="flex items-center gap-1"><WifiOff size={10} /> No Internet</span>
                <span className="flex items-center gap-1"><Shield size={10} /> Encrypted</span>
                <span className="flex items-center gap-1"><Radio size={10} /> 2000m Range</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <button onClick={() => { setActiveRoom(null); setShowSidebar(true); }} className="md:hidden p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl flex-shrink-0">
                  <ArrowLeft size={18} />
                </button>
                <Avatar name={activeRoom.name} size="sm" />
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm truncate">@{activeRoom.name}</h3>
                  <p className="text-[10px] sm:text-xs text-green-600">Direct P2P Connected</p>
                </div>
              </div>
              <button onClick={() => leaveRoom(activeRoom.id)} className="p-1.5 sm:p-2.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition text-red-400 flex-shrink-0">
                <LogOut size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 min-h-0">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 py-16 sm:py-20">
                  <MessageCircle size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Connected via Direct P2P</p>
                  <p className="text-xs">Say hello! 👋</p>
                </div>
              )}
              {messages.map(msg => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex items-end gap-1.5 sm:gap-2 ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                  {!msg.isMe && <Avatar name={msg.from} size="sm" />}
                  <div className={`max-w-[80%] sm:max-w-[75%] px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm ${
                    msg.isMe ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-br-lg shadow-md' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-lg shadow-sm border'
                  }`}>
                    {!msg.isMe && <p className="text-[9px] sm:text-[10px] font-semibold text-gray-500 mb-0.5">@{msg.from}</p>}
                    <span className="break-words">{msg.text}</span>
                    <div className="flex items-center gap-1 mt-1 justify-end">
                      <span className="text-[9px] sm:text-[10px] opacity-60">{formatTime(msg.timestamp)}</span>
                    </div>
                  </div>
                  {msg.isMe && <Avatar name={myUsername} size="sm" />}
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-2 sm:p-4 border-t border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl flex-shrink-0">
              <div className="flex items-end gap-1.5 sm:gap-2">
                <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 sm:p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex-shrink-0">
                  <Smile size={18} />
                </button>
                <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } }}
                  placeholder="Message via Direct P2P..."
                  className="flex-1 min-w-0 px-3 sm:px-5 py-2 sm:py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-green-400/50 transition-all" />
                <button onClick={sendMessage} disabled={!input.trim()}
                  className="p-2 sm:p-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl disabled:opacity-40 shadow-lg flex-shrink-0">
                  <Send size={18} />
                </button>
              </div>
              {showEmoji && (
                <div className="absolute bottom-16 sm:bottom-20 left-2 sm:left-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border p-2 sm:p-3 z-50 max-w-[90vw]">
                  <div className="grid grid-cols-7 sm:grid-cols-8 gap-1 sm:gap-1.5">
                    {EMOJIS.map(emoji => (
                      <button key={emoji} onClick={() => { setInput(prev => prev + emoji); setShowEmoji(false); inputRef.current?.focus(); }}
                        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm sm:text-lg transition">{emoji}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showQRModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowQRModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-xl text-center mb-4">📡 Sasl Connect</h3>
              
              {qrCode && (
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-4 rounded-2xl shadow-inner">
                    <QRCodeSVG value={qrCode} size={200} level="M" />
                  </div>
                </div>
              )}
              
              {qrCode && (
                <div className="flex items-center gap-2 mb-4">
                  <code className="flex-1 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-xl text-xs break-all select-all">{qrCode.substring(0, 50)}...</code>
                  <button onClick={() => { navigator.clipboard.writeText(qrCode); toast.success('Copied!'); }}
                    className="p-2 bg-purple-500 text-white rounded-xl"><Copy size={14} /></button>
                </div>
              )}
              
              <div className="flex gap-2 mb-4">
                <input value={pasteInput} onChange={e => setPasteInput(e.target.value)}
                  placeholder="Paste connection code..."
                  className="flex-1 px-4 py-2.5 rounded-xl border text-sm dark:bg-gray-700 dark:border-gray-600" />
                <button onClick={handlePasteCode}
                  className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-semibold">
                  Connect
                </button>
              </div>
              
              <button onClick={() => setShowQRModal(false)}
                className="w-full py-2.5 bg-gray-200 dark:bg-gray-700 rounded-xl font-semibold text-sm">Close</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}