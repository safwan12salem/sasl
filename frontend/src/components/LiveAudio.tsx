/**
 * Sasl - Live Audio – Clubhouse-style rooms with reactions, speaker requests, trending topics
 */
import AdBanner from './AdBanner';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Mic, MicOff, Users, Hand, Plus, Phone, Loader2, AlertCircle,
  Volume2, Smile, TrendingUp, Radio, Zap, Crown,
  UserPlus, Globe, Lock, Sparkles, X, Send, MessageCircle,ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import PaymentModal from './PaymentModal';
import { uploadFile } from '../services/uploadService';


interface AudioRoom {
  id: string;
  host: { username: string; avatar_url?: string };
  title: string;
  description?: string;
  is_live: boolean;
  is_public: boolean;
  current_listeners: number;
  max_listeners: number;
  speakers: Speaker[];
  listeners_count: number;
  topics?: string;
  created_at: string;
  price?: string;
    background_url?: string;
}

interface Speaker {
  id: string;
  user: { username: string; avatar_url?: string };
  is_muted: boolean;
}

const REACTIONS = ['👏', '🔥', '❤️', '😂', '💯', '🎉', '🙌', '👀'];

export default function LiveAudio() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [rooms, setRooms] = useState<AudioRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [roomTitle, setRoomTitle] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [roomTopics, setRoomTopics] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [maxListeners, setMaxListeners] = useState('100');
const [bgImage, setBgImage] = useState<File | null>(null);
const [bgImageUrl, setBgImageUrl] = useState('');

  const [inRoom, setInRoom] = useState<string | null>(null);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [listenerCount, setListenerCount] = useState(0);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
const wsRef = useRef<WebSocket | null>(null);
const [showChat, setShowChat] = useState(false);
const [chatMessages, setChatMessages] = useState<any[]>([]);
const [chatInput, setChatInput] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');

  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeTopic) params.set('topic', activeTopic);
      const res = await api.get(`/liveaudio/rooms/?${params.toString()}`);
      setRooms(res.data.results || res.data || []);
    } catch (err) {
      setError(t('failed_to_load_rooms'));
    } finally {
      setLoading(false);
    }
  }, [activeTopic]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const createRoom = async () => {
    if (!roomTitle.trim()) return toast.error(t('enter_room_title'));
    try {
      await api.post('/liveaudio/rooms/', {
        title: roomTitle, description: roomDesc, topics: roomTopics,
        is_public: isPublic, max_listeners: parseInt(maxListeners),
      });
      toast.success(t('room_created'));
      setShowCreate(false);
      setRoomTitle(''); setRoomDesc(''); setRoomTopics('');
      setIsPublic(true); setMaxListeners('100');
      fetchRooms();
    } catch { toast.error(t('failed_to_create_room')); }
  };

  const joinRoom = async (roomId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      stream.getAudioTracks()[0].enabled = !isMuted;
      await api.post(`/liveaudio/rooms/${roomId}/join/`);
      setInRoom(roomId);
      // Connect WebRTC for real audio (August backend: WebSocket signaling)

            // Connect WebSocket for signaling
          const token = localStorage.getItem('sasl_token');
      const wsUrl = `wss://sasl-api-i34r.onrender.com/ws/audio/${roomId}/?token=${token}`;
      wsRef.current = new WebSocket(wsUrl);
      
      pcRef.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'turn:global.relay.metered.ca:80', username: '9a949126f260451ca16f969e', credential: 'HNHbY2NEDOgMoMfd' },
        ]
      });
      
      stream.getAudioTracks().forEach(track => pcRef.current!.addTrack(track, stream));
      
      pcRef.current!.ontrack = (event) => {
        const remoteAudio = new Audio();
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.play().catch(() => {});
      };
      
      wsRef.current.onopen = async () => {
        const offer = await pcRef.current!.createOffer();
        await pcRef.current!.setLocalDescription(offer);
        wsRef.current!.send(JSON.stringify({ type: 'offer', offer: pcRef.current!.localDescription }));
      };
      
      wsRef.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'answer') {
          await pcRef.current!.setRemoteDescription(new RTCSessionDescription(data.answer));
        } else if (data.type === 'offer') {
          await pcRef.current!.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pcRef.current!.createAnswer();
          await pcRef.current!.setLocalDescription(answer);
          wsRef.current!.send(JSON.stringify({ type: 'answer', answer: pcRef.current!.localDescription }));
        } else if (data.type === 'candidate') {
          await pcRef.current!.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
        if (data.type === 'chat') {
    setChatMessages(prev => [...prev, { username: data.username, message: data.message, isMe: data.username === user?.username }]);
} else if (data.type === 'speak_request') {
    toast(`${data.username} wants to speak!`, { icon: '🎤' });
} else if (data.type === 'user_joined') {
    setListenerCount(prev => prev + 1);
    toast(`${data.username} joined`, { icon: '👋' });
} else if (data.type === 'user_left') {
    setListenerCount(prev => Math.max(0, prev - 1));
}
      };
      
      pcRef.current!.onicecandidate = (event) => {
        if (event.candidate) {
          wsRef.current!.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
        }
      };


      const foundRoom = rooms.find(r => r.id === roomId);
      if (foundRoom) {
        setListenerCount(foundRoom.current_listeners + 1);
        setSpeakers(foundRoom.speakers || []);
      }
      fetchRooms();
      toast.success(t('Joined room! 🎉'));
    } catch { toast.error(t('Microphone access needed')); }
  };

  const leaveRoom = async (roomId: string) => {
    try { await api.post(`/liveaudio/rooms/${roomId}/leave/`); } catch {}
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
        pcRef.current?.close();
    pcRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    setInRoom(null);
    setIsSpeaker(false);
    setHandRaised(false);
    setSpeakers([]);
    setListenerCount(0);
    fetchRooms();
  
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      }
    }
  };

  const raiseHand = async () => {
    if (!inRoom) return;
    try {
      const res = await api.post(`/liveaudio/rooms/${inRoom}/raise_hand/`);
      setHandRaised(res.data.status === 'hand_raised');
    } catch {}
  };

  const inviteSpeaker = async () => {
    if (!inviteUsername.trim() || !inRoom) return;
    try {
      await api.post(`/liveaudio/rooms/${inRoom}/invite_speaker/`, { username: inviteUsername });
      toast.success(t('speaker_invited'));
      setInviteUsername(''); setShowInvite(false);
    } catch {}
  };

  const sendReaction = async (emoji: string) => {
    if (!inRoom) return;
    try { await api.post(`/liveaudio/rooms/${inRoom}/react/`, { reaction: emoji }); } catch {}
    const id = Date.now();
    setFloatingReactions(prev => [...prev, { id, emoji, x: Math.random() * 80 + 10 }]);
    setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== id)), 3000);
  };

