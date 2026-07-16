import React, { useEffect, useState, useRef } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, DollarSign, ShoppingCart, Star, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface Notification {
  id: string;
  notification_type: string;
  message: string;
  actor: string;
  post_id?: string;
  created_at: string;
  is_read: boolean;
}

const iconMap: Record<string, JSX.Element> = {
  like: <Heart className="text-red-500" size={16} />,
  comment: <MessageCircle className="text-blue-500" size={16} />,
  follow: <UserPlus className="text-green-500" size={16} />,
  money: <DollarSign className="text-yellow-500" size={16} />,
  purchase: <ShoppingCart className="text-orange-500" size={16} />,
  subscription: <Star className="text-purple-500" size={16} />,
  donation: <DollarSign className="text-yellow-500" size={16} />,
  gig_completed: <Star className="text-green-500" size={16} />,
  badge: <Star className="text-yellow-500" size={16} />,
  snap: <MessageCircle className="text-purple-500" size={16} />,
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null);
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('sasl_notification_sound') !== 'off';
  });

  // Create audio element on mount
   // Create audio + unlock on first user click
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2qEcP+1j2Oda1e1PmN9u1JbicN0sX9Ddq6K1f9wbJWwub6Y1/+wjrGIbYKBpOvrw5aDcf+zhmyNyctTdr6Kv+Jqfp7FxVhstrbzn5Bmf/+0fHCBmZ5hbLfG8W+NpJaopce6c42Yhmr/5n2dysjCWHe6wuJrlZ2Fq8ewiG6Bb7bx8YqU');
    audioRef.current.volume = 0.5;
    
    // Unlock audio on first user interaction
    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current!.pause();
          audioRef.current!.currentTime = 0;
        }).catch(() => {});
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
  }, []);

  
  const playNotificationSound = () => {
    if (!soundEnabled) return;
    // Try HTML5 Audio first
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    // Also try Web Audio API
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
    } catch {}
  };

  const connectWebSocket = () => {
    const token = localStorage.getItem('sasl_token');
    if (!token) return;
    const isLocal = window.location.hostname === 'localhost';
    const wsUrl = isLocal 
      ? `ws://localhost:8000/ws/notifications/?token=${token}`
      : `wss://sasl-api-i34r.onrender.com/ws/notifications/?token=${token}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => console.log('🔔 Notification WebSocket connected');
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'unread_count') {
            setUnreadCount(data.count);
          } else if (data.type === 'new_notification') {
            setNotifications(prev => [data.notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            // Play chime sound
            playNotificationSound();
            // Send to service worker for phone push
            if (soundEnabled && navigator.serviceWorker?.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'NOTIFICATION',
                title: 'Sasl',
                body: data.notification.message
              });
            }
            toast.success(data.notification.message, {
              icon: iconMap[data.notification.notification_type] || '🔔',
              duration: 4000,
            });
          }
        } catch (err) {}
      };
      
      ws.onerror = () => console.log('🔔 WebSocket error — falling back to polling');
      ws.onclose = () => {
        console.log('🔔 Notification WebSocket closed — reconnecting in 5s');
        setTimeout(connectWebSocket, 5000);
      };
      
      wsRef.current = ws;
    } catch (err) {}
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/content/notifications/');
      const data = res.data.results || res.data || [];
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
    } catch {} finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    connectWebSocket();

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      wsRef.current?.close();
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/content/notifications/${id}/mark_read/`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.post('/content/notifications/mark_all_read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleClick = (notification: Notification) => {
    if (!notification.is_read) markAsRead(notification.id);
    setOpen(false);
    const type = notification.notification_type;
    if (type === 'like' || type === 'comment') navigate(notification.post_id ? `/post/${notification.post_id}` : '/');
    else if (type === 'follow') navigate(`/profile/${notification.actor}`);
    else if (type === 'donation' || type === 'stream_start') navigate('/streaming');
    else if (type === 'purchase') navigate('/marketplace');
    else if (type === 'gig_completed' || type === 'gig_taken') navigate('/gigs');
    else if (type === 'group_invite' || type === 'group_join_request') navigate('/group-chat');
    else if (type === 'snap') navigate('/snap');
    else if (type === 'audio_room') navigate('/live-audio');
    else navigate(notification.post_id ? `/post/${notification.post_id}` : '/');
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('sasl_notification_sound', newState ? 'on' : 'off');
    toast(newState ? '🔊 Notification sounds ON' : '🔇 Notification sounds OFF');
  };

  return (
    <div className="relative" ref={panelRef}>
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setOpen(!open)} className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <Bell size={20} className="text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs min-w-[20px] h-5 rounded-full flex items-center justify-center font-bold px-1 shadow-lg">
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}  className="absolute right-0 mt-2 w-[90vw] max-w-[320px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-[60] overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">{t('Notifications')}</h3>
              <div className="flex items-center gap-2">
                <button onClick={toggleSound} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition" title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}>
                  {soundEnabled ? <Volume2 size={14} className="text-green-500" /> : <VolumeX size={14} className="text-gray-400" />}
                </button>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-sm text-green-600 hover:underline font-medium">{t('Mark all read')}</button>
                )}
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center"><div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto" /></div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400"><Bell size={32} className="mx-auto mb-2 opacity-50" /><p>{t('No notifications yet')}</p></div>
              ) : (
                notifications.map(notification => (
                  <motion.button key={notification.id} whileHover={{ backgroundColor: 'rgba(0,168,107,0.05)' }} onClick={() => handleClick(notification)} className={`w-full text-left p-4 transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-b-0 ${!notification.is_read ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 rounded-full bg-gray-100 dark:bg-gray-700">{iconMap[notification.notification_type] || <Bell size={16} className="text-gray-500" />}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(notification.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      {!notification.is_read && <span className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0 mt-2 shadow-lg shadow-green-300" />}
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}