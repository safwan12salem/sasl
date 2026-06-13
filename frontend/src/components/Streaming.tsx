/**
 * Sasl - Social Asynchronous Sharing Layer
 * Streaming – Advanced live streaming with categories, clips, scheduling, top donors
 * VIRAL EDITION: Live chat overlay, floating comments, donation animations, viewer avatars,
 * stream previews, schedule countdown, notifications, mobile-optimized viewer
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Play, Users, DollarSign, Loader2, Radio, AlertCircle, Video, VideoOff,
  Clock, Calendar, TrendingUp, Crown, Image as ImageIcon, X, Bookmark,
  MessageCircle, Heart, Send, Bell, BellOff, Sparkles, Eye, Share2,
  ChevronUp, ChevronDown, Gift, Star, Zap, Timer, Maximize2, Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WebRTCConnection } from '../services/webrtc';
import { useTranslation } from 'react-i18next';
import PaymentModal from './PaymentModal';

interface Stream {
  id: string;
  streamer: { username: string; avatar_url?: string };
  title: string;
  description?: string;
  category?: string;
  viewers_count: number;
  is_live: boolean;
  thumbnail_url?: string;
  top_donors?: { username: string; total: number }[];
  total_donations?: number;
  tags?: string[];
}

interface ScheduledStream {
  id: string;
  streamer_name: string;
  title: string;
  description?: string;
  scheduled_at: string;
  category?: string;
}

interface ChatMessage {
  id: string;
  username: string;
  avatar_url?: string;
  message: string;
  color?: string;
  is_donation?: boolean;
  amount?: number;
  timestamp: string;
}

interface FloatingComment {
  id: string;
  username: string;
  message: string;
  color: string;
  x: number;
}

interface DonationAnimation {
  id: string;
  username: string;
  amount: number;
  message: string;
  x: number;
}

const CATEGORIES = ['Gaming', 'Music', 'Talk', 'Tutorial', 'Fitness', 'Cooking', 'Art', 'Tech', 'IRL'];
const CHAT_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
const DONATION_EMOJIS = ['🎉', '💎', '🚀', '⭐', '🔥', '💖', '👑', '🌟'];

export default function Streaming() {
  const { user } = useAuth();
  const { t } = useTranslation();

  // Streams
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedules, setSchedules] = useState<ScheduledStream[]>([]);

  // Create stream
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Talk');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  // Donation
  const [amount, setAmount] = useState<{ [key: string]: number }>({});
  const [donationMessage, setDonationMessage] = useState<{ [key: string]: string }>({});

  // Payment modal
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);

  // Video call
  const [inCall, setInCall] = useState<{ streamId: string; role: 'streamer' | 'viewer' } | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const rtcRef = useRef<WebRTCConnection | null>(null);
  const token = localStorage.getItem('sasl_token');

  // ========== VIRAL FEATURES STATE ==========
  // Live chat
  const [showChat, setShowChat] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatWsRef = useRef<WebSocket | null>(null);

  // Floating comments (TikTok-style)
  const [floatingComments, setFloatingComments] = useState<FloatingComment[]>([]);

  // Donation animations
  const [donationAnimations, setDonationAnimations] = useState<DonationAnimation[]>([]);

  // Viewer avatars
  const [viewerAvatars, setViewerAvatars] = useState<{ username: string; avatar_url?: string }[]>([]);

  // Schedule countdown
  const [countdowns, setCountdowns] = useState<{ [key: string]: string }>({});

  // Notifications
  const [subscribedStreamers, setSubscribedStreamers] = useState<Set<string>>(new Set());
  const [streamNotifications, setStreamNotifications] = useState<Stream[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Mobile viewer
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeStreamTab, setActiveStreamTab] = useState<'info' | 'chat' | 'donors'>('chat');

  // ============================================================
  // FETCH
  // ============================================================
  const fetchStreams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeCategory) params.set('category', activeCategory);
      const res = await api.get(`/streaming/streams/?${params.toString()}`);
      setStreams(res.data.results || []);
    } catch (err) {
      setError(t('Failed to load streams.'));
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  const fetchSchedules = async () => {
    try {
      const res = await api.get('/streaming/schedules/upcoming/');
      setSchedules(res.data || []);
    } catch {}
  };

  useEffect(() => { fetchStreams(); fetchSchedules(); }, []);

  // ============================================================
  // VIRAL: Schedule countdown timer
  // ============================================================
  useEffect(() => {
    const interval = setInterval(() => {
      const newCountdowns: { [key: string]: string } = {};
      schedules.forEach(s => {
        const diff = new Date(s.scheduled_at).getTime() - Date.now();
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          newCountdowns[s.id] = `${hours}h ${minutes}m ${seconds}s`;
        } else {
          newCountdowns[s.id] = t('LIVE NOW');
        }
      });
      setCountdowns(newCountdowns);
    }, 1000);
    return () => clearInterval(interval);
  }, [schedules]);

  // ============================================================
  // VIRAL: Stream notifications polling
  // ============================================================
  useEffect(() => {
    const checkLiveStreams = async () => {
      try {
        const res = await api.get('/streaming/streams/?is_live=true');
        const liveStreams = res.data.results || [];
        const newNotifications = liveStreams.filter(
          (s: Stream) => subscribedStreamers.has(s.streamer.username) && 
          !streams.find(existing => existing.id === s.id)
        );
        if (newNotifications.length > 0) {
          setStreamNotifications(prev => [...newNotifications, ...prev]);
          newNotifications.forEach((s: Stream) => {
            toast(`${s.streamer.username} ${t('went live!')} 🔴`, { 
              icon: '🔔',
              duration: 5000,
              style: { background: '#1a1a2e', color: '#fff', border: '1px solid #ef4444' }
            });
          });
        }
      } catch {}
    };
    const interval = setInterval(checkLiveStreams, 30000);
    return () => clearInterval(interval);
  }, [subscribedStreamers, streams]);

  // ============================================================
  // VIRAL: Connect to chat WebSocket when in call
  // ============================================================
  const connectChatWebSocket = useCallback((streamId: string) => {
    if (chatWsRef.current?.readyState === WebSocket.OPEN) return;
    const isLocal = window.location.hostname === 'localhost';
    const wsUrl = isLocal
      ? `ws://localhost:8000/ws/stream-chat/${streamId}/?token=${token}`
      : `wss://sasl.pythonanywhere.com/ws/stream-chat/${streamId}/?token=${token}`;
    const ws = new WebSocket(wsUrl);
    chatWsRef.current = ws;

    ws.onopen = () => {
      // Send join message
      ws.send(JSON.stringify({ 
        type: 'join', 
        username: user?.username,
        avatar_url: user?.avatar_url 
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chat_message') {
        const newMsg: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random()}`,
          username: data.username,
          avatar_url: data.avatar_url,
          message: data.message,
          color: data.color || CHAT_COLORS[Math.floor(Math.random() * CHAT_COLORS.length)],
          is_donation: data.is_donation || false,
          amount: data.amount,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, newMsg]);
        
        // TikTok-style floating comment
        if (data.username !== user?.username) {
          const floatingComment: FloatingComment = {
            id: `float-${Date.now()}`,
            username: data.username,
            message: data.message,
            color: data.color || '#fff',
            x: Math.random() * 60 + 20
          };
          setFloatingComments(prev => [...prev, floatingComment]);
          setTimeout(() => {
            setFloatingComments(prev => prev.filter(f => f.id !== floatingComment.id));
          }, 5000);
        }

        // Donation animation
        if (data.is_donation && data.amount) {
          const donationAnim: DonationAnimation = {
            id: `don-${Date.now()}`,
            username: data.username,
            amount: data.amount,
            message: data.message,
            x: Math.random() * 70 + 15
          };
          setDonationAnimations(prev => [...prev, donationAnim]);
          setTimeout(() => {
            setDonationAnimations(prev => prev.filter(d => d.id !== donationAnim.id));
          }, 6000);
        }
      } else if (data.type === 'viewer_update') {
        setViewerAvatars(data.viewers || []);
      } else if (data.type === 'donation_alert') {
        // Big donation alert
        const donationAnim: DonationAnimation = {
          id: `don-big-${Date.now()}`,
          username: data.username,
          amount: data.amount,
          message: data.message,
          x: 50
        };
        setDonationAnimations(prev => [...prev, donationAnim]);
        setTimeout(() => {
          setDonationAnimations(prev => prev.filter(d => d.id !== donationAnim.id));
        }, 8000);
      }
    };

    ws.onclose = () => {
      // Auto-reconnect after 3 seconds
      setTimeout(() => {
        if (inCall) connectChatWebSocket(streamId);
      }, 3000);
    };
  }, [user, token, inCall]);

  // ============================================================
  // VIRAL: Auto-scroll chat
  // ============================================================
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // ============================================================
  // VIRAL: Send chat message
  // ============================================================
  const sendChatMessage = () => {
    if (!chatInput.trim() || !chatWsRef.current || chatWsRef.current.readyState !== WebSocket.OPEN) return;
    chatWsRef.current.send(JSON.stringify({
      type: 'chat_message',
      message: chatInput.trim(),
      color: CHAT_COLORS[Math.floor(Math.random() * CHAT_COLORS.length)]
    }));
    setChatInput('');
  };

  // ============================================================
  // VIRAL: Toggle streamer subscription
  // ============================================================
  const toggleSubscribe = (streamerUsername: string) => {
    setSubscribedStreamers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(streamerUsername)) {
        newSet.delete(streamerUsername);
        toast.success(t('Unsubscribed from {{name}}', { name: streamerUsername }));
      } else {
        newSet.add(streamerUsername);
        toast.success(t('Subscribed to {{name}}! 🔔', { name: streamerUsername }));
      }
      return newSet;
    });
  };

  // ============================================================
  // ACTIONS (preserved from original)
  // ============================================================
  const startStream = async () => {
    if (!title.trim()) return toast.error(t('Enter a title'));
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('tags', JSON.stringify(tags.split(',').map(t => t.trim()).filter(Boolean)));
      if (thumbnailFile) formData.append('thumbnail', thumbnailFile);

      const res = await api.post('/streaming/streams/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setStreams(prev => {
        const exists = prev.find(s => s.id === res.data.id);
        if (exists) return prev;
        return [res.data, ...prev];
      });

      toast.success(t('You are now live! 🎥'));
      setTitle(''); setDescription(''); setTags('');
      setThumbnailFile(null); setThumbnailPreview(null);

    } catch (err: any) {
      toast.error(err.response?.data?.error || t('Failed to start stream'));
    }
  };

  const donate = async (streamId: string) => {
    const amt = amount[streamId] || 1;
    if (amt <= 0) return toast.error(t('Enter an amount'));
    try {
      await api.post(`/streaming/streams/${streamId}/donate/`, {
        amount: amt,
        message: donationMessage[streamId] || '👏',
      });
      toast.success(`Donated $${amt}! 🎉`);
      
      // VIRAL: Send donation to chat
      if (chatWsRef.current?.readyState === WebSocket.OPEN) {
        chatWsRef.current.send(JSON.stringify({
          type: 'chat_message',
          message: `${DONATION_EMOJIS[Math.floor(Math.random() * DONATION_EMOJIS.length)]} Donated $${amt}! ${donationMessage[streamId] || '👏'}`,
          is_donation: true,
          amount: amt,
          color: '#FFD700'
        }));
      }
      
      setAmount(prev => ({ ...prev, [streamId]: 0 }));
      setDonationMessage(prev => ({ ...prev, [streamId]: '' }));
      fetchStreams();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('Donation failed'));
    }
  };

  const scheduleStream = async () => {
    if (!title.trim()) return;
    try {
      const scheduledAt = prompt(t('Schedule date & time (YYYY-MM-DDTHH:MM):'));
      if (!scheduledAt) return;
      await api.post('/streaming/schedules/', {
        title,
        description,
        category,
        scheduled_at: scheduledAt,
      });
      toast.success(t('Stream scheduled! 📅'));
      setTitle(''); setDescription('');
      fetchSchedules();
    } catch (err: any) {
      toast.error(t('Failed to schedule'));
    }
  };

  const saveStream = (streamId: string) => {
    toast.success(t('Stream saved!'));
  };

  const endStream = async (streamId: string) => {
    setStreams(prev => prev.filter(s => s.id !== streamId));
    try {
      await api.post(`/streaming/streams/${streamId}/end_stream/`);
      toast.success(t('Stream ended'));
    } catch (err: any) {
      fetchStreams();
      toast.error(t('Failed to end stream'));
    }
  };

  // ============================================================
  // VIDEO CALL (enhanced with chat + viewer features)
  // ============================================================
  const startVideoCall = (streamId: string, role: 'streamer' | 'viewer') => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        const isLocal = window.location.hostname === 'localhost';
        const wsUrl = isLocal
          ? `ws://localhost:8000/ws/video/${streamId}/?token=${token}`
          : `wss://sasl.pythonanywhere.com/ws/video/${streamId}/?token=${token}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        const rtc = new WebRTCConnection((msg) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); });
        rtcRef.current = rtc;

        ws.onopen = () => {
          if (localVideoRef.current) rtc.startLocalStream(localVideoRef.current);
          ws.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'answer' && role === 'viewer') await rtc.handleAnswer(data.answer);
            else if (data.type === 'offer' && role === 'streamer' && remoteVideoRef.current) await rtc.handleOffer(data.offer, remoteVideoRef.current);
            else if (data.type === 'candidate') await rtc.addIceCandidate(data.candidate);
          };
          if (role === 'viewer' && remoteVideoRef.current) rtc.createOffer(remoteVideoRef.current);
        };

        setInCall({ streamId, role });
        // VIRAL: Connect to chat when entering call
        connectChatWebSocket(streamId);
        // VIRAL: Join stream
        api.post(`/streaming/streams/${streamId}/join/`).catch(() => {});
      })
      .catch(() => toast.error(t('Camera access denied')));
  };

  const endCall = () => {
    rtcRef.current?.disconnect();
    wsRef.current?.close();
    chatWsRef.current?.close();
    if (inCall) {
      api.post(`/streaming/streams/${inCall.streamId}/leave/`).catch(() => {});
    }
    setInCall(null);
    setChatMessages([]);
    setFloatingComments([]);
    setDonationAnimations([]);
    setViewerAvatars([]);
  };

  // ============================================================
  // RENDER: Loading skeleton (preserved)
  // ============================================================
  if (loading) {
    return (
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="glass p-4 rounded-2xl animate-pulse">
            <div className="flex items-center gap-2 mb-2"><div className="w-10 h-10 rounded-full bg-gray-200" /><div className="h-4 bg-gray-200 rounded w-24" /></div>
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  // ============================================================
  // RENDER: Main
  // ============================================================
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* ========== VIRAL: Stream Notifications Dropdown ========== */}
      <AnimatePresence>
        {showNotifications && streamNotifications.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 right-4 z-50 glass rounded-2xl p-4 shadow-2xl max-w-sm w-full border border-red-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold flex items-center gap-2"><Bell size={16} className="text-red-500" /> {t('Live Now')}</h4>
              <button onClick={() => { setStreamNotifications([]); setShowNotifications(false); }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            {streamNotifications.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer"
                onClick={() => { startVideoCall(s.id, 'viewer'); setStreamNotifications([]); setShowNotifications(false); }}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                  <Radio size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{s.streamer.username}</p>
                  <p className="text-xs text-gray-500 truncate">{s.title}</p>
                </div>
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== VIRAL: Video Call Overlay with Chat ========== */}
      <AnimatePresence>
        {inCall && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex flex-col">
            
            {/* Donation Animations Overlay */}
            {donationAnimations.map(anim => (
              <motion.div key={anim.id}
                initial={{ opacity: 0, scale: 0.5, y: 0 }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 0.8], y: [-20, -80, -120, -180] }}
                transition={{ duration: 6, ease: 'easeOut' }}
                className="absolute z-50 pointer-events-none"
                style={{ left: `${anim.x}%`, bottom: '40%' }}>
                <div className="text-center">
                  <p className="text-4xl animate-bounce">{DONATION_EMOJIS[Math.floor(Math.random() * DONATION_EMOJIS.length)]}</p>
                  <p className="text-yellow-400 font-bold text-xl drop-shadow-lg">@{anim.username}</p>
                  <p className="text-yellow-300 font-bold text-3xl drop-shadow-lg">${anim.amount}</p>
                  {anim.message && <p className="text-white text-sm drop-shadow-md">{anim.message}</p>}
                </div>
              </motion.div>
            ))}

            {/* Floating Comments (TikTok-style) */}
            {floatingComments.map(comment => (
              <motion.div key={comment.id}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: [0, 1, 1, 0], x: [0, 20, 40, 60] }}
                transition={{ duration: 5, ease: 'linear' }}
                className="absolute z-40 pointer-events-none"
                style={{ left: `${comment.x}%`, bottom: `${30 + Math.random() * 30}%` }}>
                <div className="flex items-center gap-1" style={{ color: comment.color }}>
                  <span className="font-bold text-sm drop-shadow-lg">@{comment.username}</span>
                  <span className="text-sm drop-shadow-lg">{comment.message}</span>
                </div>
              </motion.div>
            ))}

            {/* Main Video Area */}
            <div className="flex-1 flex flex-col md:flex-row">
              <div className="flex-1 relative bg-black flex items-center justify-center"
                onClick={() => setIsFullscreen(!isFullscreen)}>
                <video ref={remoteVideoRef} autoPlay className={`${isFullscreen ? 'w-full h-full object-contain' : 'max-w-full max-h-full'}`} />
                <video ref={localVideoRef} autoPlay muted className="absolute bottom-4 right-4 w-32 md:w-48 rounded-xl border-2 border-white/30 shadow-xl" />

                {/* Viewer Count with Avatars */}
                <div className="absolute top-4 left-4 flex items-center gap-1">
                  <div className="flex -space-x-2">
                    {viewerAvatars.slice(0, 5).map((v, i) => (
                      v.avatar_url ? (
                        <img key={i} src={v.avatar_url} className="w-8 h-8 rounded-full border-2 border-black object-cover" alt="" />
                      ) : (
                        <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-black flex items-center justify-center text-white text-xs font-bold">
                          {v.username[0]?.toUpperCase()}
                        </div>
                      )
                    ))}
                    {viewerAvatars.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-black flex items-center justify-center text-white text-xs font-bold">
                        +{viewerAvatars.length - 5}
                      </div>
                    )}
                  </div>
                  <span className="text-white text-sm font-semibold ml-1">{viewerAvatars.length}</span>
                </div>

                {/* Stream Info Overlay */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                  </span>
                  <button onClick={() => setShowChat(!showChat)} className="bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition">
                    <MessageCircle size={16} />
                  </button>
                </div>
              </div>

              {/* Chat Panel (mobile: tab-based) */}
              {showChat && (
                <div className="w-full md:w-80 bg-gray-900 flex flex-col">
                  {/* Mobile Tabs */}
                  <div className="flex md:hidden border-b border-gray-700">
                    {(['chat', 'info', 'donors'] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveStreamTab(tab)}
                        className={`flex-1 py-2 text-xs font-semibold ${activeStreamTab === tab ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400'}`}>
                        {tab === 'chat' ? t('Chat') : tab === 'info' ? t('Info') : t('Top Donors')}
                      </button>
                    ))}
                  </div>

                  {/* Chat Messages */}
                  {(activeStreamTab === 'chat' || window.innerWidth >= 768) && (
                    <>
                      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                        {chatMessages.length === 0 && (
                          <div className="text-center text-gray-500 mt-8">
                            <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">{t('No messages yet')}</p>
                            <p className="text-xs">{t('Be the first to chat!')}</p>
                          </div>
                        )}
                        {chatMessages.map((msg, i) => (
                          <motion.div key={msg.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(i * 0.02, 0.3) }}
                            className={`flex items-start gap-2 ${msg.is_donation ? 'bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/30' : ''}`}>
                            {msg.avatar_url ? (
                              <img src={msg.avatar_url} className="w-6 h-6 rounded-full object-cover flex-shrink-0" alt="" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                                {msg.username[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-xs" style={{ color: msg.color || '#fff' }}>@{msg.username}</span>
                              {msg.is_donation && <span className="text-yellow-400 text-xs ml-1">${msg.amount}</span>}
                              <p className="text-white text-sm break-words">{msg.message}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      {/* Chat Input */}
                      <div className="p-3 border-t border-gray-700">
                        <div className="flex gap-2">
                          <input
                            className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 text-sm border border-gray-700 focus:border-red-500 focus:outline-none"
                            placeholder={t('Send a message...')}
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }}
                          />
                          <button onClick={sendChatMessage}
                            className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition">
                            <Send size={16} />
                          </button>
                        </div>
                        {/* Quick Emojis */}
                        <div className="flex gap-1 mt-2">
                          {['❤️', '🔥', '👏', '😂', '🎉', '💎'].map(emoji => (
                            <button key={emoji} onClick={() => setChatInput(prev => prev + emoji)}
                              className="hover:scale-125 transition-transform text-lg">{emoji}</button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Info Tab */}
                  {activeStreamTab === 'info' && window.innerWidth < 768 && (
                    <div className="flex-1 p-4 text-white">
                      <h3 className="font-bold text-lg">{streams.find(s => s.id === inCall?.streamId)?.title}</h3>
                      <p className="text-gray-400 text-sm mt-2">{streams.find(s => s.id === inCall?.streamId)?.description}</p>
                      <div className="mt-4 flex items-center gap-2">
                        <Users size={16} className="text-gray-400" />
                        <span className="text-sm">{viewerAvatars.length} {t('viewers')}</span>
                      </div>
                    </div>
                  )}

                  {/* Top Donors Tab */}
                  {activeStreamTab === 'donors' && window.innerWidth < 768 && (
                    <div className="flex-1 p-4 text-white">
                      <h4 className="font-bold mb-3">{t('Top Donors')}</h4>
                      {streams.find(s => s.id === inCall?.streamId)?.top_donors?.map((d, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-700">
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-400">{i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : '⭐'}</span>
                            <span>@{d.username}</span>
                          </div>
                          <span className="text-yellow-400 font-bold">${d.total}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="bg-gray-900 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm">{streams.find(s => s.id === inCall?.streamId)?.streamer.username}</span>
                <span className="text-gray-400 text-xs">{streams.find(s => s.id === inCall?.streamId)?.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {inCall.role === 'viewer' && (
                  <button onClick={() => {
                    const streamId = inCall.streamId;
                    setPaymentAmount(amount[streamId] || 1);
                    setShowPayment(true);
                  }} className="bg-yellow-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1 hover:bg-yellow-600">
                    <Gift size={14} /> {t('Donate')}
                  </button>
                )}
                <button onClick={() => setIsFullscreen(!isFullscreen)} className="text-white p-2 hover:bg-gray-800 rounded-full">
                  {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                <button onClick={endCall} className="bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1 hover:bg-red-600">
                  <VideoOff size={14} /> {t('Leave')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold gradient-text flex items-center gap-2">
            <Radio className="text-red-500" /> {t('Live Streams')}
          </h2>
          <p className="text-gray-500 text-sm mt-1">{t('Watch, stream, and earn from anywhere')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowNotifications(!showNotifications)}
              className={`btn-ghost flex items-center gap-1 text-sm relative ${streamNotifications.length > 0 ? 'text-red-500' : ''}`}>
              <Bell size={16} />
              {streamNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                  {streamNotifications.length}
                </span>
              )}
            </button>
          </div>
          <button onClick={() => setShowSchedule(!showSchedule)} className="btn-ghost flex items-center gap-1 text-sm">
            <Calendar size={16} /> {t('Schedule')}
          </button>
        </div>
      </div>

      {/* Create Stream Form (preserved) */}
      {user?.is_creator && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass p-5 rounded-2xl mb-6 space-y-3 border-l-4 border-red-500">
          <h3 className="font-bold flex items-center gap-2"><Video size={18} className="text-red-500" /> {t('Go Live')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="input-field" placeholder={t('Stream title...')} value={title} onChange={e => setTitle(e.target.value)} />
            <select className="input-field" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className="input-field" placeholder={t('Tags (comma separated)')} value={tags} onChange={e => setTags(e.target.value)} />
          </div>
          <textarea className="input-field" placeholder={t('Description...')} value={description} onChange={e => setDescription(e.target.value)} rows={2} />

          {/* Thumbnail Upload */}
          <div className="flex items-center gap-3">
            <label className="btn-ghost cursor-pointer flex items-center gap-1 text-sm">
              <ImageIcon size={18} /> {thumbnailFile ? thumbnailFile.name : t('Upload Thumbnail')}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { setThumbnailFile(file); setThumbnailPreview(URL.createObjectURL(file)); }
              }} />
            </label>
            {thumbnailPreview && (
              <div className="relative">
                <img src={thumbnailPreview} alt="thumbnail" className="h-10 w-16 rounded object-cover" />
                <button onClick={() => { setThumbnailFile(null); setThumbnailPreview(null); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X size={10} /></button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={startStream} className="btn-primary bg-red-500 hover:bg-red-600 flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> {t('Go Live Now')}
            </button>
            <button onClick={scheduleStream} className="btn-ghost flex items-center gap-1">
              <Calendar size={14} /> {t('Schedule for Later')}
            </button>
          </div>
        </motion.div>
      )}

      {/* Scheduled Streams with Countdown (enhanced) */}
      <AnimatePresence>
        {showSchedule && schedules.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <div className="glass p-4 rounded-2xl">
              <h4 className="font-bold mb-3 flex items-center gap-2"><Calendar size={16} /> {t('Upcoming Streams')}</h4>
              <div className="space-y-2">
                {schedules.map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-white p-3 rounded-xl hover:shadow-md transition">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{s.title}</p>
                      <p className="text-xs text-gray-500">by @{s.streamer_name} · {new Date(s.scheduled_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono bg-red-50 text-red-600 px-2 py-1 rounded-full flex items-center gap-1">
                        <Timer size={12} />
                        {countdowns[s.id] || t('Loading...')}
                      </span>
                      <button onClick={() => toggleSubscribe(s.streamer_name)}
                        className={`p-1.5 rounded-full transition ${subscribedStreamers.has(s.streamer_name) ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-500'}`}>
                        {subscribedStreamers.has(s.streamer_name) ? <Bell size={14} /> : <BellOff size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Pills (preserved) */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
        <button onClick={() => setActiveCategory('')} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${!activeCategory ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t('All')}</button>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${activeCategory === cat ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{cat}</button>
        ))}
      </div>

      {/* Streams Grid (enhanced with notification bell + share) */}
      {error ? (
        <div className="glass p-12 rounded-2xl text-center">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={48} />
          <p className="text-lg text-gray-600">{t('An error occurred while fetching streams.')}</p>
          <button onClick={fetchStreams} className="btn-primary mt-4">{t('Retry')}</button>
        </div>
      ) : streams.length === 0 ? (
        <div className="glass p-12 rounded-2xl text-center">
          <Radio size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-xl text-gray-500">{t('No live streams right now')}</p>
          <p className="text-sm text-gray-400 mt-1">{user?.is_creator ? t('Start streaming above!') : t('Check back soon!')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {streams.map((s, idx) => (
            <motion.div key={s.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
              className="glass rounded-2xl overflow-hidden hover:shadow-xl transition group">
              {/* Thumbnail */}
              <div className="h-40 bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
                {s.thumbnail_url ? (
                  <img src={s.thumbnail_url} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Radio size={48} className="text-gray-600" />
                  </div>
                )}
                <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                </span>
                <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Users size={12} /> {s.viewers_count}
                </span>
                
                {/* VIRAL: Subscribe bell + Share */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={(e) => { e.stopPropagation(); toggleSubscribe(s.streamer.username); }}
                    className={`p-1.5 rounded-full ${subscribedStreamers.has(s.streamer.username) ? 'bg-red-500 text-white' : 'bg-black/40 text-white hover:bg-red-500'}`}>
                    {subscribedStreamers.has(s.streamer.username) ? <Bell size={14} /> : <BellOff size={14} />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(window.location.origin + '/streaming?stream=' + s.id); toast.success(t('Link copied!')); }}
                    className="bg-black/40 text-white p-1.5 rounded-full hover:bg-black/60">
                    <Share2 size={14} />
                  </button>
                </div>
                
                <button onClick={() => saveStream(s.id)} className="absolute bottom-2 right-2 bg-black/40 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition">
                  <Bookmark size={14} />
                </button>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {s.streamer.avatar_url ? (
                    <img src={s.streamer.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                      {s.streamer.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="font-semibold text-sm">{s.streamer.username}</span>
                  {s.category && <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded-full">{s.category}</span>}
                </div>
                <h3 className="font-bold text-sm line-clamp-1">{s.title}</h3>

                {/* Top Donors */}
                {s.top_donors && s.top_donors.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-yellow-500">
                    <Crown size={12} />
                    {s.top_donors.map((d, i) => (
                      <span key={i}>@{d.username} ${d.total}{i < s.top_donors!.length - 1 ? ',' : ''}</span>
                    ))}
                  </div>
                )}

                {/* VIRAL: Stream Preview (total donations) */}
                {s.total_donations && s.total_donations > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-green-500">
                    <DollarSign size={12} /> ${s.total_donations.toFixed(2)} {t('earned')}
                  </div>
                )}

                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    {user?.is_creator && s.streamer.username === user.username ? (
                      <button onClick={() => startVideoCall(s.id, 'streamer')} className="flex-1 bg-green-500 text-white py-1.5 rounded-full text-xs font-semibold hover:bg-green-600 flex items-center justify-center gap-1">
                        <Video size={12} /> {t('Streamer View')}
                      </button>
                    ) : (
                      <button onClick={() => startVideoCall(s.id, 'viewer')} className="flex-1 bg-red-500 text-white py-1.5 rounded-full text-xs font-semibold hover:bg-red-600 flex items-center justify-center gap-1">
                        <Play size={12} /> {t('Watch')}
                      </button>
                    )}
                  </div>

                  {/* Donation */}
                  <div className="flex gap-1">
                    <input type="number" min="1" className="w-16 border rounded-full px-2 py-1 text-xs" placeholder="$1"
                      value={amount[s.id] || ''} onChange={e => setAmount(prev => ({ ...prev, [s.id]: Number(e.target.value) }))} />
                    <button onClick={() => { setPaymentAmount(amount[s.id] || 1); setShowPayment(true); }} className="flex-1 bg-yellow-500 text-white py-1 rounded-full text-xs font-semibold hover:bg-yellow-600 flex items-center justify-center gap-1">
                      <DollarSign size={12} /> {t('Donate')}
                    </button>
                  </div>

                  {s.streamer.username === user?.username && (
                    <button onClick={() => endStream(s.id)} className="w-full text-xs text-red-500 hover:underline">{t('End Stream')}</button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Payment Modal (preserved) */}
      {showPayment && (
        <PaymentModal amount={paymentAmount} type="donation"
          onSuccess={() => { setShowPayment(false); fetchStreams(); toast.success('Payment successful!'); }}
          onClose={() => setShowPayment(false)} />
      )}

    </div>
  );
}