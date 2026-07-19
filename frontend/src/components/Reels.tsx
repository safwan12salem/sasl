/**
 * Sasl Reels — VIRAL EDITION
 * TikTok-style vertical swipe feed with elegant modern UI
 * Likes, comments, replies, tips, sound tracks, speed control, upload
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Heart, MessageCircle, Share2, Loader2, Video, Flag, Plus, Music, X, Send, ChevronUp, ChevronDown, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PaymentModal from './PaymentModal';
import SoundUploader from './SoundUploader';
import { uploadLargeVideo } from '../services/videoUploader';
import { motion, AnimatePresence } from 'framer-motion';

interface Reel {
  id: string;
  user: { username: string; avatar_url?: string };
  video_url: string;
  caption: string;
  sound_track?: string;
  sound_url?: string;
  duration?: number;
  playback_speed?: number;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
  views_count?: number;
}

export default function Reels() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [reelFile, setReelFile] = useState<File | null>(null);
  const [reelSound, setReelSound] = useState('');
  const [reelSoundUrl, setReelSoundUrl] = useState('');
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [reelCaption, setReelCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reelComments, setReelComments] = useState<Record<string, any[]>>({});
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [dislikedReels, setDislikedReels] = useState<Set<string>>(new Set());
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [tipReelId, setTipReelId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const handleDislike = async (reelId: string) => {
    if (reelId === 'demo-reel') return;
    try { await api.post(`/content/reels/${reelId}/dislike/`); toast('Feedback recorded'); } catch {}
  };

  const MONETIZATION_THRESHOLD = 1000;
  const isMonetized = (reel: Reel) => (reel.views_count || 0) >= MONETIZATION_THRESHOLD;

  const handleTip = (reelId: string) => {
    setTipReelId(reelId);
    setPaymentAmount(1);
    setShowPayment(true);
  };

  const fetchReels = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/content/reels/');
      const raw = res.data.results || res.data || [];
      let videoReels: any[] = raw.filter((r: any) => r.video_url).map((r: any) => ({
        id: r.id, user: r.user || { username: 'unknown' }, video_url: r.video_url,
        caption: r.caption || '', likes_count: r.likes_count || 0,
        comments_count: r.comments_count || 0, liked_by_me: r.liked_by_me || false,
        views_count: r.views_count || 0,
        sound_track: r.sound_track || '', sound_url: r.sound_url || '',
      }));
      if (videoReels.length === 0) {
        videoReels.push({
          id: 'demo-reel', user: { username: 'Sasl' },
          video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
          caption: 'Welcome to Sasl Reels! 🌍✨', likes_count: 120, comments_count: 15,
          liked_by_me: false, views_count: 1500, sound_track: 'Original Audio',
        });
      }
      setReels(videoReels);
    } catch (err) { setError(t('Could not load reels.')); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => {
    videoRefs.current.forEach((video) => {
      if (video) video.playbackRate = playbackSpeed;
    });
  }, [playbackSpeed]);

  useEffect(() => { fetchReels(); }, [fetchReels]);

  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (v) {
        v.muted = isMuted;
        if (i === activeIndex && isPlaying) v.play().catch(() => {});
        else v.pause();
      }
    });
  }, [activeIndex, isPlaying, isMuted]);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const index = Math.round(container.scrollTop / window.innerHeight);
      setActiveIndex(index);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLike = async (reelId: string) => {
    if (reelId === 'demo-reel') return;
    setDislikedReels(prev => { const n = new Set(prev); n.delete(reelId); return n; });
    const reel = reels.find(r => r.id === reelId);
    if (!reel) return;
    const newLiked = !reel.liked_by_me;
    const newCount = newLiked ? reel.likes_count + 1 : reel.likes_count - 1;
    setReels(prev => prev.map(r => r.id === reelId ? { ...r, liked_by_me: newLiked, likes_count: Math.max(0, newCount) } : r));
    try {
      const res = await api.post(`/content/reels/${reelId}/like/`);
      if (res.data && typeof res.data.likes_count === 'number') {
        setReels(prev => prev.map(r => r.id === reelId ? { ...r, likes_count: res.data.likes_count, liked_by_me: res.data.status === 'liked' } : r));
      }
      if (navigator.vibrate) navigator.vibrate(10);
    } catch { setReels(prev => prev.map(r => r.id === reelId ? { ...r, liked_by_me: reel.liked_by_me, likes_count: reel.likes_count } : r)); }
  };

  const handleShare = async (reelId: string) => {
    const reel = reels.find(r => r.id === reelId);
    if (!reel) return;
    const url = `${window.location.origin}/reels`;
    try {
      if (navigator.share) { await navigator.share({ title: 'Sasl Reel', text: reel.caption, url }); toast.success('Shared!'); }
      else { await navigator.clipboard.writeText(url); toast.success('Link copied!'); }
    } catch (err: any) { if (err.name !== 'AbortError') toast.error('Could not share'); }
  };

  const handleComment = async (reelId: string) => {
    const text = commentTexts[reelId] || '';
    if (!text.trim()) return;
    try {
      await api.post(`/content/reels/${reelId}/comment/`, { text });
      setReels(prev => prev.map(r => r.id === reelId ? { ...r, comments_count: r.comments_count + 1 } : r));
      setCommentTexts(prev => ({ ...prev, [reelId]: '' }));
      fetchReelComments(reelId);
    } catch { toast.error('Comment failed'); }
  };

  const handleReply = async (reelId: string, commentId: string) => {
    const text = replyTexts[commentId] || '';
    if (!text.trim()) return;
    try {
      await api.post(`/content/reels/${reelId}/reply_comment/`, { comment_id: commentId, text });
      setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
      setReplyingTo(null);
      fetchReelComments(reelId);
    } catch { toast.error('Reply failed'); }
  };

  const fetchReelComments = async (reelId: string) => {
    try { const res = await api.get(`/content/reels/${reelId}/comments/`); setReelComments(prev => ({ ...prev, [reelId]: res.data || [] })); } catch {}
  };

  const uploadReel = async () => {
    if (!reelFile) return toast.error(t('Select a video'));
    setUploading(true);
    try {
      const extraFields: Record<string, string> = { caption: reelCaption };
      if (reelSound) extraFields.sound_track = reelSound;
      if (reelSoundUrl) extraFields.sound_url = reelSoundUrl;
      const res = await uploadLargeVideo(reelFile, '/content/reels/', extraFields);
      setReels(prev => [res, ...prev]);
      setShowUpload(false); setReelFile(null); setReelCaption('');
      setReelSound(''); setReelSoundUrl('');
      toast.success(t('Video uploaded!'));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    }
    finally { setUploading(false); }
  };

  const scrollTo = (index: number) => {
    const nextIndex = index % reels.length;
    setActiveIndex(nextIndex);
    videoRefs.current.forEach((v, i) => { if (v) i === nextIndex ? v.play() : v.pause(); });
  };

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen bg-black">
      <Loader2 className="animate-spin text-white" size={48} />
    </div>
  );

  if (error) return (
    <div className="flex justify-center items-center h-screen bg-black text-white">
      <div className="text-center"><p className="mb-4">{error}</p><button onClick={fetchReels} className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full font-semibold">Retry</button></div>
    </div>
  );

  return (
    <div ref={containerRef} className="h-screen overflow-y-scroll snap-y snap-mandatory bg-black relative scroll-smooth">
      
      {/* TOP BAR */}
      <div className="fixed top-0 left-0 right-0 z-40 px-4 pt-12 pb-2 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 bg-clip-text text-transparent">Reels</span>
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMuted(!isMuted)} className="text-white/80 hover:text-white p-2">
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* UPLOAD BUTTON */}
      <button
        onClick={() => setShowUpload(true)}
        className="fixed bottom-28 right-5 z-40 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white p-4 rounded-full shadow-2xl shadow-pink-500/30 hover:scale-110 transition-all duration-300 active:scale-95"
      >
        <Plus size={26} />
      </button>

      {/* UPLOAD MODAL */}
      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-900 rounded-3xl p-6 max-w-md w-full border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-xl text-white flex items-center gap-2"><Video size={22} className="text-pink-500" /> {t('Upload Reel')}</h3>
                <button onClick={() => setShowUpload(false)} className="text-white/60 hover:text-white"><X size={22} /></button>
              </div>
              <input type="file" accept="video/*" onChange={e => setReelFile(e.target.files?.[0] || null)} className="mb-4 w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-500 file:text-white hover:file:bg-pink-600" />
              <input className="w-full bg-white/10 text-white px-4 py-3 rounded-xl mb-3 text-sm outline-none focus:ring-2 focus:ring-pink-500 placeholder-white/40"  placeholder={t('Write a caption...')} value={reelCaption} onChange={e => setReelCaption(e.target.value)} />
              <button onClick={() => setShowSoundPicker(true)} className="w-full flex items-center gap-2 text-sm text-purple-400 hover:bg-purple-500/10 px-4 py-3 rounded-xl transition mb-4">
                <Music size={18} /> {reelSound ? reelSound : t('Add Sound')}
              </button>
              <div className="flex gap-3">
                <button onClick={uploadReel} disabled={uploading || !reelFile}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-xl font-semibold disabled:opacity-50 hover:shadow-lg hover:shadow-pink-500/25 transition">
                  {uploading ? <Loader2 className="animate-spin mx-auto" size={20} /> : t('Upload')}
                </button>
                <button onClick={() => setShowUpload(false)} className="px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition">{t('Cancel')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REELS */}
      {reels.length === 0 ? (
        <div className="flex justify-center items-center h-full text-white/60">
          <div className="text-center"><Video size={64} className="mx-auto mb-4 opacity-30" /><p className="text-lg">No reels yet.</p><p className="text-sm opacity-50">Be the first to create one!</p></div>
        </div>
      ) : (
        reels.map((reel, idx) => (
          <div key={reel.id} className="relative h-screen w-full snap-start">
            {/* VIDEO */}
            <video
              ref={el => { videoRefs.current[idx] = el; }}
              src={reel.video_url}
              className="absolute inset-0 w-full h-full object-cover"
              loop muted={isMuted}
              autoPlay={idx === 0}
              playsInline
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
              onEnded={() => scrollTo(idx + 1)}
            />

            {/* TAP TO PAUSE OVERLAY */}
            <div className="absolute inset-0 z-5" onClick={() => setIsPlaying(!isPlaying)}>
              <AnimatePresence>
                {!isPlaying && (
                  <motion.div initial={{ opacity: 0, scale: 2 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center">
                    <Play size={80} className="text-white/80 drop-shadow-2xl" fill="white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SOUND LABEL — scrolling marquee */}
            {reel.sound_track && (
              <div className="absolute top-20 right-4 bg-black/40 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-medium z-10 flex items-center gap-2 border border-white/10">
                <Music size={12} className="text-pink-400" />
                <span className="max-w-[120px] truncate">{reel.sound_track}</span>
              </div>
            )}

            {/* TIME + SPEED */}
            <div className="absolute top-20 left-4 z-10 flex items-center gap-2">
              <div className="bg-black/40 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-medium border border-white/10">
                {formatTime(currentTime)} / {formatTime(videoDuration)}
              </div>
              <div className="bg-black/40 backdrop-blur-md rounded-full flex border border-white/10 overflow-hidden">
                {[0.5, 1, 1.5, 2].map(speed => (
                  <button key={speed} onClick={(e) => { e.stopPropagation(); setPlaybackSpeed(speed); }}
                    className={`px-2 py-1.5 text-xs font-medium transition ${playbackSpeed === speed ? 'bg-pink-500 text-white' : 'text-white/70 hover:text-white'}`}>
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* MONETIZED BADGE */}
            {isMonetized(reel) && (
              <div className="absolute top-36 right-4 z-10 bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                💰 Monetized
              </div>
            )}

            {/* VERTICAL ACTION BUTTONS — RIGHT SIDE */}
            <div className="absolute right-4 bottom-40 flex flex-col items-center gap-6 z-10">
              {/* Like */}
              <button onClick={(e) => { e.stopPropagation(); handleLike(reel.id); }} className="flex flex-col items-center gap-1 group">
                <motion.div whileTap={{ scale: 1.3 }} className="relative">
                  <Heart size={34} className={`drop-shadow-lg transition-all ${reel.liked_by_me ? 'fill-red-500 text-red-500' : 'text-white group-hover:text-red-400'}`} />
                  {reel.liked_by_me && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1">
                      <span className="text-xs">❤️</span>
                    </motion.div>
                  )}
                </motion.div>
                <span className="text-xs font-semibold text-white drop-shadow">{reel.likes_count}</span>
              </button>

              {/* Dislike */}
              <button onClick={(e) => { e.stopPropagation(); 
                const newDisliked = new Set(dislikedReels);
                if (newDisliked.has(reel.id)) { newDisliked.delete(reel.id); }
                else { newDisliked.add(reel.id); if (reel.liked_by_me) handleLike(reel.id); }
                setDislikedReels(newDisliked);
                handleDislike(reel.id);
              }} className={`flex flex-col items-center gap-1 transition ${dislikedReels.has(reel.id) ? 'text-red-400' : 'text-white hover:text-gray-400'}`}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill={dislikedReels.has(reel.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="drop-shadow-lg"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></svg>
              </button>

              {/* Comments */}
              <button onClick={(e) => { e.stopPropagation(); setShowComments(showComments === reel.id ? null : reel.id); fetchReelComments(reel.id); }} className="flex flex-col items-center gap-1 text-white hover:text-blue-400 transition">
                <MessageCircle size={34} className="drop-shadow-lg" />
                <span className="text-xs font-semibold drop-shadow">{reel.comments_count}</span>
              </button>

              {/* Share */}
              <button onClick={(e) => { e.stopPropagation(); handleShare(reel.id); }} className="flex flex-col items-center gap-1 text-white hover:text-green-400 transition">
                <Share2 size={34} className="drop-shadow-lg" />
                <span className="text-xs font-semibold drop-shadow">Share</span>
              </button>

              {/* Report */}
              <button onClick={async (e) => { e.stopPropagation();
                try { await api.post(`/content/reels/${reel.id}/report/`, { reason: 'inappropriate' }); toast.success('Reported'); }
                catch { toast.error('Failed to report'); }
              }} className="flex flex-col items-center gap-1 text-white/60 hover:text-red-500 transition">
                <Flag size={26} className="drop-shadow-lg" />
                <span className="text-[10px] drop-shadow">Report</span>
              </button>

              {/* Tip */}
              {isMonetized(reel) && (
                <button onClick={(e) => { e.stopPropagation(); handleTip(reel.id); }} className="flex flex-col items-center gap-1 text-white hover:text-yellow-400 transition">
                  <div className="w-[34px] h-[34px] rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M9.5 8.5c.7-.7 1.5-1 2.5-1 1.4 0 2.5.8 2.5 2s-1.1 2-2.5 2h-.5v2"/><path d="M11 17h1"/></svg>
                  </div>
                  <span className="text-xs font-semibold drop-shadow">Tip</span>
                </button>
              )}
            </div>

            {/* BOTTOM INFO — USER + CAPTION */}
            <div className="absolute bottom-0 left-0 right-0 p-5 pb-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
              <div className="flex items-center gap-3 mb-3">
                {reel.user?.avatar_url ? (
                  <img src={reel.user.avatar_url} className="w-11 h-11 rounded-full object-cover border-2 border-white/80 ring-2 ring-pink-500/50" alt="" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-400 via-red-400 to-yellow-400 flex items-center justify-center text-white font-bold text-lg border-2 border-white/80 ring-2 ring-pink-500/50">
                    {reel.user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">@{reel.user?.username || 'user'}</p>
                  <p className="text-white/85 text-sm leading-snug">{reel.caption}</p>
                  {reel.sound_track && (
                    <div className="flex items-center gap-1 mt-1 text-pink-300 text-xs">
                      <Music size={12} /> {reel.sound_track}
                    </div>
                  )}
                </div>
                <button onClick={(e) => { e.stopPropagation(); setShowDetails(showDetails === reel.id ? null : reel.id); }}
                  className="text-white/50 hover:text-white/90 transition p-1">
                  {showDetails === reel.id ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </button>
              </div>
              {showDetails === reel.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-white/60 text-xs space-y-1 mb-2 pl-14">
                  <p>❤️ {reel.likes_count} likes · 💬 {reel.comments_count} comments · 👁️ {reel.views_count || 0} views</p>
                  {isMonetized(reel) && <p className="text-yellow-400 font-medium">💰 This reel is monetized — support the creator!</p>}
                </motion.div>
              )}
            </div>

            {/* COMMENTS PANEL */}
            <AnimatePresence>
              {showComments === reel.id && (
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
                  className="absolute bottom-0 left-0 right-0 max-h-[60%] bg-black/90 backdrop-blur-xl rounded-t-3xl z-20 overflow-hidden border-t border-white/10">
                  <div className="flex items-center justify-between px-5 pt-4 pb-2">
                    <p className="text-white font-bold text-lg">Comments</p>
                    <button onClick={(e) => { e.stopPropagation(); setShowComments(null); }} className="text-white/60 hover:text-white p-1">
                      <X size={22} />
                    </button>
                  </div>
                  
                  <div className="overflow-y-auto max-h-[calc(60vh-140px)] px-5 pb-2 space-y-4">
                    {(reelComments[reel.id] || []).map((c: any) => (
                      <div key={c.id}>
                        <div className="flex items-start gap-3">
                          {c.user?.avatar_url ? (
                            <img src={c.user.avatar_url} className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-white/20" alt="" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-1 ring-white/20">
                              {c.user?.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-white text-sm font-semibold">{c.user?.username || 'user'}</span>
                              <span className="text-white/70 text-sm">{c.text}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <button onClick={(e) => { e.stopPropagation(); setReplyingTo(replyingTo === c.id ? null : c.id); }}
                                className="text-white/40 text-xs hover:text-white/80">Reply</button>
                              {['❤️', '😂', '🔥', '😢'].map(emoji => {
                                const count = c.reaction_counts?.[emoji] || 0;
                                return (
                                  <button key={emoji} onClick={async (e) => { e.stopPropagation(); 
                                    try { await api.post(`/content/reels/${reel.id}/like_comment/`, { comment_id: c.id, reaction: emoji }); fetchReelComments(reel.id); } catch {}
                                  }} className={`text-xs transition-all flex items-center gap-0.5 ${c.my_reaction === emoji ? 'scale-110 opacity-100' : 'opacity-50 hover:opacity-80'}`}>
                                    {emoji}<span className="text-[10px]">{count}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Replies */}
                            {(c.replies || []).map((r: any) => (
                              <div key={r.id} className="flex items-start gap-2 ml-8 mt-2">
                                {r.user?.avatar_url ? (
                                  <img src={r.user.avatar_url} className="w-5 h-5 rounded-full object-cover flex-shrink-0" alt="" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
                                    {r.user?.username?.[0]?.toUpperCase() || 'U'}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <span className="text-white text-xs font-semibold">{r.user?.username || 'user'}</span>
                                  <span className="text-white/60 text-xs ml-1">{r.text}</span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <button onClick={(e) => { e.stopPropagation(); setReplyingTo(replyingTo === r.id ? null : r.id); }}
                                      className="text-white/30 text-[10px] hover:text-white/70">Reply</button>
                                    {['❤️', '😂', '🔥'].map(emoji => {
                                      const count = r.reaction_counts?.[emoji] || 0;
                                      return (
                                        <button key={emoji} onClick={async (e) => { e.stopPropagation();
                                          try { await api.post(`/content/reels/${reel.id}/like_reply/`, { reply_id: r.id, reaction: emoji }); fetchReelComments(reel.id); } catch {}
                                        }} className={`text-[9px] transition-all ${r.my_reaction === emoji ? 'scale-110 opacity-100' : 'opacity-40 hover:opacity-70'}`}>
                                          {emoji}<span className="text-[7px]">{count}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {replyingTo === r.id && (
                                    <div className="flex gap-1 mt-1">
                                      <input value={replyTexts[r.id] || ''} onChange={e => setReplyTexts(prev => ({ ...prev, [r.id]: e.target.value }))}
                                        placeholder="Reply..." className="flex-1 bg-white/10 text-white px-3 py-1 rounded-full text-xs outline-none"
                                        onKeyDown={e => e.key === 'Enter' && handleReply(reel.id, r.id)} />
                                      <button onClick={() => handleReply(reel.id, r.id)} className="text-pink-400 text-xs font-semibold"><Send size={14} /></button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}

                            {replyingTo === c.id && (
                              <div className="flex gap-1 mt-1 ml-8">
                                <input value={replyTexts[c.id] || ''} onChange={e => setReplyTexts(prev => ({ ...prev, [c.id]: e.target.value }))}
                                  placeholder="Reply..." className="flex-1 bg-white/10 text-white px-3 py-1.5 rounded-full text-xs outline-none"
                                  onKeyDown={e => e.key === 'Enter' && handleReply(reel.id, c.id)} />
                                <button onClick={() => handleReply(reel.id, c.id)} className="text-pink-400 text-xs font-semibold"><Send size={14} /></button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Comment Input */}
                  <div className="flex items-center gap-2 px-5 py-3 border-t border-white/10 bg-black/50">
                    <input value={commentTexts[reel.id] || ''} onChange={e => setCommentTexts(prev => ({ ...prev, [reel.id]: e.target.value }))}
                      placeholder="Add a comment..." className="flex-1 bg-white/15 text-white px-4 py-2.5 rounded-full text-sm outline-none focus:ring-2 focus:ring-pink-500 placeholder-white/40"
                      onKeyDown={e => e.key === 'Enter' && handleComment(reel.id)} />
                    <button onClick={() => handleComment(reel.id)}
                      className="bg-gradient-to-r from-pink-500 to-red-500 text-white p-2.5 rounded-full hover:shadow-lg hover:shadow-pink-500/25 transition">
                      <Send size={18} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))
      )}

      {/* Sound Picker Modal */}
      <AnimatePresence>
        {showSoundPicker && (
          <SoundUploader
            onSelect={(sound) => {
              setReelSound(sound.title);
              setReelSoundUrl(sound.audio_url);
              setShowSoundPicker(false);
            }}
            onClose={() => setShowSoundPicker(false)}
          />
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal amount={paymentAmount} type="donation"
          onSuccess={() => { setShowPayment(false); fetchReels(); toast.success('Tip sent! 💰'); }}
          onClose={() => setShowPayment(false)} />
      )}
    </div>
  );
}