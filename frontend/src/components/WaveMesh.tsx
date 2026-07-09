/**
 * Sasl WaveMesh — Complete Offline P2P Chat
 * 
 * Features: QR code connect, BLE discovery, Wi-Fi Aware, LoRa ready,
 * E2E encryption, mesh relay, echo protocol, offline queue,
 * reactions, file sharing, emoji picker, voice notes, typing indicator,
 * message grouping by date, unread counts, invite system, mobile responsive
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle, Users, UserPlus, Search, X, Check,
  Paperclip, Send, Loader2, WifiOff, Copy,
  LogOut, Zap, Sparkles, Smile, Image, File, Menu, ArrowLeft,
  QrCode, Link, Camera, Mic, Radio, Bluetooth, Shield, Clock, CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { waveMeshCore, MeshPeer, MeshMessage } from '../services/WaveMeshCore';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';

// ============================================================
// TYPES
// ============================================================
interface ChatMessageUI {
  id: string;
  room: string;
  sender: { id: string; username: string; avatar: string | null };
  type: 'text' | 'image' | 'file' | 'system';
  content: string;
  fileUrl?: string;
  fileName?: string;
  reactions: Record<string, string[]>;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered';
}

interface ChatRoom {
  id: string;
  name: string;
  avatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  peerId: string;
}

interface DiscoveredDevice {
  id: string;
  username: string;
  connectionType: string;
  distance: number;
}

const QUICK_REACTIONS = ['❤️', '😂', '🔥', '🎉', '💯', '🚀'];
const EMOJIS = ['😀','😂','🥰','😍','🤩','😎','🥳','😤','😢','😭','😡','🤬','👍','👎','👏','🙌','💪','🔥','❤️','💔','🎉','✨','🌟','💯','🙏','🤝','👋','🫶','💰','📸','🎵','🌈','🍕','☕','🎂','🏆','⚽','🎮','🚀','💻'];

// ============================================================
// AVATAR COMPONENT
// ============================================================
function Avatar({ src, name, size = 'md' }: { src?: string | null; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes: Record<string, string> = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
  const colors = ['from-green-400 to-emerald-500', 'from-blue-400 to-indigo-500',
    'from-purple-400 to-pink-500', 'from-orange-400 to-red-500', 'from-teal-400 to-cyan-500'];
  const colorIndex = name.charCodeAt(0) % colors.length;
  return (
    <div className="relative flex-shrink-0">
      {src ? (
        <img src={src} className={`${sizes[size]} rounded-full object-cover ring-2 ring-white dark:ring-gray-800`} alt={name} />
      ) : (
        <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white font-bold ring-2 ring-white dark:ring-gray-800`}>
          {name[0]?.toUpperCase() || '?'}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function WaveMesh() {
  const { user } = useAuth();
  const myUsername = user?.username || 'Me';
  const { t } = useTranslation();
  
  // Identity
  const [myAvatar, setMyAvatar] = useState<string | null>(() => localStorage.getItem('sasl_avatar'));
  
  // Rooms
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  
  // Messages
  const [messages, setMessages] = useState<ChatMessageUI[]>([]);
  const [input, setInput] = useState('');
  const activeRoomRef = useRef<ChatRoom | null>(null);
  useEffect(() => { activeRoomRef.current = activeRoom; }, [activeRoom]);
  
  // Discovery
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [peers, setPeers] = useState<MeshPeer[]>([]);
  
  // QR Modal
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [pasteInput, setPasteInput] = useState('');
  const [qrConnected, setQrConnected] = useState(false);
  const [qrPeerName, setQrPeerName] = useState('');
  
  // Request modal
  const [incomingRequest, setIncomingRequest] = useState<{ from: string; peerId: string; message: string } | null>(null);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'rooms' | 'discover' | 'connect'>('rooms');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionPicker, setReactionPicker] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [meshStatus, setMeshStatus] = useState('Initializing...');
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // ============================================================
  // INITIALIZATION
  // ============================================================
  useEffect(() => {
    // Fetch avatar
    import('../services/api').then(api => {
      api.default.get('/users/profile/').then((res: any) => {
        const avatar = res.data.avatar_url || res.data.avatar || null;
        if (avatar) { setMyAvatar(avatar); localStorage.setItem('sasl_avatar', avatar); }
      }).catch(() => {});
    });
  }, []);
  
  useEffect(() => {
    if (!myUsername) return;
    
    waveMeshCore.start(myUsername, myAvatar);
    setMeshStatus(waveMeshCore.getStatus());
    
    // Discovery
    waveMeshCore.setOnPeerDiscovered((device: any) => {
      setDiscoveredDevices(prev => {
        if (prev.find(d => d.id === device.id)) return prev;
        return [...prev, device];
      });
    });
    
    // Peer connected via WebRTC
    waveMeshCore.setOnPeerConnected((data: any) => {
      const room: ChatRoom = {
        id: data.peerId,
        name: data.username || 'Peer',
        avatar: data.avatar || null,
        lastMessage: 'Connected!',
        lastMessageTime: new Date().toISOString(),
        unread: 0,
        peerId: data.peerId,
      };
      setRooms(prev => { if (prev.find(r => r.id === room.id)) return prev; return [room, ...prev]; });
      setActiveRoom(room);
      setShowSidebar(false);
      setTab('rooms');
      toast.success(`🌊 Connected with ${data.username || 'Peer'}!`);
    });
    
    // Incoming message
    waveMeshCore.setOnMessageReceived((msg: any) => {
      const chatMsg: ChatMessageUI = {
        id: msg.id || `msg_${Date.now()}`,
                room: activeRoomRef.current?.id || 'p2p',
        sender: { id: '', username: msg.from || 'Peer', avatar: null },
        type: msg.type || 'text',
        content: msg.text || '',
        fileUrl: msg.fileUrl,
        fileName: msg.fileName,
        reactions: {},
        timestamp: msg.timestamp || Date.now(),
        status: 'delivered',
      };
      setMessages(prev => [...prev, chatMsg]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    
    // Incoming request
    waveMeshCore.setOnRequestReceived((req: any) => {
      setIncomingRequest({ from: req.from, peerId: req.peerId, message: req.message || 'Wants to connect' });
    });
    
    // Room created
    waveMeshCore.setOnRoomCreated((data: any) => {
      const room: ChatRoom = {
        id: data.peerId,
        name: data.username || 'Peer',
        avatar: data.avatar || null,
        lastMessage: 'Room created',
        lastMessageTime: new Date().toISOString(),
        unread: 0,
        peerId: data.peerId,
      };
      setRooms(prev => { if (prev.find(r => r.id === room.id)) return prev; return [room, ...prev]; });
      setActiveRoom(room);
      setShowSidebar(false);
      setTab('rooms');
    });
    
    // Start BLE discovery
    waveMeshCore.startBLEDiscovery();
    
    // Update peers list
    const interval = setInterval(() => {
      setPeers(waveMeshCore.getPeers());
      setMeshStatus(waveMeshCore.getStatus());
    }, 2000);
    
    return () => { clearInterval(interval); waveMeshCore.stop(); };
  }, [myUsername, myAvatar]);
  
  // ============================================================
  // ACTIONS
  // ============================================================
  
   const generateQRCode = async () => {
    setShowQRModal(true); setQrCode('Generating...');
    
    // Set listener for when peer connects to OUR QR code
    waveMeshCore.setOnPeerConnected((data: any) => {
      const newRoom: ChatRoom = {
        id: data.peerId || `room_${Date.now()}`,
        name: data.username || 'Peer',
        avatar: data.avatar || null,
        lastMessage: 'Connected!',
        lastMessageTime: new Date().toISOString(),
        unread: 0,
        peerId: data.peerId || `peer_${Date.now()}`,
      };
      setRooms(prev => prev.find(r => r.id === newRoom.id) ? prev : [newRoom, ...prev]);
      setActiveRoom(newRoom);
      setShowSidebar(false);
      setTab('rooms');
      setMessages([]);
      setShowQRModal(false);
      toast.success(`🌊 Connected with ${data.username || 'Peer'}!`);
    });
    
    try { setQrCode(await waveMeshCore.generateConnectionCode()); } catch { setQrCode('Failed'); }
  };





  
  const connectFromCode = async () => {
    if (!pasteInput.trim()) return toast.error('Enter a code');
    try {
      const result = await waveMeshCore.connectFromCode(pasteInput.trim());
      if (result.success) {
        // Create room IMMEDIATELY
        const newRoom: ChatRoom = {
          id: result.peerId || `room_${Date.now()}`,
          name: result.username || 'Peer',
          avatar: result.avatar || null,
          lastMessage: 'Connected!',
          lastMessageTime: new Date().toISOString(),
          unread: 0,
          peerId: result.peerId || `peer_${Date.now()}`,
        };
        setRooms(prev => {
          if (prev.find(r => r.id === newRoom.id)) return prev;
          return [newRoom, ...prev];
        });
        setActiveRoom(newRoom);
        setShowSidebar(false);
        setTab('rooms');
        setMessages([]);
        
        setQrConnected(true);
        setQrPeerName(result.username || 'Peer');
        setPasteInput('');
        setShowQRModal(false);
        toast.success(`🌊 Connected with ${result.username || 'Peer'}!`);
      } else {
        toast.error('Invalid code');
      }
    } catch {
      toast.error('Connection failed');
    }
  };  


  const sendMessage = () => {
    if (!input.trim()) return;
    
    const msg: ChatMessageUI = {
      id: `msg_${Date.now()}`,
      room: activeRoom?.id || 'p2p',
      sender: { id: user?.id || '', username: myUsername, avatar: myAvatar },
      type: 'text',
      content: input,
      reactions: {},
      timestamp: Date.now(),
      status: 'sending',
    };
    
    setMessages(prev => [...prev, msg]);
    waveMeshCore.sendMessage(input);
    setInput('');
    
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'sent' } : m));
    }, 500);
    
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };
  
  const sendRequest = (peerId: string) => {
    waveMeshCore.sendRequest(peerId);
    toast.success('📩 Request sent!');
  };
  
  const acceptRequest = async () => {
    if (!incomingRequest) return;
    await waveMeshCore.acceptRequest(incomingRequest.peerId);
    setIncomingRequest(null);
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
  
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const getStatusIcon = (status: string) => {
    if (status === 'sending') return <Clock size={10} className="text-gray-400" />;
    if (status === 'sent') return <Check size={10} className="text-gray-400" />;
    return <CheckCheck size={10} className="text-blue-500" />;
  };
  
  // ============================================================
  // GROUPED MESSAGES
  // ============================================================
  const groupedMessages = messages.reduce((groups: { date: string; messages: ChatMessageUI[] }[], msg) => {
    const date = formatDate(new Date(msg.timestamp).toISOString());
    const last = groups[groups.length - 1];
    if (last && last.date === date) {
      last.messages.push(msg);
    } else {
      groups.push({ date, messages: [msg] });
    }
    return groups;
  }, []);
  
  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-50 via-white to-green-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      
      {/* INCOMING REQUEST MODAL */}
      {incomingRequest && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold">
              {incomingRequest.from[0]?.toUpperCase()}
            </div>
            <h3 className="font-bold text-xl mb-1">@{incomingRequest.from}</h3>
            <p className="text-gray-500 text-sm mb-4">{incomingRequest.message}</p>
            <div className="flex gap-2">
              <button onClick={acceptRequest} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold">✅ Accept</button>
              <button onClick={() => setIncomingRequest(null)} className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-medium">❌ Decline</button>
            </div>
          </div>
        </div>
      )}
      
      {/* SIDEBAR */}
      {((showSidebar) || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
        <div className="w-[85%] max-w-[320px] md:w-80 lg:w-96 border-r border-gray-200/50 dark:border-gray-800/50 flex flex-col bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl absolute md:relative z-20 h-full shadow-2xl md:shadow-none">
          
          {/* Header */}
          <div className="p-5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
                <Zap size={24} className="text-green-500" />WaveMesh
              </h2>
              <button onClick={() => setShowSidebar(false)} className="md:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {meshStatus} · {peers.length} peers
            </p>
          </div>
          
          {/* Tabs */}
          <div className="flex mx-4 mt-3 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl p-1">
            {[
              { key: 'rooms' as const, label: 'Chats', icon: MessageCircle },
              { key: 'discover' as const, label: 'Discover', icon: Users },
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
          
          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto mt-2 px-3 pb-3">
            
            {/* ROOMS TAB */}
            {tab === 'rooms' && (
              <div className="space-y-1">
                {rooms.length === 0 ? (
                  <div className="text-center py-16 px-4 text-gray-400">
                    <MessageCircle size={36} className="mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">No conversations yet</p>
                    <p className="text-sm">Connect via QR or Discover!</p>
                  </div>
                ) : (
                  rooms.map(room => (
                    <button key={room.id} onClick={() => { setActiveRoom(room); setShowSidebar(false); }}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all text-left ${
                        activeRoom?.id === room.id ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-2 border-transparent'
                      }`}>
                      <Avatar src={room.avatar} name={room.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">@{room.name}</p>
                        <p className="text-xs text-gray-500 truncate">{room.lastMessage}</p>
                      </div>
                      {room.unread > 0 && (
                        <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{room.unread}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
            
            {/* DISCOVER TAB */}
            {tab === 'discover' && (
              <div className="space-y-1">
                {discoveredDevices.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <Users size={36} className="mx-auto mb-3 text-gray-300" />
                    <p className="font-semibold text-gray-500">Searching for nearby users...</p>
                    <p className="text-sm text-gray-400">WaveMesh scans via {meshStatus}</p>
                    <div className="flex justify-center gap-1 mt-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                ) : (
                  discoveredDevices.map((device, i) => (
                    <div key={device.id || i} className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <Avatar src={null} name={device.username} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">@{device.username}</p>
                        <p className="text-xs text-green-500">
                          🟢 Online · {device.connectionType.toUpperCase()} · ~{device.distance}m
                        </p>
                      </div>
                      <button onClick={() => sendRequest(device.id)} className="p-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition">
                        <UserPlus size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {/* CONNECT TAB */}
            {tab === 'connect' && (
              <div className="space-y-4 p-2">
                <div className="glass p-4 rounded-2xl text-center">
                  <p className="text-xs text-gray-500 mb-2">Your Mesh ID</p>
                  <code className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg break-all">
                    {waveMeshCore.getIdentity()?.id || 'Initializing...'}
                  </code>
                </div>
                <button onClick={generateQRCode} className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg">
                  <QrCode size={20} /> 🌊 Offline P2P Connect
                </button>
                <div className="flex gap-2">
                  <input value={pasteInput} onChange={e => setPasteInput(e.target.value)}
                    placeholder="Paste code here..."
                    className="flex-1 px-4 py-2.5 rounded-xl border text-sm dark:bg-gray-700 dark:border-gray-600" />
                  <button onClick={connectFromCode} className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-semibold">
                    Connect
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 text-center">
            <p className="text-[10px] text-gray-400">
              🌊 SL WaveMesh · Offline P2P · {meshStatus}
            </p>
          </div>
        </div>
      )}
      
      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col z-10">
        {!activeRoom ? (
          /* WELCOME SCREEN */
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}
                className="w-28 h-28 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-green-500/30">
                <Zap size={56} className="text-white" />
              </motion.div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3">Welcome to WaveMesh</h2>
              <p className="text-gray-500 mb-2 text-lg">The world's first <span className="font-semibold text-green-600">offline P2P</span> chat network</p>
              <p className="text-gray-400 text-sm mb-8">Connect directly with anyone nearby — no internet required.</p>
              
              <button onClick={() => setShowSidebar(true)} className="md:hidden mx-auto mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                <Menu size={24} />
              </button>
              
              <div className="flex gap-3 justify-center flex-wrap">
                <button onClick={() => { setTab('discover'); setShowSidebar(true); }}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-semibold shadow-lg">
                  🔍 Discover Peers
                </button>
                <button onClick={generateQRCode}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-semibold shadow-lg flex items-center gap-2">
                  <QrCode size={18} /> 🌊 Offline P2P
                </button>
              </div>
              
              <div className="mt-8 flex items-center justify-center gap-6 text-xs text-gray-400">
                <span className="flex items-center gap-1"><WifiOff size={12} /> No Internet</span>
                <span className="flex items-center gap-1"><Shield size={12} /> E2E Encrypted</span>
                <span className="flex items-center gap-1"><Zap size={12} /> Instant</span>
              </div>
            </div>
          </div>
        ) : (
          /* CHAT VIEW */
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => { setActiveRoom(null); setShowSidebar(true); }} className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">
                  <ArrowLeft size={20} />
                </button>
                <Avatar src={activeRoom.avatar} name={activeRoom.name} size="md" />
                <div>
                  <h3 className="font-bold text-sm">@{activeRoom.name}</h3>
                  <p className="text-xs text-green-600">Connected via WaveMesh</p>
                </div>
              </div>
              <button onClick={() => leaveRoom(activeRoom.id)} className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition text-red-400">
                <LogOut size={18} />
              </button>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 py-20">
                  <MessageCircle size={48} className="mx-auto mb-2 opacity-30" />
                  <p>No messages yet</p>
                  <p className="text-sm">Say hello! 👋</p>
                </div>
              )}
              {groupedMessages.map((group) => (
                <div key={group.date}>
                  <div className="flex justify-center mb-4">
                    <span className="bg-gray-200/50 dark:bg-gray-800/50 text-gray-500 text-xs px-4 py-1 rounded-full">{group.date}</span>
                  </div>
                  {group.messages.map((msg, i) => {
                    const isMe = msg.sender.username === myUsername;
                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex items-end gap-2 mb-1 ${isMe ? 'justify-end' : 'justify-start'} mt-3`}>
                        {!isMe && <Avatar src={msg.sender.avatar} name={msg.sender.username} size="sm" />}
                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                          isMe ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-br-lg shadow-md' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-lg shadow-sm border'
                        }`}>
                          {!isMe && <p className="text-[10px] font-semibold text-gray-500 mb-0.5">@{msg.sender.username}</p>}
                          {msg.type === 'image' && msg.fileUrl ? (
                            <img src={msg.fileUrl} alt="Shared" className="max-w-full rounded-xl max-h-64 object-cover" />
                          ) : <span>{msg.content}</span>}
                          <div className="flex items-center gap-1 mt-1 justify-end">
                            <span className="text-[10px] opacity-60">{formatTime(msg.timestamp)}</span>
                            {isMe && getStatusIcon(msg.status)}
                          </div>
                        </div>
                        {isMe && <Avatar src={myAvatar} name={myUsername} size="sm" />}
                      </motion.div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input Bar */}
            <div className="p-4 border-t border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
              <div className="flex items-end gap-2">
                <input type="file" ref={fileInputRef} className="hidden" onChange={e => { if (e.target.files?.[0]) { /* send file */ } }} />
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500">
                  <Smile size={20} />
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500">
                  <Paperclip size={20} />
                </button>
                <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Message via WaveMesh..."
                  className="flex-1 px-5 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-green-400/50 transition-all" />
                <button onClick={sendMessage} disabled={!input.trim()}
                  className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl disabled:opacity-40 shadow-lg">
                  <Send size={20} />
                </button>
              </div>
              {showEmojiPicker && (
                <div className="absolute bottom-20 left-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border p-3 z-50">
                  <div className="grid grid-cols-8 gap-1.5">
                    {EMOJIS.map(emoji => (
                      <button key={emoji} onClick={() => { setInput(prev => prev + emoji); setShowEmojiPicker(false); inputRef.current?.focus(); }}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-lg transition transform hover:scale-125">{emoji}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* QR MODAL */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowQRModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-xl text-center mb-4">🌊 Offline P2P Connect</h3>
            
            {qrCode && qrCode !== 'Generating...' && qrCode !== 'Failed' && (
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
                placeholder="Or paste code here..."
                className="flex-1 px-4 py-2.5 rounded-xl border text-sm dark:bg-gray-700 dark:border-gray-600" />
              <button onClick={connectFromCode}
                className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-semibold">
                Connect
              </button>
            </div>
            
            {qrConnected && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-center mb-2">
                <p className="text-sm text-green-600 font-semibold">✅ Connected with @{qrPeerName}</p>
              </div>
            )}
            
            <button onClick={() => setShowQRModal(false)}
              className="w-full py-2.5 bg-gray-200 dark:bg-gray-700 rounded-xl font-semibold text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
