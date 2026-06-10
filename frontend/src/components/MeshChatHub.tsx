/**
 * Elegant, professional, engaging design with smooth animations
 * Features: Persistent rooms, auto-reconnect, avatars, reactions, file sharing
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle, Users, UserPlus, Search, X, Check,
  Paperclip, Send, Loader2, Wifi, WifiOff, Copy,
  LogOut, Zap, Sparkles, Smile, Image, File, ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// ============================================================
// TYPES
// ============================================================
interface ChatMessage {
  id: string;
  room: string;
  sender: { id: string; username: string; avatar_url: string | null } | null; 
  message_type: 'text' | 'image' | 'file' | 'reaction' | 'system';
  content: string;
  file_url?: string;
  file_name?: string;
  reactions: Record<string, string[]>;
  created_at: string;
}

interface ChatRoom {
  id: string;

  room_id: string;
  name: string;
  room_type: 'private' | 'group' | 'mesh';
  avatar_url: string | null;
   members: Array<{ id: string; username: string; avatar_url: string | null }>;
  unread_count: number;
  last_message: string;
  last_message_at: string;
  invite_code: string | null;
   other_user: { id: string; username: string; avatar_url: string | null } | null;
}

interface ChatRequest {
  id: string;
  from_user: { id: string; username: string; avatar_url: string | null };
  to_user: { id: string; username: string; avatar_url: string | null };
  status: 'pending' | 'accepted' | 'declined';
  message: string;
  created_at: string;
}

interface DiscoveredPeer {
  username: string;
  node_id: string;
  is_online: boolean;
  last_seen: string;
  avatar_url: string | null;
}



// ============================================================
// CONSTANTS
// ============================================================
const QUICK_REACTIONS = ['❤️', '😂', '🔥', '🎉', '💯', '🚀'];

// ============================================================
// AVATAR COMPONENT
// ============================================================
function Avatar({ src, name, size = 'md', isOnline }: {
  src?: string | null; name: string; size?: 'sm' | 'md' | 'lg'; isOnline?: boolean
}) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
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
      {isOnline && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full ring-2 ring-white dark:ring-gray-900" />
      )}
    </div>
  );
}

// ============================================================
// SHIELD ICON (SVG fallback)
// ============================================================
function Shield({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function MeshChatHub() {
  const { user } = useAuth();
  const myUsername = user?.username || '';

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [peers, setPeers] = useState<DiscoveredPeer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DiscoveredPeer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'rooms' | 'contacts' | 'requests'>('rooms');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const [reactionPicker, setReactionPicker] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeRoomRef = useRef<ChatRoom | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
const [justSent, setJustSent] = useState(false);
  const token = localStorage.getItem('sasl_token');

  useEffect(() => { activeRoomRef.current = activeRoom; }, [activeRoom]);

  // Fetch my avatar
    // Fetch my avatar
    // Fetch my avatar (with offline fallback)
  useEffect(() => {
    // Try localStorage first
    const saved = localStorage.getItem('sasl_avatar');
    if (saved) setMyAvatar(saved);
    
    // Then try API
    api.get('/users/profile/').then(res => {
      const data = res.data;
      const avatar = data.avatar_url || data.avatar || data.profile_picture || 
                     (data.profile?.avatar_url) || null;
      if (avatar) {
        setMyAvatar(avatar);
        localStorage.setItem('sasl_avatar', avatar);
      }
    }).catch(() => {
      // Offline — use saved avatar
      if (saved) setMyAvatar(saved);
    });
  }, []);
  // ============================================================
  // DATA FETCHING
const fetchRooms = useCallback(async () => {
    try {
      const res = await api.get('/mesh/rooms/');
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      // Save to localStorage for offline persistence
      localStorage.setItem('sasl_cached_rooms', JSON.stringify(data));
      setRooms(data);
      if (activeRoomRef.current) {
        const updated = data.find((r: ChatRoom) => r.id === activeRoomRef.current?.id);
        if (updated) setActiveRoom(updated);
      }
    } catch (err) {
      // OFFLINE: Load cached rooms from localStorage
      const cached = localStorage.getItem('sasl_cached_rooms');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRooms(parsed);
          }
        } catch {}
      }
      console.log('Offline: using cached rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get('/mesh/requests/received/');
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setRequests(data);
    } catch (err) {
      setRequests([]);
    }
  }, []);

  const fetchPeers = useCallback(async () => {
    try {
      const res = await api.get('/mesh/rooms/discover_peers/');
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setPeers(data);
    } catch (err) {
      setPeers([]);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    fetchRequests();
    fetchPeers();
    const interval = setInterval(() => { fetchRooms(); fetchPeers(); }, 10000);
    return () => clearInterval(interval);
  }, [fetchRooms, fetchRequests, fetchPeers]);

  // ============================================================
  // WEB SOCKET WITH AUTO-RECONNECT
  // ============================================================
  const connectWebSocket = useCallback((roomId: string) => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

    const ws = new WebSocket(`ws://localhost:8000/ws/video/${roomId}/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setConnecting(false);

      ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'chat_message') {
          setMessages(prev => {
            const exists = prev.some(m =>
              m.id === data.message.id ||
              (m.content === data.message.content &&
                m.sender?.username === data.message.sender?.username &&
                Math.abs(new Date(m.created_at).getTime() - new Date(data.message.created_at).getTime()) < 2000)
            );
            if (exists) return prev;
            return [...prev, data.message];
          });
          setTimeout(scrollToBottom, 100);
        } else if (data.type === 'reaction') {
          const { message_id, emoji, sender: reactionSender } = data;
          if (!message_id || !emoji || !reactionSender) return;
          setMessages(prev => prev.map(m => {
            if (m.id !== message_id) return m;
            const reactions = { ...(m.reactions || {}) };
            if (!reactions[emoji]) reactions[emoji] = [];
            if (reactions[emoji].includes(reactionSender)) {
              reactions[emoji] = reactions[emoji].filter((s: string) => s !== reactionSender);
            } else {
              reactions[emoji] = [...reactions[emoji], reactionSender];
            }
            if (reactions[emoji].length === 0) delete reactions[emoji];
            return { ...m, reactions };
          }));
        } else if (data.type === 'system') {
          setMessages(prev => [...prev, {
            id: `system_${Date.now()}`, room: roomId, sender: null,
            message_type: 'system', content: data.content, reactions: {}, created_at: new Date().toISOString(),
          } as ChatMessage]);
        }
      } catch { }
    };

    ws.onclose = () => {
      setConnecting(false);
      reconnectTimeoutRef.current = setTimeout(() => {
        if (activeRoomRef.current?.room_id === roomId) connectWebSocket(roomId);
      }, 3000);
    };
    ws.onerror = () => ws.close();
  }, [token]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  // ============================================================
  // ROOM ACTIONS
  // ============================================================
  const openRoom = async (room: ChatRoom) => {
    setActiveRoom(room);
    activeRoomRef.current = room;
    setConnecting(true);
    setShowMobileSidebar(false);
    connectWebSocket(room.room_id);
    try {
      const res = await api.get(`/mesh/rooms/${room.id}/`);
      setMessages(res.data.messages || []);
      setTimeout(scrollToBottom, 200);
    } catch (err) {
      setMessages([]);
    }
  };
  const createRoom = async (username: string) => {
    // Instead of creating room directly, send a request
    try {
      await api.post('/mesh/requests/', { username, message: '👋 Hi! Would you like to connect on WaveMesh?' });
      toast.success(`📩 Request sent to @${username}! They must accept to start chatting.`);
      fetchRequests(); // Refresh requests list
    } catch (err: any) {
      // If request already exists, try to open existing room
      if (err.response?.status === 400 || err.response?.data?.error?.includes('already')) {
        toast('Request already sent or room exists. Check your chats.');
      } else {
        toast.error(err.response?.data?.error || 'Failed to send request');
      }
    }
  };
  const leaveRoom = async (roomId: string) => {
    try {
      await api.post(`/mesh/rooms/${roomId}/leave/`);
      setRooms(prev => prev.filter(r => r.id !== roomId));
      if (activeRoom?.id === roomId) {
        setActiveRoom(null);
        setMessages([]);
        wsRef.current?.close();
        setShowMobileSidebar(true);
      }
    } catch { }
  };

  // ============================================================
  // MESSAGE ACTIONS
  // ============================================================
  const sendMessage = async () => {
    if (!input.trim() || !activeRoom) return;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const msg: ChatMessage = {
      id: tempId, content: input, message_type: 'text',
      sender: { id: user?.id || '', username: myUsername, avatar_url: myAvatar },
      created_at: new Date().toISOString(), reactions: {},
      room: activeRoom.room_id,
    };

    setMessages(prev => [...prev, msg]);
    setInput('');
    setJustSent(true);
    setTimeout(() => setJustSent(false), 1000);
    inputRef.current?.focus();

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat_message', room_id: activeRoom.room_id, message: msg, sender: myUsername }));
    }

    api.post(`/mesh/rooms/${activeRoom.id}/send_message/`, { content: input, message_type: 'text' }).catch(() => { });
  };

  const sendFile = async (file: File) => {
    if (!activeRoom) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const isImage = file.type.startsWith('image/');
      const fileData = reader.result as string;
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const msg: ChatMessage = {
        id: tempId,
        content: isImage ? '📷 Image' : `📎 ${file.name}`,
        message_type: isImage ? 'image' : 'file',
        file_url: fileData, file_name: file.name,
        sender: { id: user?.id || '', username: myUsername, avatar_url: myAvatar },
        created_at: new Date().toISOString(), reactions: {},
        room: activeRoom.room_id,
      };

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'chat_message', room_id: activeRoom.room_id, message: msg, sender: myUsername }));
      }
      api.post(`/mesh/rooms/${activeRoom.id}/send_message/`, {
        content: msg.content, message_type: msg.message_type, file_url: fileData, file_name: file.name
      }).catch(() => { });

      setMessages(prev => [...prev, msg]);
      setTimeout(scrollToBottom, 100);
    };
    reader.readAsDataURL(file);
  };

  // ============================================================
  // REACTION — FIXED: Toggle on/off, persists, no disappearing
  // ============================================================
  const sendReaction = (messageId: string, emoji: string) => {
    if (!activeRoom) return;

    // Update locally immediately (optimistic toggle)
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const reactions = { ...(m.reactions || {}) };
      if (!reactions[emoji]) reactions[emoji] = [];
      if (reactions[emoji].includes(myUsername)) {
        reactions[emoji] = reactions[emoji].filter((s: string) => s !== myUsername);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...reactions[emoji], myUsername];
      }
      return { ...m, reactions };
    }));

    // Send via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'reaction',
        room_id: activeRoom.room_id,
        message_id: messageId,
        emoji,
        sender: myUsername
      }));
    }
    setReactionPicker(null);
  };

  // ============================================================
  // REQUEST ACTIONS
  // ============================================================
  const sendRequest = async (username: string) => {
    try {
      await api.post('/mesh/requests/', { username, message: '👋 Hi! Would you like to connect on WaveMesh?' });
      toast.success(`Request sent to @${username}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send request');
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      const res = await api.post(`/mesh/requests/${requestId}/accept/`);
      setRequests(prev => prev.filter(r => r.id !== requestId));
      setRooms(prev => [res.data.room, ...prev]);
      toast.success('🎉 Connected!');
    } catch (err) { toast.error('Failed to accept'); }
  };

  const declineRequest = async (requestId: string) => {
    try {
      await api.post(`/mesh/requests/${requestId}/decline/`);
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch { }
  };

  // ============================================================
  // UTILS
  // ============================================================
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const searchUsers = (query: string) => {
    setSearchQuery(query);
    setSearchResults(query.length >= 2 ? peers.filter(p => p.username.toLowerCase().includes(query.toLowerCase())) : []);
  };

  const copyInviteCode = () => {
    if (activeRoom?.invite_code) {
      navigator.clipboard.writeText(activeRoom.invite_code);
      toast.success('📋 Invite code copied!');
    }
  };

  const inviteToRoom = async () => {
    if (!activeRoom || !inviteUsername.trim()) return;
    try {
      await api.post(`/mesh/rooms/${activeRoom.id}/invite/`, { username: inviteUsername });
      toast.success(`@${inviteUsername} invited!`);
      setInviteUsername('');
      setShowInviteModal(false);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to invite'); }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // ============================================================
  // GROUP MESSAGES BY DATE
  // ============================================================
  const groupedMessages = messages.reduce((groups: { date: string; messages: ChatMessage[] }[], msg) => {
    const date = formatDate(msg.created_at);
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
      {/* SIDEBAR */}
      <AnimatePresence>
        {(showMobileSidebar || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full md:w-80 lg:w-96 border-r border-gray-200/50 dark:border-gray-800/50 flex flex-col bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl absolute md:relative z-20 h-full"
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
                  <Zap size={24} className="text-green-500" /> WaveMesh
                </h2>
                <Sparkles size={20} className="text-amber-400 animate-pulse" />
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={e => searchUsers(e.target.value)}
                  placeholder="Search users to connect..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-100/80 dark:bg-gray-800/80 text-sm outline-none focus:ring-2 focus:ring-green-400/50 focus:bg-white dark:focus:bg-gray-700 transition-all placeholder-gray-400"
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 max-h-64 overflow-y-auto">
                    {searchResults.map(peer => (
                      <button
                        key={peer.username}
                        onClick={() => { createRoom(peer.username); setSearchQuery(''); setSearchResults([]); }}
                        className="w-full flex items-center gap-3 p-3.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left"
                      >
                        <Avatar src={peer.avatar_url} name={peer.username} size="sm" isOnline={peer.is_online} />
                        <div>
                          <p className="font-semibold text-sm">@{peer.username}</p>
                          <p className="text-xs text-gray-500">{peer.is_online ? '🟢 Online' : '⚫ Offline'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex mx-4 mt-3 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl p-1">
              {[
                { key: 'rooms', label: 'Chats', icon: MessageCircle },
                { key: 'contacts', label: 'Discover', icon: Users },
                { key: 'requests', label: 'Requests', icon: UserPlus },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as any)}
                  className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 rounded-xl transition-all ${tab === t.key
                    ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  <t.icon size={16} />
                  {t.label}
                  {t.key === 'requests' && requests.length > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{requests.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto mt-2 px-3 pb-3">
              {tab === 'rooms' && (
                <div className="space-y-1">
                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="animate-spin text-green-500" size={32} />
                    </div>
                  ) : rooms.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
                        <MessageCircle size={36} className="text-green-500 opacity-50" />
                      </div>
                      <p className="font-semibold text-gray-500 mb-1">No conversations yet</p>
                      <p className="text-sm text-gray-400">Search for users to start chatting via WaveMesh!</p>
                    </div>
                  ) : (
                    rooms.map(room => (
                      <motion.button
                        key={room.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => openRoom(room)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all text-left ${activeRoom?.id === room.id
                          ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 shadow-sm'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-2 border-transparent'
                          }`}
                      >
                        <Avatar src={room.other_user?.avatar_url} name={room.other_user?.username || room.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm truncate">
                              {room.room_type === 'private' && room.other_user ? `@${room.other_user.username}` : room.name}
                            </p>
                            {room.last_message_at && (
                              <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{formatDate(room.last_message_at)}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-gray-500 truncate">{room.last_message || 'Start chatting...'}</p>
                            {room.unread_count > 0 && (
                              <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold ml-2 flex-shrink-0">
                                {room.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>
              )}

              {tab === 'contacts' && (
                <div className="space-y-1">
                  {peers.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                        <Users size={36} className="text-blue-500 opacity-50" />
                      </div>
                      <p className="font-semibold text-gray-500 mb-1">No users discovered</p>
                      <p className="text-sm text-gray-400">Open another tab and log in to see peers!</p>
                    </div>
                  ) : (
                    peers.map(peer => (
                      <motion.div
                        key={peer.username}
                        whileHover={{ scale: 1.01 }}
                        className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition border-2 border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                      >
                        <Avatar src={peer.avatar_url} name={peer.username} size="md" isOnline={peer.is_online} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">@{peer.username}</p>
                          <p className="text-xs text-gray-500">
                            {peer.is_online ? <span className="text-green-500 font-medium">🟢 Online now</span> : <span>⚫ Offline</span>}
                          </p>
                        </div>
                                              <div className="flex gap-1">
                          <motion.button 
                            whileTap={{ scale: 0.9 }} 
                            onClick={() => createRoom(peer.username)} 
                            className="p-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition shadow-sm" 
                            title="Send chat request"
                          >
                            <UserPlus size={16} />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {tab === 'requests' && (
                <div className="space-y-3">
                  {requests.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 flex items-center justify-center">
                        <UserPlus size={36} className="text-orange-500 opacity-50" />
                      </div>
                      <p className="font-semibold text-gray-500 mb-1">No pending requests</p>
                      <p className="text-sm text-gray-400">When someone wants to connect, it'll appear here</p>
                    </div>
                  ) : (
                    requests.map(req => (
                      <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 border border-orange-100 dark:border-orange-900/30">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar src={req.from_user.avatar_url} name={req.from_user.username} size="md" />
                          <div>
                            <p className="font-semibold text-sm">@{req.from_user.username}</p>
                            <p className="text-xs text-gray-500">{req.message || 'Wants to connect via WaveMesh'}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => acceptRequest(req.id)} className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-semibold hover:from-green-600 hover:to-emerald-600 transition shadow-sm">
                            ✨ Accept
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => declineRequest(req.id)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                            Decline
                          </motion.button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 text-center">
              <p className="text-[10px] text-gray-400">
                🌊 <span className="text-green-500 font-bold">S</span><span className="text-orange-500 font-bold">L</span> WaveMesh · Offline P2P
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col">
        {!activeRoom ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }} className="w-28 h-28 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-green-500/30">
                <Zap size={56} className="text-white" />
              </motion.div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3">Welcome to WaveMesh</h2>
              <p className="text-gray-500 mb-2 text-lg">The world's first <span className="font-semibold text-green-600">offline P2P</span> chat network</p>
              <p className="text-gray-400 text-sm mb-8">Connect directly with anyone nearby — no internet required. Your messages hop through the mesh, encrypted end-to-end.</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setTab('contacts')} className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-semibold shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all">
                  🔍 Discover Peers
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setTab('requests')} className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-semibold border-2 border-gray-200 dark:border-gray-700 hover:border-green-300 transition-all">
                  📩 View Requests {requests.length > 0 && `(${requests.length})`}
                </motion.button>
              </div>
              <div className="mt-8 flex items-center justify-center gap-6 text-xs text-gray-400">
                <span className="flex items-center gap-1"><WifiOff size={12} /> No Internet</span>
                <span className="flex items-center gap-1"><Shield size={12} /> E2E Encrypted</span>
                <span className="flex items-center gap-1"><Zap size={12} /> Instant</span>
              </div>
            </motion.div>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowMobileSidebar(true)} className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
                  <ArrowLeft size={20} />
                </button>
                <Avatar src={activeRoom.other_user?.avatar_url} name={activeRoom.other_user?.username || activeRoom.name} size="md" />
                <div>
                  <h3 className="font-bold text-sm">{activeRoom.room_type === 'private' && activeRoom.other_user ? `@${activeRoom.other_user.username}` : activeRoom.name}</h3>
                  <p className="text-xs text-gray-500">
  {connecting ? 'Connecting...' : (
    <span className="flex items-center gap-1 text-green-600"><Wifi size={12} /> Connected via WaveMesh</span>
  )}
</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {activeRoom.invite_code && (
                  <button onClick={copyInviteCode} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition text-gray-500" title="Copy invite code"><Copy size={18} /></button>
                )}
                <button onClick={() => setShowInviteModal(true)} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition text-gray-500" title="Invite"><UserPlus size={18} /></button>
                <button onClick={() => leaveRoom(activeRoom.id)} className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition text-red-400" title="Leave"><LogOut size={18} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {groupedMessages.map((group) => (
                <div key={group.date}>
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-gray-200/50 dark:bg-gray-800/50 backdrop-blur-sm text-gray-500 text-xs px-4 py-1 rounded-full font-medium">{group.date}</div>
                  </div>
                  {group.messages.map((msg, mi) => {
                    const isMe = msg.sender?.username === myUsername;
                    const isSystem = msg.message_type === 'system';
                    const showAvatar = !isMe && (mi === 0 || group.messages[mi - 1]?.sender?.username !== msg.sender?.username);
                    const isConsecutive = mi > 0 && group.messages[mi - 1]?.sender?.username === msg.sender?.username && !isSystem;
                    const hasReactions = Object.keys(msg.reactions || {}).length > 0;

                    if (isSystem) return <div key={msg.id} className="flex justify-center mb-2"><span className="text-xs text-gray-400 italic">{msg.content}</span></div>;

                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex items-end gap-2 mb-1 ${isMe ? 'justify-end' : 'justify-start'} ${isConsecutive ? 'mt-0.5' : 'mt-3'}`}>
                        {!isMe && showAvatar && <Avatar src={msg.sender?.avatar_url} name={msg.sender?.username || '?'} size="sm" />}
                        {!isMe && !showAvatar && <div className="w-8 flex-shrink-0" />}
                        <div className={`group relative max-w-[75%] ${isMe ? 'order-1' : ''}`}>
                          {!isMe && showAvatar && <p className="text-[11px] font-semibold text-gray-500 mb-1 ml-1">@{msg.sender?.username}</p>}
                          <div className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-br-lg shadow-md shadow-green-500/20' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-lg shadow-sm border border-gray-100 dark:border-gray-700'}`}>
                            {msg.message_type === 'image' && msg.file_url ? (
                              <div><img src={msg.file_url} alt="Shared" className="max-w-full rounded-xl max-h-64 object-cover cursor-pointer hover:opacity-90 transition" />{msg.file_name && <p className="text-xs opacity-70 mt-1">{msg.file_name}</p>}</div>
                            ) : msg.message_type === 'file' ? (
                              <div className="flex items-center gap-2"><File size={16} /><span className="underline cursor-pointer">{msg.file_name}</span></div>
                            ) : <span>{msg.content}</span>}
                          </div>
                          {hasReactions && (
                            <div className={`flex items-center gap-0.5 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              {Object.entries(msg.reactions).map(([emoji, users]) => (
                                <motion.button key={emoji} whileTap={{ scale: 1.3 }} onClick={() => sendReaction(msg.id, emoji)} className={`text-xs px-2 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all ${users.includes(myUsername) ? 'ring-2 ring-green-300 dark:ring-green-600' : ''}`}>
                                  {emoji} <span className="font-semibold text-gray-500">{users.length}</span>
                                </motion.button>
                              ))}
                            </div>
                          )}
                          <p className={`text-[10px] text-gray-400 mt-0.5 ${isMe ? 'text-right mr-1' : 'text-left ml-1'}`}>{formatTime(msg.created_at)}</p>
                          <div className={`absolute ${isMe ? '-left-2 -translate-x-full' : '-right-2 translate-x-full'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                            <button onClick={() => setReactionPicker(reactionPicker === msg.id ? null : msg.id)} className="p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-110 transition">
                              <Smile size={14} className="text-gray-500" />
                            </button>
                            {reactionPicker === msg.id && (
                              <div className="absolute top-0 left-full ml-1 flex gap-0.5 bg-white dark:bg-gray-800 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 p-1.5">
                                {QUICK_REACTIONS.map(emoji => (
                                  <button key={emoji} onClick={() => sendReaction(msg.id, emoji)} className="p-1 hover:scale-125 transition-transform text-lg">{emoji}</button>
                                ))}
                              </div>
                            )}
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
                <input type="file" ref={fileInputRef} className="hidden" onChange={e => { if (e.target.files?.[0]) sendFile(e.target.files[0]); }} />
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 transition-all">
                  <Smile size={20} />
                </motion.button>
             
<motion.button whileTap={{ scale: 0.9 }} onClick={() => fileInputRef.current?.click()} className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 transition-all">
  <Paperclip size={20} />
</motion.button>
                <div className="flex-1 relative">
                  <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Message via WaveMesh..." className="w-full px-5 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-green-400/50 focus:bg-white dark:focus:bg-gray-700 transition-all placeholder-gray-400" />
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-3 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 z-50 w-72">
                      <div className="grid grid-cols-8 gap-1.5">
                        {['😀','😂','🥰','😍','🤩','😎','🥳','😤','😢','😭','😡','🤬','👍','👎','👏','🙌','💪','🔥','❤️','💔','🎉','✨','🌟','💯','🙏','🤝','👋','🫶','💰','📸','🎵','🌈','🍕','☕','🎂','🏆','⚽','🎮','🚀','💻'].map(emoji => (
                          <button key={emoji} onClick={() => { setInput(prev => prev + emoji); setShowEmojiPicker(false); inputRef.current?.focus(); }} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-lg transition transform hover:scale-125">{emoji}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
               
             

                            <motion.button whileTap={{ scale: 0.9 }} onClick={sendMessage} disabled={!input.trim()} className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl hover:from-green-600 hover:to-emerald-600 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-green-500/25">
           
                  {justSent ? (
  <Check size={20} className="text-white" />
) : (
  <Send size={20} />
)}
                </motion.button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Invite Modal */}
                 
     
      <AnimatePresence>
        {showInviteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowInviteModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-4">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center"><UserPlus size={28} className="text-white" /></div>
                <h3 className="font-bold text-xl">Invite to WaveMesh</h3>
                <p className="text-sm text-gray-500">Add someone to this conversation</p>
              </div>
              <input value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} placeholder="Enter username..." className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none focus:border-purple-400 mb-4 transition" autoFocus />
              <div className="flex gap-2">
                <button onClick={inviteToRoom} className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-pink-600 transition shadow-lg shadow-purple-500/25">✨ Invite</button>
                <button onClick={() => setShowInviteModal(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-2xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

