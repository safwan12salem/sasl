/**
 * Sasl WaveMesh — Complete P2P Chat Component
 * LEGENDARY EDITION — BLE + Echo Relay + AudioMesh + File Transfer + E2E Encryption
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ImageIcon, QrCode, Radio, WifiOff, Shield, Send, LogOut, Copy, Menu, X, Edit3, Trash2,
  ArrowLeft, MessageCircle, Link, Smile, Bluetooth, Terminal,
  Wifi, Zap, TrendingUp, Users, Activity, BarChart3, Globe,
  Smartphone, RadioTower, Satellite, Heart, Share2, MoreVertical,
  ChevronRight, ChevronDown, RefreshCw, AlertCircle, CheckCircle2,
  Clock, MapPin, Navigation, Signal, Battery, Layers, GitBranch,
  ArrowUpRight, ArrowDownRight, Filter, SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { Preferences } from '@capacitor/preferences';
import { 
  waveMeshCore, 
  MeshPeer, 
  RangeInfo, 
  MeshStats, 
} from '../services/WaveMeshCore';
import { echoRelay } from '../services/EchoRelay';
import { useTranslation } from 'react-i18next';

interface ChatMessage {
  id: string;
  from: string;
  text: string;
  timestamp: number;
  isMe: boolean;
  status: 'sent' | 'delivered' | 'relayed';
  relayPath?: string[];
}

interface ChatRoom {
  id: string;
  name: string;
  avatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  connectionType: string;
  distance: number;
}

const EMOJIS = ['😀','😂','🥰','😍','🤩','😎','🥳','😤','😢','😭','😡','🤬','👍','👎','👏','🙌','💪','🔥','❤️','💔','🎉','✨','🌟','💯','🙏','🤝','👋','🫶','💰','📸','🎵','🌈','🍕','☕','🎂','🏆','⚽','🎮','🚀','💻'];

const TIER_COLORS: Record<number, { bg: string; text: string; gradient: string }> = {
  0: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600', gradient: 'from-gray-300 to-gray-400' },
  1: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600', gradient: 'from-green-400 to-emerald-500' },
  2: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600', gradient: 'from-blue-400 to-cyan-500' },
  3: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600', gradient: 'from-purple-400 to-pink-500' },
  4: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600', gradient: 'from-yellow-400 to-orange-500' },
};

const LAYER_ICONS: Record<string, any> = { ble4: Bluetooth, ble5: Radio, wifidirect: Wifi, relay: GitBranch, echo: Globe };

function Avatar({ src, name, size = 'md' }: { src?: string | null; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes: Record<string, string> = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
  const colors = ['from-green-400 to-emerald-500','from-blue-400 to-indigo-500','from-purple-400 to-pink-500','from-orange-400 to-red-500','from-teal-400 to-cyan-500'];
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

export default function WaveMesh() {
  const { user } = useAuth();
  const myUsername = user?.username || 'Me';
  const { t } = useTranslation();

  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<{ from: string; peerId: string; message: string } | null>(null);
  const [editText, setEditText] = useState("");
  const [input, setInput] = useState('');
  const [tab, setTab] = useState<'rooms' | 'discover' | 'relay' | 'connect' | 'debug'>('rooms');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [pasteInput, setPasteInput] = useState('');
  const [qrConnected, setQrConnected] = useState(false);
  const [peers, setPeers] = useState<MeshPeer[]>([]);
  const [scanning, setScanning] = useState(false);
  const [rangeInfo, setRangeInfo] = useState<RangeInfo | null>(null);
  const [stats, setStats] = useState<MeshStats | null>(null);
  const [tierInfo, setTierInfo] = useState({ tier: 0, name: 'Initializing', description: '', color: 'gray' });
  const [showEmoji, setShowEmoji] = useState(false);
  const [filterLayer, setFilterLayer] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'distance' | 'name' | 'type'>('distance');
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [audioMeshActive, setAudioMeshActive] = useState(false);
  const [relayStats, setRelayStats] = useState(echoRelay.getStats());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================
  // INITIALIZATION
  // ============================================================
  useEffect(() => {
    waveMeshCore.start(myUsername, myAvatar);
    waveMeshCore.onDebug(() => setDebugLog(waveMeshCore.getDebugLog()));

    waveMeshCore.setOnPeerDiscovered((p: any) => {
      setPeers(prev => {
        const exists = prev.find(x => x.id === p.id);
        if (exists) return prev.map(x => x.id === p.id ? p : x);
        return [...prev, p];
      });
    });

    waveMeshCore.setOnPeerConnected((data: any) => {
      const name = (data.username && !/^\d+$/.test(data.username)) ? data.username : 'Peer';
      const room: ChatRoom = {
        id: data.peerId, name, avatar: null,
        lastMessage: `Connected via ${data.connectionType || 'BLE'}`,
        lastMessageTime: new Date().toISOString(), unread: 0,
        connectionType: data.connectionType || 'ble4', distance: 0,
      };
      setRooms(prev => {
        const exists = prev.find(r => r.id === room.id);
        if (exists) return prev.map(r => r.id === room.id ? { ...r, name: room.name, connectionType: room.connectionType } : r);
        return [room, ...prev];
      });
      setActiveRoom(room);
      restoreMessages(room.id);
      setShowSidebar(false);
      setShowWelcome(false);
      toast.success(`🔗 Connected with ${name}!`);
    });

    waveMeshCore.setOnRequestReceived((data: any) => {
      setIncomingRequest({ from: data.username || "User", peerId: data.peerId || data.deviceId, message: "Wants to connect via WaveMesh" });
    });

    waveMeshCore.setOnRoomCreated((data: any) => {
      const room: ChatRoom = {
        id: data.peerId, name: data.username || 'Peer', avatar: null,
        lastMessage: 'Room created', lastMessageTime: new Date().toISOString(), unread: 0,
        connectionType: data.connectionType || 'ble4', distance: 0,
      };
      setRooms(prev => {
        const exists = prev.find(r => r.id === room.id);
        if (exists) return prev.map(r => r.id === room.id ? { ...r, name: room.name } : r);
        return [room, ...prev];
      });
      setActiveRoom(room);
      restoreMessages(room.id);
      setShowSidebar(false);
      setShowWelcome(false);
    });

    waveMeshCore.setOnMessageReceived((msg: any) => {
       if (msg.text === '__SASL_CONNECT_BACK__') {
        // Find the sender in our peers and connect back
        const peer = peers.find(p => p.username === msg.from && p.id.includes(':'));
        if (peer) {
          waveMeshCore.connectToPeer(peer.id).catch(() => {});
        }
        return;
      }
      try {
        const cmd = JSON.parse(msg.text);
        if (cmd.type === 'delete') { setMessages(prev => prev.filter(m => m.id !== cmd.msgId)); return; }
        if (cmd.type === 'edit') { setMessages(prev => prev.map(m => m.id === cmd.msgId ? { ...m, text: cmd.text } : m)); return; }
        if (cmd.type === 'file_start') {
          setMessages(prev => [...prev, { id: msg.id, from: msg.from, text: `📎 Receiving: ${cmd.name}...`, timestamp: Date.now(), isMe: false, status: 'delivered' }]);
          return;
        }
        if (cmd.type === 'file_chunk') { return; }
      } catch {}
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, {
          id: msg.id, from: msg.from, text: msg.text || msg.content || '',
          timestamp: msg.timestamp || Date.now(), isMe: msg.from === myUsername,
          status: msg.relayed ? 'relayed' : 'delivered', relayPath: msg.relayPath,
        }];
      });
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    const interval = setInterval(() => {
      setRangeInfo(waveMeshCore.getRange());
      setStats(waveMeshCore.getStats());
      setPeers(waveMeshCore.getPeers());
      setTierInfo(waveMeshCore.getTierInfo());
      setRelayStats(echoRelay.getStats());
    }, 1000);

    return () => { clearInterval(interval); waveMeshCore.stop(); };
  }, []);

  // Message persistence
  useEffect(() => {
    if (activeRoom?.id && messages.length > 0) {
      const save = async () => {
        const { value } = await Preferences.get({ key: 'sasl_mesh_messages' });
        const saved = value ? JSON.parse(value) : {};
        saved[activeRoom.id] = messages;
        await Preferences.set({ key: 'sasl_mesh_messages', value: JSON.stringify(saved) });
      };
      save();
    }
  }, [messages, activeRoom]);

  const restoreMessages = async (roomId: string) => {
    try {
      const { value } = await Preferences.get({ key: 'sasl_mesh_messages' });
      if (value) {
        const saved = JSON.parse(value);
        if (saved[roomId]) setMessages(saved[roomId]);
      }
    } catch {}
  };

  // ============================================================
  // ACTIONS
  // ============================================================
  const toggleScan = async () => {
    if (scanning) { await waveMeshCore.stopScanning(); setScanning(false); }
    else { await waveMeshCore.startScanning(); setScanning(true); setShowWelcome(false); }
  };

  const generateQR = () => { setShowQR(true); setQrCode(waveMeshCore.generateConnectionCode()); setQrConnected(false); setPasteInput(''); };
   



    const pasteCode = () => {
    if (!pasteInput.trim()) return toast.error('Enter invitation code');
    const result = waveMeshCore.processConnectionCode(pasteInput.trim());
    if (result) {
      setPasteInput('');
      setShowQR(false);
      setQrConnected(false);
      toast.success("📡 Connected via Echo Relay! Messages hop through Sasl users.");
    } else { toast.error('Invalid code'); }
  };


  const completeHandshake = () => {
    if (!pasteInput.trim()) return toast.error('Enter invitation code');
    const result = waveMeshCore.processConnectionCode(pasteInput.trim());
    if (result) { 
      setPasteInput(''); 
      setShowQR(false); 
      setQrConnected(false); 
      toast.success("📡 Connected via Echo Relay!"); 
    }
    else { toast.error('Invalid code'); }
  };



  
  const sendMessage = () => {
    if (!input.trim()) return;
    if (editingMsgId) {
      setMessages(prev => prev.map(m => m.id === editingMsgId ? { ...m, text: input } : m));
      waveMeshCore.sendControlCommand(JSON.stringify({ type: 'edit', msgId: editingMsgId, text: input }));
      setEditingMsgId(null); setEditText(""); toast.success("Message updated");
    } else {
      waveMeshCore.sendMessage(input);
    }
    setInput('');
  };


    const sendQRMessage = () => {
    if (!input.trim() || !activeRoom) return;
    waveMeshCore.sendQRMessage(input, activeRoom.id);
    setInput('');
  };


  const deleteMessage = (msgId: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    waveMeshCore.sendControlCommand(JSON.stringify({ type: 'delete', msgId }));
    toast.success("Message deleted");
  };

  const startEditMessage = (msgId: string, currentText: string) => { 
    setEditingMsgId(msgId); setEditText(currentText); setInput(currentText); inputRef.current?.focus(); 
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    toast.success(`📎 Processing ${file.name}...`);
    
    // Try online Cloudinary first
    try {
      const formData = new FormData(); formData.append("file", file); formData.append("upload_preset", "sasl_upload");
      const res = await fetch("https://api.cloudinary.com/v1_1/dwem1chqc/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.secure_url) { waveMeshCore.sendMessage(`📎 ${data.secure_url}`); toast.success("File uploaded to cloud!"); return; }
    } catch {}
    
    // Offline: compress image then BLE chunk transfer
    try {
      if (file.type.startsWith('image/')) {
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise<void>(r => { img.onload = () => r(); });
        const ratio = Math.min(1, 300 / img.width);
        canvas.width = img.width * ratio; canvas.height = img.height * ratio;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/jpeg', 0.5));
        const buf = await blob.arrayBuffer();
        await waveMeshCore.sendFile(new Uint8Array(buf), file.name);
      } else {
        const buf = await file.arrayBuffer();
        await waveMeshCore.sendFile(new Uint8Array(buf), file.name);
      }
      toast.success(`📎 ${file.name} sent via BLE!`);
    } catch { toast.error("File transfer failed"); }
  };

  const toggleAudioMesh = async () => {
    if (audioMeshActive) {
      const { audioMesh } = await import("../services/AudioMesh"); 
      audioMesh.stop(); setAudioMeshActive(false); 
      toast.success("🔊 AudioMesh deactivated");
    } else {
      const { audioMesh } = await import("../services/AudioMesh"); 
      await audioMesh.start();
      await audioMesh.startListening((text: string) => {
        setMessages(prev => [...prev, { id: `msg_${Date.now()}`, from: "AudioMesh Peer", text, timestamp: Date.now(), isMe: false, status: "delivered" }]);
      });
      setAudioMeshActive(true); 
      toast.success("🔊 AudioMesh activated — extended range mode");
    }
  };

  const leaveRoom = async (roomId: string) => {
    setRooms(prev => prev.filter(r => r.id !== roomId));
    if (activeRoom?.id === roomId) { setActiveRoom(null); setMessages([]); }
    await waveMeshCore.disconnectPeer(roomId);
    try {
      const { value } = await Preferences.get({ key: 'sasl_mesh_messages' });
      const saved = value ? JSON.parse(value) : {};
      delete saved[roomId];
      await Preferences.set({ key: 'sasl_mesh_messages', value: JSON.stringify(saved) });
    } catch {}
  };

  // ============================================================
  // HELPERS
  // ============================================================
  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const getRangePercentage = () => rangeInfo ? Math.min(100, (rangeInfo.meters / 50000) * 100) : 0;
  const getTierColors = () => TIER_COLORS[tierInfo.tier] || TIER_COLORS[0];
  const filteredPeers = peers.filter(p => filterLayer === 'all' || p.connectionType === filterLayer).sort((a, b) => {
    if (sortBy === 'distance') return a.distance - b.distance;
    if (sortBy === 'name') return a.username.localeCompare(b.username);
    return a.connectionType.localeCompare(b.connectionType);
  });

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-50 via-white to-green-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* INCOMING REQUEST MODAL */}
      <AnimatePresence>
        {incomingRequest && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold">{incomingRequest.from[0]?.toUpperCase()}</div>
              <h3 className="font-bold text-xl mb-1">@{incomingRequest.from}</h3>
              <p className="text-gray-500 text-sm mb-4">{incomingRequest.message}</p>
              <div className="flex gap-2">
                <button onClick={() => { waveMeshCore.acceptRequest(incomingRequest.peerId); setIncomingRequest(null); toast.success("✅ Accepted!"); }} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold">✅ Accept</button>
                <button onClick={() => setIncomingRequest(null)} className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-medium">❌ Decline</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <AnimatePresence>
        {(showSidebar || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
          <motion.div initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: 'spring', damping: 25 }} className="w-[85vw] max-w-[320px] md:w-80 lg:w-96 border-r border-gray-200/50 dark:border-gray-800/50 flex flex-col bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl fixed md:relative z-30 h-full shadow-2xl md:shadow-none">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2"><Radio size={24} className="text-green-500" />WaveMesh</h2>
                <button onClick={() => setShowSidebar(false)} className="md:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={18} /></button>
              </div>

              {/* Tier Badge */}
              <div className={`p-3 rounded-xl bg-gradient-to-r ${getTierColors().gradient} mb-2`}>
                <div className="flex items-center justify-between"><span className="text-xs font-bold text-white">{tierInfo.name}</span><span className="text-xs text-white/75">{peers.length} peers</span></div>
                <p className="text-[10px] mt-1 text-white/75">{tierInfo.description}</p>
                {rangeInfo && <div className="mt-2 bg-white/20 rounded-full h-2 overflow-hidden"><motion.div className="bg-white h-full rounded-full" animate={{ width: `${getRangePercentage()}%` }} transition={{ duration: 1, ease: 'easeOut' }} /></div>}
              </div>

              <p className="text-xs text-gray-500 flex items-center gap-1"><span className={`w-2 h-2 rounded-full animate-pulse ${scanning ? 'bg-green-500' : 'bg-gray-400'}`} />{rangeInfo?.label || 'Initializing...'}</p>
              {rangeInfo && <p className="text-[10px] text-gray-400 mt-1">{rangeInfo.technology} · {rangeInfo.hopDistance}m hops</p>}

              <button onClick={toggleScan} className={`mt-3 w-full py-2.5 rounded-xl text-xs font-bold transition-all ${scanning ? 'bg-red-500 text-white animate-pulse shadow-lg' : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl'}`}>
                {scanning ? <span className="flex items-center justify-center gap-2"><Activity size={14} className="animate-spin" />STOP SCANNING</span> : <span className="flex items-center justify-center gap-2"><Radio size={14} />START MESH SCAN</span>}
              </button>
            </div>

            {/* Tabs */}
            <div className="flex mx-4 mt-3 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl p-1 overflow-x-auto">
              {[{ key: 'rooms', label: 'Chats', icon: MessageCircle },{ key: 'discover', label: 'Nearby', icon: Bluetooth },{ key: 'relay', label: 'Relay', icon: Globe },{ key: 'connect', label: 'Code', icon: Link },{ key: 'debug', label: 'Log', icon: Terminal }].map(tb => (
                <button key={tb.key} onClick={() => setTab(tb.key as any)} className={`flex-shrink-0 py-2.5 px-3 text-xs font-medium flex items-center justify-center gap-1.5 rounded-xl transition-all ${tab === tb.key ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm' : 'text-gray-500'}`}><tb.icon size={14} />{tb.label}</button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto mt-2 px-3 pb-3">
              {tab === 'rooms' && (
                <div className="space-y-1">
                  {rooms.length === 0 ? (
                    <div className="text-center py-16 px-4 text-gray-400"><MessageCircle size={36} className="mx-auto mb-2 opacity-50" /><p className="font-semibold">{t('No conversations yet')}</p><p className="text-sm">{t('Start scanning to find peers')}</p><button onClick={toggleScan} className="mt-4 px-4 py-2 bg-green-500 text-white rounded-xl text-sm">{t('Start Scan')}</button></div>
                  ) : (
                    rooms.map(room => (
                      <button key={room.id} onClick={() => { setActiveRoom(room); setShowSidebar(false); }} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all text-left ${activeRoom?.id === room.id ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-2 border-transparent'}`}>
                        <Avatar name={room.name} size="md" />
                        <div className="flex-1 min-w-0"><div className="flex items-center gap-1"><p className="font-semibold text-sm truncate">@{room.name}</p>{room.connectionType === 'ble5' && <Radio size={10} className="text-purple-500" />}{room.connectionType === 'wifidirect' && <Wifi size={10} className="text-orange-500" />}{room.connectionType === 'relay' && <Globe size={10} className="text-blue-500" />}</div><p className="text-xs text-gray-500 truncate">{room.lastMessage}</p></div>
                        {room.unread > 0 && <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{room.unread}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}

              {tab === 'discover' && (
                <div>
                  <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
                    {[{ key: 'all', label: 'All', icon: Layers },{ key: 'ble4', label: 'BLE 4', icon: Bluetooth },{ key: 'ble5', label: 'BLE 5', icon: Radio },{ key: 'wifidirect', label: 'WiFi Direct', icon: Wifi },{ key: 'relay', label: 'Relay', icon: GitBranch }].map(f => (
                      <button key={f.key} onClick={() => setFilterLayer(f.key)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${filterLayer === f.key ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600'}`}><f.icon size={10} />{f.label}</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mb-3"><SlidersHorizontal size={12} className="text-gray-400" /><select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="text-[10px] bg-transparent text-gray-500"><option value="distance">Sort by Distance</option><option value="name">Sort by Name</option><option value="type">Sort by Type</option></select></div>
                  {filteredPeers.length === 0 ? (
                    <div className="text-center py-16"><Bluetooth size={36} className="mx-auto mb-3 text-gray-300" /><p className="font-semibold text-gray-500">{scanning ? 'Scanning all layers...' : 'Press START MESH SCAN'}</p><p className="text-sm text-gray-400 mt-1">BLE 4 (100m) · BLE 5 (500m) · WiFi Direct (200m) · Relay (∞)</p>{scanning && <div className="flex justify-center gap-1 mt-3"><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" /><div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} /><div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} /></div>}</div>
                  ) : (
                    filteredPeers.map(peer => {
                      const LayerIcon = LAYER_ICONS[peer.connectionType] || Bluetooth;
                      return (
                        <motion.div key={peer.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition mb-1">
                          <Avatar name={peer.username} size="md" />
                          <div className="flex-1 min-w-0"><p className="font-semibold text-sm">{peer.username}</p><p className="text-xs flex items-center gap-1"><LayerIcon size={10} className={peer.connectionType === 'ble5' ? 'text-purple-500' : peer.connectionType === 'wifidirect' ? 'text-orange-500' : peer.connectionType === 'relay' ? 'text-blue-500' : 'text-green-500'} /><span className="text-gray-500">{peer.connectionType.toUpperCase()} · ~{peer.distance}m · {peer.signalStrength}%</span></p></div>
                          <div className="flex items-center gap-1">
                            {peer.connected ? <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full">{t('Connected')}</span> : (
                              <button onClick={async () => { toast.success("🔗 Connecting..."); await waveMeshCore.connectToPeer(peer.id); }} className="p-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition"><Send size={14} /></button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              )}

              {tab === 'relay' && (
                <div>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold flex items-center gap-1"><Globe size={12} className="text-blue-500" /> {t('Echo Relay')}</span>
                      <span className="text-[10px] text-blue-500">{relayStats.pendingDelivery} {t('pending')}</span>
                    </div>
                    <p className="text-[10px] text-gray-500">{t('Messages hop through Sasl users until they reach the destination.')}{rangeInfo && rangeInfo.usersNeeded > 0 ? ` ${t('Need')} ${rangeInfo.usersNeeded} ${t('more users for 50km mesh.')}` : ` ${t('Global mesh active!')}`}</p>
                    {rangeInfo && <div className="mt-2 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 overflow-hidden"><div className="bg-gradient-to-r from-blue-400 to-purple-500 h-full rounded-full transition-all" style={{ width: `${getRangePercentage()}%` }} /></div>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="p-2 rounded-xl bg-white dark:bg-gray-700 text-center"><p className="text-[10px] text-gray-500">{t('Stored')}</p><p className="text-lg font-bold">{relayStats.totalMessages}</p></div>
                    <div className="p-2 rounded-xl bg-white dark:bg-gray-700 text-center"><p className="text-[10px] text-gray-500">{t('Pending')}</p><p className="text-lg font-bold text-orange-500">{relayStats.pendingDelivery}</p></div>
                    <div className="p-2 rounded-xl bg-white dark:bg-gray-700 text-center"><p className="text-[10px] text-gray-500">{t('Delivered')}</p><p className="text-lg font-bold text-green-500">{relayStats.delivered}</p></div>
                  </div>
                  {rangeInfo && (
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 mb-3">
                      <div className="flex justify-between text-[10px] text-gray-500 mb-1"><span>0km</span><span>10km</span><span>25km</span><span>50km</span></div>
                      <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden"><motion.div className={`h-full rounded-full bg-gradient-to-r ${getTierColors().gradient}`} animate={{ width: `${getRangePercentage()}%` }} transition={{ duration: 1 }} /></div>
                      <p className="text-[10px] text-gray-400 mt-2 text-center">{rangeInfo.usersNeeded > 0 ? `${rangeInfo.peerCount} peers · ${rangeInfo.usersNeeded} more for 50km global mesh` : '🎉 50km GLOBAL MESH ACTIVE!'}</p>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 text-center">{t('Each Sasl user extends the mesh by ~200m. The more users, the farther the mesh reaches!')}</p>
                </div>
              )}

              {tab === 'connect' && (
                <div className="space-y-4 p-2">
                  <div className="glass p-4 rounded-2xl text-center"><p className="text-xs text-gray-500 mb-1">{t('Your Sasl Mesh ID')}</p><code className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg break-all">{waveMeshCore.getIdentity()?.id || 'Initializing...'}</code><button onClick={() => { navigator.clipboard.writeText(waveMeshCore.getIdentity()?.id || ''); toast.success('ID copied!'); }} className="mt-2 text-[10px] text-green-500 flex items-center gap-1 mx-auto"><Copy size={10} /> {t('Copy ID')}</button></div>
                  <button onClick={generateQR} className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg"><QrCode size={20} /> {t('Share Connection Code')}</button>
                  <div className="flex gap-2"><input value={pasteInput} onChange={e => setPasteInput(e.target.value)} placeholder={t('Paste connection code...')} className="flex-1 px-4 py-2.5 rounded-xl border text-sm dark:bg-gray-700 dark:border-gray-600" /><button onClick={qrConnected ? completeHandshake : pasteCode} className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-semibold">{t('Connect')}</button></div>
                  {stats && <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800"><h4 className="text-xs font-bold mb-3">{t('Mesh Statistics')}</h4><div className="grid grid-cols-2 gap-2"><div className="p-2 rounded-xl bg-white dark:bg-gray-700"><p className="text-[10px] text-gray-500">{t('Peers')}</p><p className="text-lg font-bold">{stats.totalPeers}</p></div><div className="p-2 rounded-xl bg-white dark:bg-gray-700"><p className="text-[10px] text-gray-500">{t('Connected')}</p><p className="text-lg font-bold">{stats.connectedPeers}</p></div><div className="p-2 rounded-xl bg-white dark:bg-gray-700"><p className="text-[10px] text-gray-500">{t('Relay Msgs')}</p><p className="text-lg font-bold">{stats.relayMessages}</p></div><div className="p-2 rounded-xl bg-white dark:bg-gray-700"><p className="text-[10px] text-gray-500">{t('Delivered')}</p><p className="text-lg font-bold">{stats.delivered}</p></div></div></div>}
                </div>
              )}

              {tab === 'debug' && (
                <div className="space-y-1"><p className="text-xs font-bold mb-2">📋  System Log:</p>{debugLog.length === 0 ? <p className="text-xs text-gray-400">{t('No log entries. Start scanning to see activity.')}</p> : debugLog.map((line, i) => <p key={i} className="text-[10px] text-gray-600 dark:text-gray-400 font-mono leading-relaxed border-b border-gray-100 dark:border-gray-800 pb-1">{line}</p>)}</div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 text-center">
              <p className="text-[10px] text-gray-400">🌊 WaveMesh · BLE 5 + Echo Relay + AudioMesh · 100 users = 50km</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col z-10 min-w-0">
        {!activeRoom ? (
          <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
            <div className="text-center max-w-md w-full">
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }} className="w-20 h-20 sm:w-28 sm:h-28 mx-auto mb-4 sm:mb-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-green-500/30"><Radio size={36} className="text-white sm:size-14" /></motion.div>
              <div className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-3 bg-gradient-to-r ${getTierColors().gradient} text-white`}>{tierInfo.name}</div>
              <h2 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2 sm:mb-3"> {t('Sasl WaveMesh')}</h2>
              <p className="text-gray-500 mb-1 sm:mb-2 text-sm sm:text-lg"><span className="font-semibold text-green-600"> {t('Multi-Layer P2P')}</span> · {t('Zero Internet')}</p>
              <p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-8">BLE 4 (100m) + BLE 5 (500m) + Echo Relay (∞) + AudioMesh<br /><span className="font-semibold">{t('100  users = 50km Global Mesh')}</span></p>
              <button onClick={() => setShowSidebar(true)} className="md:hidden mx-auto mb-3 sm:mb-4 p-2.5 sm:p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl"><Menu size={20} /></button>
              <div className="flex gap-2 sm:gap-3 justify-center flex-wrap">
                <button onClick={() => { setTab('discover'); setShowSidebar(true); }} className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-semibold shadow-lg text-xs sm:text-base">🔍  {t('Discover Peers')}</button>
                <button onClick={generateQR} className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-semibold shadow-lg flex items-center gap-2 text-xs sm:text-base"><QrCode size={16} /> {t('Share Connection Code')}</button>
              </div>
              <div className="mt-6 sm:mt-8 flex items-center justify-center gap-3 sm:gap-6 text-[10px] sm:text-xs text-gray-400 flex-wrap"><span className="flex items-center gap-1"><WifiOff size={10} /> {t('No Internet')}</span><span className="flex items-center gap-1"><Shield size={10} /> {t('E2E Encrypted')}</span><span className="flex items-center gap-1"><Globe size={10} /> {t('Global Relay')}</span></div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Chat Header */}
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <button onClick={() => { setActiveRoom(null); setShowSidebar(true); }} className="md:hidden p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl flex-shrink-0"><ArrowLeft size={18} /></button>
                <Avatar name={activeRoom.name} size="sm" />
                <div className="min-w-0"><h3 className="font-bold text-xs sm:text-sm truncate">@{activeRoom.name}</h3><p className="text-[10px] sm:text-xs text-green-600 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full" />{activeRoom.connectionType === 'relay' ? 'Echo Relay' : 'Direct P2P'}{activeRoom.distance > 0 && ` · ~${activeRoom.distance}m`}</p></div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={toggleAudioMesh} className={`p-1.5 sm:p-2 rounded-xl transition ${audioMeshActive ? "bg-green-100 dark:bg-green-900/30 text-green-500" : "hover:bg-purple-50 dark:hover:bg-purple-900/30 text-purple-500"}`} title={audioMeshActive ? "AudioMesh Active — Tap to Deactivate" : "Activate AudioMesh for extended range"}><Radio size={14} className={audioMeshActive ? "animate-pulse" : ""} /></button>
                <button onClick={() => leaveRoom(activeRoom.id)} className="p-1.5 sm:p-2.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition text-red-400"><LogOut size={16} /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 min-h-0">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-16 sm:py-20"><MessageCircle size={36} className="mx-auto mb-2 opacity-30" /><p className="text-sm sm:text-base"> {t('Connected via WaveMesh')}</p><p className="text-xs sm:text-sm"> {t('Say hello! 👋')}</p></div>
              ) : (
                messages.map(msg => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex items-end gap-1.5 sm:gap-2 ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                    {!msg.isMe && <Avatar name={msg.from} size="sm" />}
                    <div className={`max-w-[80%] sm:max-w-[75%] px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm ${msg.isMe ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-br-lg shadow-md' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-lg shadow-sm border'}`}>
                      {!msg.isMe && <p className="text-[9px] sm:text-[10px] font-semibold text-gray-500 mb-0.5">@{msg.from}</p>}
                      <span className="break-words">
                        {(() => {
                          try {
                            const cmd = JSON.parse(msg.text);
                            if (cmd.type === 'delete') return '🗑️ Message deleted';
                            if (cmd.type === 'edit') return cmd.text;
                            if (cmd.type === 'file_start') return `📎 ${cmd.name} (${(cmd.size/1024).toFixed(1)}KB)`;
                          } catch {}
                          if (msg.text?.startsWith('📎 http')) {
                            return <img src={msg.text.replace('📎 ', '')} alt="shared" className="max-w-full rounded-lg" />;
                          }
                          return msg.text;
                        })()}
                      </span>
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        {msg.isMe && (
                          <>
                            <button onClick={() => startEditMessage(msg.id, msg.text)} className="text-[9px] text-white/70 hover:text-white mr-2" title="Edit"><Edit3 size={10} /></button>
                            <button onClick={() => deleteMessage(msg.id)} className="text-[9px] text-white/70 hover:text-white" title="Delete"><Trash2 size={10} /></button>
                          </>
                        )}
                        {msg.status === 'relayed' && <Globe size={8} className="text-blue-400" />}
                        <span className="text-[9px] sm:text-[10px] opacity-60">{formatTime(msg.timestamp)}</span>
                      </div>
                    </div>
                    {msg.isMe && <Avatar name={myUsername} size="sm" />}
                  </motion.div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-2 sm:p-4 border-t border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl flex-shrink-0">
              <div className="flex items-end gap-1.5 sm:gap-2">
                <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 sm:p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex-shrink-0"><Smile size={18} /></button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                <button onClick={() => fileInputRef.current?.click()} className="p-2 sm:p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex-shrink-0"><ImageIcon size={18} /></button>
                <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Message via WaveMesh..." className="flex-1 min-w-0 px-3 sm:px-5 py-2 sm:py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-green-400/50 transition-all" />
                <button onClick={async () => { if (!input.trim()) return; await waveMeshCore.sendViaAudioMesh(input); toast.success('🔊 Sent via AudioMesh + BLE'); setInput(''); }} disabled={!input.trim()} className="p-2 sm:p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl disabled:opacity-40 shadow-lg flex-shrink-0" title="Send via AudioMesh (long range)"><Radio size={18} /></button>
                <button onClick={sendMessage} disabled={!input.trim()} className="p-2 sm:p-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl disabled:opacity-40 shadow-lg flex-shrink-0"><Send size={18} /></button>
              </div>
              {showEmoji && (
                <div className="absolute bottom-16 sm:bottom-20 left-2 sm:left-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border p-2 sm:p-3 z-50 max-w-[90vw]">
                  <div className="grid grid-cols-7 sm:grid-cols-8 gap-1 sm:gap-1.5">{EMOJIS.map(emoji => <button key={emoji} onClick={() => { setInput(prev => prev + emoji); setShowEmoji(false); inputRef.current?.focus(); }} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm sm:text-lg transition transform hover:scale-125">{emoji}</button>)}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QR MODAL */}
      <AnimatePresence>
        {showQR && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowQR(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-xl text-center mb-4">📡 Sasl WaveMesh Connect</h3>
              {qrCode && <div className="flex justify-center mb-4"><div className="bg-white p-4 rounded-2xl shadow-inner"><QRCodeSVG value={qrCode} size={200} level="M" /></div></div>}
              {qrCode && <div className="flex items-center gap-2 mb-4"><code className="flex-1 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-xl text-xs break-all select-all">{qrCode.substring(0, 50)}...</code><button onClick={() => { navigator.clipboard.writeText(qrCode); toast.success('Copied!'); }} className="p-2 bg-purple-500 text-white rounded-xl"><Copy size={14} /></button></div>}
              <div className="flex gap-2 mb-4"><input value={pasteInput} onChange={e => setPasteInput(e.target.value)} placeholder="Paste peer's code..." className="flex-1 px-4 py-2.5 rounded-xl border text-sm dark:bg-gray-700 dark:border-gray-600" /><button onClick={pasteCode} className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-semibold">Connect</button></div>
              <button onClick={() => setShowQR(false)} className="w-full py-2.5 bg-gray-200 dark:bg-gray-700 rounded-xl font-semibold text-sm">Close</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}