const sendChat = () => {
    if (!chatInput.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: 'chat', message: chatInput, timestamp: Date.now() }));
    setChatMessages(prev => [...prev, { username: 'You', message: chatInput, isMe: true }]);
    setChatInput('');
};

const requestSpeak = () => {
    if (!wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: 'request_speak' }));
    toast.success('Requested to speak!');
};

  const endRoom = async (roomId: string) => {
    try { await api.post(`/liveaudio/rooms/${roomId}/end_room/`); toast.success(t('room_ended')); fetchRooms(); } catch {}
  };

  const removeSpeaker = async (username: string) => {
    if (!inRoom) return;
    try {
      await api.post(`/liveaudio/rooms/${inRoom}/remove_speaker/`, { username });
      toast.success(t('speaker_removed'));
      setSpeakers(prev => prev.filter(s => s.user.username !== username));
    } catch { toast.error(t('failed_to_remove_speaker')); }
  };

  const tipHost = async (roomId: string) => {
    const amount = prompt('Enter tip amount ($):', '5');
    if (amount && parseFloat(amount) > 0) {
      setPaymentAmount(parseFloat(amount));
      setShowPayment(true);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
     
      {/* Floating Reactions */}
      <div className="fixed bottom-24 left-0 right-0 pointer-events-none z-40 flex justify-center">
        <AnimatePresence>
          {floatingReactions.map(r => (
            <motion.div key={r.id} initial={{ opacity: 1, y: 0, scale: 1 }} animate={{ opacity: 0, y: -120, scale: 1.5 }}
              exit={{ opacity: 0 }} transition={{ duration: 2 }}
              className="absolute text-4xl" style={{ left: `${r.x}%` }}>
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

           {/* In-Room UI — Full-Screen Immersive Room */}
      <AnimatePresence>
        {inRoom && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col"
          >
            {/* Room Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => leaveRoom(inRoom)} 
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
                >
                  <Phone size={18} className="rotate-[135deg]" />
                </button>
                <div>
                  <h3 className="text-white font-bold text-lg">
                    {rooms.find(r => r.id === inRoom)?.title || 'Live Audio'}
                  </h3>
                  <p className="text-purple-300 text-xs flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    {listenerCount} {t('listening')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowInvite(true)} 
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
              >
                <UserPlus size={18} />
              </button>
            </div>

            {/* Speaker Stage */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
              {/* Main Speaker (Host) */}
              {speakers.length > 0 && (
                <motion.div 
                  animate={{ scale: [1, 1.02, 1] }} 
                  transition={{ duration: 3, repeat: Infinity }}
                  className="relative mb-8"
                >
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-1 shadow-2xl shadow-purple-500/30">
                    <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-white text-3xl font-bold border-4 border-purple-400/50">
                      {speakers[0].user.username[0]?.toUpperCase()}
                      <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-gray-900" />
                    </div>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                    <Crown size={10} /> @{speakers[0].user.username}
                  </div>
                  {speakers[0].is_muted && (
                    <div className="absolute top-0 right-0 bg-red-500 rounded-full p-1.5 shadow-lg">
                      <MicOff size={14} className="text-white" />
                    </div>
                  )}
                </motion.div>
              )}

              {/* Other Speakers Grid */}
              {speakers.length > 1 && (
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  {speakers.slice(1, 6).map((s, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ delay: i * 0.1 }}
                      className="relative"
                    >
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 p-0.5 shadow-lg">
                        <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-white text-xl font-bold border-2 border-blue-400/30">
                          {s.user.username[0]?.toUpperCase()}
                        </div>
                      </div>
                      <p className="text-white/70 text-xs text-center mt-1">@{s.user.username}</p>
{rooms.find(r => r.id === inRoom)?.host.username === user?.username && s.user.username !== user?.username && (
  <button onClick={() => removeSpeaker(s.user.username)} 
    className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white hover:bg-red-600 transition">
    <X size={10} />
  </button>
)}
                      {s.is_muted && (
                        <div className="absolute top-0 right-0 bg-red-500 rounded-full p-1">
                          <MicOff size={10} className="text-white" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}

              {/* No Speakers Yet */}
              {speakers.length === 0 && (
                <motion.div 
                  animate={{ y: [0, -8, 0] }} 
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-center mb-8"
                >
                  <div className="w-24 h-24 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <Mic size={40} className="text-purple-400" />
                  </div>
                  <p className="text-white/60 text-lg">{t('waiting_for_speakers')}</p>
                  <p className="text-white/40 text-sm mt-1">{t('raise_your_hand_to_speak')}</p>
                </motion.div>
              )}

              {/* Listener Count */}
              <div className="flex items-center gap-2 text-white/40 mb-6">
                <Users size={16} />
                <span className="text-sm">{listenerCount} {t('people_here')}</span>
                {handRaised && (
                  <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Hand size={10} /> {t('hand_raised')}
                  </span>
                )}
              </div>

              {/* Floating Reactions in Room */}
              <div className="absolute top-1/2 left-0 right-0 pointer-events-none">
                <AnimatePresence>
                  {floatingReactions.map(r => (
                    <motion.div 
                      key={r.id} 
                      initial={{ opacity: 1, y: 0, scale: 1 }} 
                      animate={{ opacity: 0, y: -200, scale: 2 }} 
                      exit={{ opacity: 0 }} 
                      transition={{ duration: 2.5 }}
                      className="absolute text-5xl" 
                      style={{ left: `${r.x}%` }}
                    >
                      {r.emoji}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="px-4 py-4 border-t border-white/10 bg-black/20 backdrop-blur-xl">
              {/* Reactions Quick Bar */}
              <div className="flex justify-center gap-3 mb-4">
                {REACTIONS.map(emoji => (
                  <motion.button 
                    key={emoji} 
                    whileTap={{ scale: 1.4 }} 
                    onClick={() => sendReaction(emoji)}
                    className="text-2xl hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-4">
                {/* Mute/Unmute */}
                <motion.button 
                  whileTap={{ scale: 0.9 }} 
                  onClick={toggleMute} 
                  className={`p-4 rounded-full transition-all shadow-lg ${
                    isMuted 
                      ? 'bg-red-500 text-white shadow-red-500/30' 
                      : 'bg-green-500 text-white shadow-green-500/30'
                  }`}
                >
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </motion.button>

                {/* Raise Hand */}
                {!isSpeaker && (
                  <motion.button 
                    whileTap={{ scale: 0.9 }} 
                    onClick={raiseHand} 
                    className={`p-4 rounded-full transition-all shadow-lg ${
                      handRaised 
                        ? 'bg-yellow-500 text-white shadow-yellow-500/30' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <Hand size={24} />
                  </motion.button>
                )}
                 
                                 {/* Request Speak */}
                {!isSpeaker && (
                  <motion.button 
                    whileTap={{ scale: 0.9 }} 
                    onClick={requestSpeak} 
                    className="p-4 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition"
                  >
                    <Volume2 size={24} />
                  </motion.button>
                )}
                    
                                {/* Chat Panel */}
            {showChat && (
              <div className="absolute right-0 top-0 bottom-0 w-72 bg-gray-900/95 backdrop-blur-xl border-l border-white/10 flex flex-col z-10">
                <div className="p-3 border-b border-white/10 flex justify-between items-center">
                  <span className="text-white font-bold text-sm">💬 Chat</span>
                  <button onClick={() => setShowChat(false)} className="text-white/60 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {chatMessages.length === 0 && (
                    <p className="text-gray-500 text-xs text-center mt-10">No messages yet</p>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`text-sm ${m.isMe ? 'text-right' : ''}`}>
                      <span className="text-purple-400 text-xs font-semibold">{m.isMe ? '' : `@${m.username}`}</span>
                      <p className={`inline-block px-3 py-1.5 rounded-xl text-xs ${m.isMe ? 'bg-purple-500 text-white' : 'bg-white/10 text-white'}`}>{m.message}</p>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t border-white/10 flex gap-2">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Message..." className="flex-1 bg-white/10 rounded-full px-3 py-1.5 text-xs text-white outline-none" />
                  <button onClick={sendChat} className="bg-purple-500 text-white p-1.5 rounded-full"><Send size={14} /></button>
                </div>
              </div>
            )}
                {/* Chat Toggle */}
                <motion.button 
                  whileTap={{ scale: 0.9 }} 
                  onClick={() => setShowChat(!showChat)} 
                  className={`p-4 rounded-full transition-all shadow-lg ${showChat ? 'bg-purple-500 text-white shadow-purple-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  <MessageCircle size={24} />
                </motion.button>
                {/* Leave */}
                <motion.button 
                  whileTap={{ scale: 0.9 }} 
                  onClick={() => leaveRoom(inRoom)} 
                  className="p-4 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600 transition"
                >
                  <Phone size={24} className="rotate-[135deg]" />
                </motion.button>
              </div>

              {/* Mute Status */}
              <p className="text-center text-white/40 text-xs mt-3">
                {isMuted ? t('you_are_muted') : t('you_are_speaking')}
                {handRaised && ` · ${t('hand_raised_waiting')}`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold gradient-text flex items-center gap-2">
            <Radio className="text-purple-500" /> {t('live_audio')}
          </h2>
          <p className="text-gray-500 text-sm mt-1">{t('join_conversations_share_ideas_connect_with_voices')}</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> {showCreate ? t('cancel') : t('host_room')}
        </button>
      </div>

      {/* Create Room Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="glass-card p-6 rounded-2xl mb-6 space-y-3 border-2 border-purple-200">
            <h3 className="font-bold text-lg flex items-center gap-2"><Sparkles size={18} className="text-purple-500" /> {t('host_audio_room')}</h3>
            <input className="input-field" placeholder="Room title *" value={roomTitle} onChange={e => setRoomTitle(e.target.value)} />
            <textarea className="input-field" placeholder="Description..." value={roomDesc} onChange={e => setRoomDesc(e.target.value)} rows={2} />
            <input className="input-field" placeholder="Topics (comma separated)" value={roomTopics} onChange={e => setRoomTopics(e.target.value)} />
            <div className="flex gap-3 items-center">
                          <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-500 hover:text-gray-700">
              <ImageIcon size={16} />
              {bgImage ? bgImage.name : 'Room background (optional)'}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBgImage(file);
                const url = await uploadFile(file, 'liveaudio');
                if (url) setBgImageUrl(url);
              }} />
            </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="rounded" />
                {isPublic ? <Globe size={14} /> : <Lock size={14} />}{t(' Public')}
              </label>
              <input className="input-field w-24 text-sm" type="number" placeholder="Max" value={maxListeners} onChange={e => setMaxListeners(e.target.value)} />
            </div>
            <button onClick={createRoom} className="btn-primary w-full">{t('🎙️ Start Room')}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Topic Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        <button onClick={() => setActiveTopic('')} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${!activeTopic ? 'bg-purple-500 text-white shadow-lg shadow-purple-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          {t('all')}
        </button>
        {['Tech', 'Music', 'Business', 'Health', 'Education', 'Entertainment', 'Sports'].map(topic => (
          <button key={topic} onClick={() => setActiveTopic(topic)} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${activeTopic === topic ? 'bg-purple-500 text-white shadow-lg shadow-purple-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {topic}
          </button>
        ))}
      </div>
{/* Tab Switcher */}
<div className="flex gap-2 mb-4">
  <button onClick={() => { setActiveTopic(''); fetchRooms(); }} 
    className={`px-4 py-2 rounded-full text-sm font-semibold transition ${!activeTopic ? 'bg-purple-500 text-white' : 'bg-gray-100'}`}>
    🔴 Live
  </button>
  <button onClick={async () => {
    try { const res = await api.get('/liveaudio/rooms/my_rooms/'); setRooms(res.data || []); } catch {}
  }} className="px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 hover:bg-gray-200 transition">
    📻 My Rooms
  </button>
  <button onClick={async () => {
    try { const res = await api.get('/liveaudio/rooms/trending/'); setRooms(res.data || []); } catch {}
  }} className="px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 hover:bg-gray-200 transition">
    🔥 Trending
  </button>
</div>

      {/* Rooms List */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-500" size={48} /></div>
      ) : error ? (
        <div className="glass-card p-12 rounded-2xl text-center">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={48} />
          <p>{error}</p>
          <button onClick={fetchRooms} className="btn-primary mt-4">{t('retry')}</button>
        </div>
      ) : rooms.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center">
          <Radio size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-xl text-gray-500">{t('no_live_rooms')}</p>
          <p className="text-sm text-gray-400">{t('be_the_first_to_host_one')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map(room => (
                       <motion.div key={room.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              className="glass-card rounded-2xl p-5 transition relative overflow-hidden"
              style={room.background_url ? { backgroundImage: `url(${room.background_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
              {room.background_url && <div className="absolute inset-0 bg-black/50" />}
              <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative flex-shrink-0">
                    {room.host.avatar_url ? (
                      <img src={room.host.avatar_url} className="w-12 h-12 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                        {room.host.username[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-lg">{room.title}</h3>
                    <p className="text-sm text-gray-500">{t('hosted_by')} @{room.host.username}</p>
                    {room.description && <p className="text-xs text-gray-400 mt-0.5 break-words">{room.description}</p>}
                    {room.price && <span className="inline-block mt-1 text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">💰 {room.price}</span>}
                  </div>
                </div>
                                                              <div className="flex flex-col gap-2 flex-shrink-0 w-full sm:w-auto">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 text-purple-600 text-xs">
                      <Users size={14} /><span className="font-bold">{room.current_listeners}</span>
                      <span className="text-xs text-gray-500">{t('listening')}</span>
                    </div>
                    <span className="text-yellow-500 text-xs font-semibold flex items-center gap-1"><Zap size={12} /> Live</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setShowInvite(true)} className="btn-primary text-xs flex items-center gap-1 px-2 py-1"><UserPlus size={12} /> {t('invite')}</button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => {
                      if (room.price) { setPaymentAmount(parseFloat(room.price)); setShowPayment(true); }
                      else { joinRoom(room.id); }
                    }} className="btn-primary text-xs px-3 py-1 min-w-[50px] text-center">{room.price ? `$${room.price}` : t('join')}</motion.button>
                    <button onClick={(e) => { e.stopPropagation(); tipHost(room.id); }} 
  className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-semibold hover:bg-yellow-200 transition">
  💰 Tip
</button>
                  </div>
                  {room.host.username === user?.username && (
                    <button onClick={() => endRoom(room.id)} className="text-red-500 text-xs hover:underline px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition self-end">{t('end')}</button>
                  )}
                </div>                             
              </div>
              {room.topics && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {room.topics.split(',').map((topic, i) => (
                    <span key={i} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{topic.trim()}</span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      <AnimatePresence>
        {showInvite && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-xl mb-4">{t('Invite to Room')}</h3>
              <input className="input-field mb-4" placeholder="Enter username..." value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && inviteSpeaker()} />
              <div className="flex gap-2">
                <button onClick={inviteSpeaker} className="btn-primary flex-1">{t('Invite')}</button>
                <button onClick={() => setShowInvite(false)} className="btn-ghost">{t('Cancel')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal amount={paymentAmount} type="room"
          onSuccess={() => { setShowPayment(false); fetchRooms(); toast.success('Payment successful!'); }}
          onClose={() => setShowPayment(false)} />
      )}

    </div>
  );
}
