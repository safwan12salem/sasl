/**
 * Sasl - Social Asynchronous Sharing Layer
 * Live Audio – Clubhouse-style rooms with reactions, speaker requests, trending topics
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Mic, MicOff, Users, Hand, Plus, Phone, Loader2, AlertCircle,
  Volume2, VolumeX, Star, MessageCircle, Send, Smile,
  TrendingUp, Clock, Radio, Zap, Crown, MoreHorizontal,
  UserPlus, UserMinus, Globe, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

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
}

interface Speaker {
  id: string;
  user: { username: string; avatar_url?: string };
  is_muted: boolean;
}

interface Reaction {
  id: string;
  user: { username: string };
  reaction: string;
  created_at: string;
}

const REACTIONS = ['👏', '🔥', '❤️', '😂', '💯', '🎉', '🙌', '👀'];

export default function LiveAudio() {
  const { user } = useAuth();
  const { t } = useTranslation();

  // Rooms
  const [rooms, setRooms] = useState<AudioRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState('');

  // Create room
  const [showCreate, setShowCreate] = useState(false);
  const [roomTitle, setRoomTitle] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [roomTopics, setRoomTopics] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [maxListeners, setMaxListeners] = useState('100');

  // In-room state
  const [inRoom, setInRoom] = useState<string | null>(null);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [listenerCount, setListenerCount] = useState(0);

  // Audio
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Reactions
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showReactions, setShowReactions] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string; x: number }[]>([]);

  // Chat
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<{ user: string; text: string }[]>([]);

  // Invite
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  
  // ============================================================
  // FETCH
  // ============================================================
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

  // ============================================================
  // ACTIONS
  // ============================================================
  const createRoom = async () => {
    if (!roomTitle.trim()) return toast.error(t('enter_room_title'));
    try {
      await api.post('/liveaudio/rooms/', {
        title: roomTitle,
        description: roomDesc,
        topics: roomTopics,
        is_public: isPublic,
        max_listeners: parseInt(maxListeners),
      });
      toast.success(t('room_created'));
      resetCreateForm();
      fetchRooms();
    } catch (err: any) {
      toast.error(t('failed_to_create_room'));
    }
  };

  const joinRoom = async (roomId: string, asSpeaker: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      stream.getAudioTracks()[0].enabled = !isMuted;

      await api.post(`/liveaudio/rooms/${roomId}/join/`);
      setInRoom(roomId);
      setIsSpeaker(asSpeaker);
      
      if (asSpeaker) {
        // Would set up WebRTC connections to other speakers
      }

      fetchRooms();
      toast.success(t('Joined room! 🎉'));
    } catch (err) {
      toast.error(t('Microphone access needed'));
    }
  };

  const leaveRoom = async (roomId: string) => {
    try {
      await api.post(`/liveaudio/rooms/${roomId}/leave/`);
    } catch {}
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setInRoom(null);
    setIsSpeaker(false);
    setHandRaised(false);
    setSpeakers([]);
    fetchRooms();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  const raiseHand = async () => {
    if (!inRoom) return;
    try {
      const res = await api.post(`/liveaudio/rooms/${inRoom}/raise_hand/`);
      setHandRaised(res.data.status === 'hand_raised');
      toast(res.data.status === 'hand_raised' ? t('hand_raised') : t('hand_lowered'));
    } catch {}
  };

  const inviteSpeaker = async () => {
    if (!inviteUsername.trim() || !inRoom) return;
    try {
      await api.post(`/liveaudio/rooms/${inRoom}/invite_speaker/`, { username: inviteUsername });
      toast.success(t('speaker_invited'));
      setInviteUsername('');
      setShowInvite(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('failed_to_invite'));
    }
  };
 // eslint-disable-next-line @typescript-eslint/no-unused-vars  
  const removeSpeaker = async (username: string) => {
    if (!inRoom) return;
    try {
      await api.post(`/liveaudio/rooms/${inRoom}/remove_speaker/`, { username });
      toast.success(t('speaker_removed'));
    } catch {}
  };

  const sendReaction = async (emoji: string) => {
    if (!inRoom) return;
    try {
      await api.post(`/liveaudio/rooms/${inRoom}/react/`, { reaction: emoji });
      // Add floating reaction animation
      const id = Date.now();
      setFloatingReactions(prev => [...prev, { id, emoji, x: Math.random() * 80 + 10 }]);
      setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== id)), 3000);
    } catch {}
  };

  const endRoom = async (roomId: string) => {
    try {
      await api.post(`/liveaudio/rooms/${roomId}/end_room/`);
      toast.success(t('room_ended'));
      fetchRooms();
    } catch {}
  };

  const resetCreateForm = () => {
    setShowCreate(false);
    setRoomTitle(''); setRoomDesc(''); setRoomTopics('');
    setIsPublic(true); setMaxListeners('100');
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Floating Reactions */}
      <div className="fixed bottom-24 left-0 right-0 pointer-events-none z-40 flex justify-center">
        <AnimatePresence>
          {floatingReactions.map(r => (
            <motion.div key={r.id} initial={{ opacity: 1, y: 0, scale: 1 }} animate={{ opacity: 0, y: -100, scale: 1.5 }}
              exit={{ opacity: 0 }} transition={{ duration: 2 }}
              className="absolute text-3xl" style={{ left: `${r.x}%` }}>
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* In-Room UI */}
      <AnimatePresence>
        {inRoom && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-full shadow-2xl px-6 py-3 flex items-center gap-3 border-2 border-green-200">
              {/* Speakers */}
              <div className="flex -space-x-2">
                {speakers.slice(0, 3).map((s, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                    {s.user.username[0]?.toUpperCase()}
                  </div>
                ))}
              </div>
              
              <span className="text-sm font-semibold">{listenerCount} {t('listening')}</span>

              <div className="flex items-center gap-1">
                <button onClick={toggleMute} className={`p-2.5 rounded-full transition ${isMuted ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                
                {!isSpeaker && (
                  <button onClick={raiseHand} className={`p-2.5 rounded-full transition ${handRaised ? 'bg-yellow-500 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>
                    <Hand size={18} />
                  </button>
                )}

                <button onClick={() => setShowReactions(!showReactions)} className="p-2.5 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300">
                  <Smile size={18} />
                </button>

                {isSpeaker && inRoom && (
                  <button onClick={() => setShowInvite(!showInvite)} className="p-2.5 rounded-full bg-blue-500 text-white">
                    <UserPlus size={18} />
                  </button>
                )}

                <button onClick={() => leaveRoom(inRoom)} className="p-2.5 rounded-full bg-red-500 text-white">
                  <Phone size={18} className="rotate-[135deg]" />
                </button>
              </div>
            </div>

            {/* Reaction picker */}
            <AnimatePresence>
              {showReactions && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-2 flex gap-1">
                  {REACTIONS.map(emoji => (
                    <button key={emoji} onClick={() => { sendReaction(emoji); setShowReactions(false); }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-xl transition hover:scale-125">
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Invite form */}
            <AnimatePresence>
              {showInvite && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-3 flex gap-2">
                  <input className="input-field text-sm w-40" placeholder="Username" value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} />
                  <button onClick={inviteSpeaker} className="btn-primary text-sm">Invite</button>
                </motion.div>
              )}
            </AnimatePresence>
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
            className="glass p-6 rounded-2xl mb-6 space-y-3 shadow-xl border-2 border-purple-200">
            <h3 className="font-bold text-lg flex items-center gap-2"><Radio size={18} /> {t('host_audio_room')}</h3>
            <input className="input-field" placeholder="Room title *" value={roomTitle} onChange={e => setRoomTitle(e.target.value)} />
            <textarea className="input-field" placeholder="Description..." value={roomDesc} onChange={e => setRoomDesc(e.target.value)} rows={2} />
            <input className="input-field" placeholder="Topics (comma separated)" value={roomTopics} onChange={e => setRoomTopics(e.target.value)} />
            <div className="flex gap-3 items-center">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="rounded" />
                {isPublic ? <Globe size={14} /> : <Lock size={14} />} Public
              </label>
              <input className="input-field w-24 text-sm" type="number" placeholder="Max listeners" value={maxListeners} onChange={e => setMaxListeners(e.target.value)} />
            </div>
            <button onClick={createRoom} className="btn-primary w-full">🎙️ Start Room</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Topic Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        <button onClick={() => setActiveTopic('')} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${!activeTopic ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
          {t('all')}
        </button>
        {['Tech', 'Music', 'Business', 'Health', 'Education', 'Entertainment', 'Sports', 'News'].map(topic => (
          <button key={topic} onClick={() => setActiveTopic(topic)} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${activeTopic === topic ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {topic}
          </button>
        ))}
      </div>

      {/* Rooms List */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-500" size={48} /></div>
      ) : error ? (
        <div className="glass p-12 rounded-2xl text-center">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={48} />
          <p>{error}</p>
          <button onClick={fetchRooms} className="btn-primary mt-4">{t('retry')}</button>
        </div>
      ) : rooms.length === 0 ? (
        <div className="glass p-12 rounded-2xl text-center">
          <Radio size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-xl text-gray-500">{t('no_live_rooms')}</p>
          <p className="text-sm text-gray-400">{t('be_the_first_to_host_one')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map(room => (
            <motion.div key={room.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-5 hover:shadow-lg transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                      {room.host.username[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{room.title}</h3>
                      <p className="text-sm text-gray-500">{t('hosted_by')} @{room.host.username}</p>
                    </div>
                  </div>
                  {room.description && <p className="text-sm text-gray-600 mt-1">{room.description}</p>}
                  {room.topics && (
                    <div className="flex gap-1 mt-2">
                      {room.topics.split(',').map((topic, i) => (
                        <span key={i} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{topic.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-center mr-2">
                    <p className="text-2xl font-bold text-purple-600 flex items-center gap-1">
                      <Users size={18} /> {room.current_listeners}
                    </p>
                    <p className="text-xs text-gray-500">{t('listening')}</p>
                  </div>

                  {/* Speakers preview */}
                  {room.speakers && room.speakers.length > 0 && (
                    <div className="flex -space-x-2 mr-2">
                      {room.speakers.slice(0, 3).map((s, i) => (
                        <div key={i} className="w-7 h-7 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-bold">
                          {s.user.username[0]?.toUpperCase()}
                        </div>
                      ))}
                      {room.speakers.length > 3 && (
                        <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs">
                          +{room.speakers.length - 3}
                        </div>
                      )}
                    </div>
                  )}

                  <button onClick={() => joinRoom(room.id, false)} className="btn-primary text-sm">
                    {t('join')}
                  </button>
                  {room.host.username === user?.username && (
                    <button onClick={() => endRoom(room.id)} className="text-red-500 text-xs hover:underline">
                      {t('end')}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}