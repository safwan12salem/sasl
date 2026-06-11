/**
 * Sasl - Social Asynchronous Sharing Layer
 * Reels — TikTok-style short video feed with likes, comments, upload, vertical buttons
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Heart, MessageCircle, Share2, Loader2, Video, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PaymentModal from './PaymentModal';

interface Reel {
  id: string;
  user: { username: string; avatar_url?: string };
  video_url: string;
  caption: string;
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
      }));
      if (videoReels.length === 0) {
        videoReels.push({ id: 'demo-reel', user: { username: 'Sasl' }, video_url: 'https://www.w3schools.com/html/mov_bbb.mp4', caption: 'Welcome to Sasl Reels! 🌍✨', likes_count: 120, comments_count: 15, liked_by_me: false, views_count: 1500 });
      }
      setReels(videoReels);
    } catch (err) { setError(t('Could not load reels.')); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { fetchReels(); }, [fetchReels]);

  useEffect(() => {
    videoRefs.current.forEach((v, i) => { if (v) i === activeIndex ? v.play().catch(() => {}) : v.pause(); });
  }, [activeIndex]);

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
    const formData = new FormData();
    formData.append('video', reelFile);
    formData.append('caption', reelCaption);
    try {
      const res = await api.post('/content/reels/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setReels(prev => [res.data, ...prev]);
      setShowUpload(false); setReelFile(null); setReelCaption('');
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const scrollTo = (index: number) => {
    const nextIndex = index % reels.length;
    setActiveIndex(nextIndex);
    videoRefs.current.forEach((v, i) => { if (v) i === nextIndex ? v.play() : v.pause(); });
  };

  if (loading) return <div className="flex justify-center items-center h-screen bg-black"><Loader2 className="animate-spin text-white" size={48} /></div>;
  if (error) return <div className="flex justify-center items-center h-screen bg-black text-white"><div className="text-center"><p className="mb-4">{error}</p><button onClick={fetchReels} className="btn-primary">Retry</button></div></div>;

  return (
    <div ref={containerRef} className="h-screen overflow-y-scroll snap-y snap-mandatory bg-black relative">
      <button onClick={() => setShowUpload(true)} className="fixed bottom-24 right-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-full shadow-xl z-40 hover:scale-110 transition"><Plus size={24} /></button>
      {showUpload && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Video size={20} /> Upload Reel</h3>
            <input type="file" accept="video/*" onChange={e => setReelFile(e.target.files?.[0] || null)} className="mb-3 w-full text-sm" />
            <input className="input-field mb-3" placeholder="Write a caption..." value={reelCaption} onChange={e => setReelCaption(e.target.value)} />
            <div className="flex gap-2"><button onClick={uploadReel} disabled={uploading || !reelFile} className="btn-primary flex-1">{uploading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Upload'}</button><button onClick={() => setShowUpload(false)} className="btn-ghost">Cancel</button></div>
          </div>
        </div>
      )}
      {reels.length === 0 ? (
        <div className="flex justify-center items-center h-full text-white"><p>No reels yet.</p></div>
      ) : (
        reels.map((reel, idx) => (
          <div key={reel.id} className="relative h-screen snap-start">
            <video ref={el => { videoRefs.current[idx] = el; }} src={reel.video_url} className="absolute inset-0 w-full h-full object-cover" loop muted autoPlay={idx === 0} playsInline onEnded={() => scrollTo(idx + 1)} />
            
            {/* VERTICAL BUTTONS - Right */}
            <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-10">
              <button onClick={() => handleLike(reel.id)} className="flex flex-col items-center gap-1 text-white hover:text-red-400 transition">
                <Heart size={32} className={reel.liked_by_me ? 'fill-red-500 text-red-500' : 'text-white drop-shadow-lg'} />
                <span className="text-xs font-semibold">{reel.likes_count}</span>
              </button>
              <button onClick={() => {
  const newDisliked = new Set(dislikedReels);
  if (newDisliked.has(reel.id)) {
    newDisliked.delete(reel.id);
  } else {
    newDisliked.add(reel.id);
    // Remove from liked if present
    if (reel.liked_by_me) handleLike(reel.id);
  }
  setDislikedReels(newDisliked);
  handleDislike(reel.id);
}} className={`flex flex-col items-center gap-1 transition ${dislikedReels.has(reel.id) ? 'text-red-400' : 'text-white hover:text-gray-400'}`}>
  <svg width="32" height="32" viewBox="0 0 24 24" fill={dislikedReels.has(reel.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="drop-shadow-lg"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></svg>
</button>
              <button onClick={() => { setShowComments(showComments === reel.id ? null : reel.id); fetchReelComments(reel.id); }} className="flex flex-col items-center gap-1 text-white hover:text-blue-400 transition">
                <MessageCircle size={32} className="drop-shadow-lg" />
                <span className="text-xs font-semibold">{reel.comments_count}</span>
              </button>
              <button onClick={() => handleShare(reel.id)} className="flex flex-col items-center gap-1 text-white hover:text-green-400 transition">
                <Share2 size={32} className="drop-shadow-lg" />
                <span className="text-xs font-semibold">Share</span>
              </button>
              {isMonetized(reel) && (
                <button onClick={() => handleTip(reel.id)} className="flex flex-col items-center gap-1 text-white hover:text-yellow-400 transition">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-lg"><circle cx="12" cy="12" r="10"/><path d="M9.5 8.5c.7-.7 1.5-1 2.5-1 1.4 0 2.5.8 2.5 2s-1.1 2-2.5 2h-.5v2"/><path d="M11 17h1"/></svg>
                  <span className="text-xs font-semibold">Tip</span>
                </button>
              )}
            </div>

            {/* MONETIZED BADGE */}
            {isMonetized(reel) && (
              <div className="absolute top-16 right-4 z-10 bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M9.5 8.5c.7-.7 1.5-1 2.5-1 1.4 0 2.5.8 2.5 2s-1.1 2-2.5 2h-.5v2M11 17h1" fill="none" stroke="black" strokeWidth="2"/></svg>
                Monetized
              </div>
            )}

            {/* BOTTOM INFO */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <div className="flex items-center gap-3 mb-2">
                {reel.user?.avatar_url ? (
                  <img src={reel.user.avatar_url} className="w-12 h-12 rounded-full object-cover border-2 border-white" alt="" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg border-2 border-white">{reel.user?.username?.[0]?.toUpperCase() || 'U'}</div>
                )}
                <div>
                  <p className="font-bold text-white">@{reel.user?.username || 'user'}</p>
                  <p className="text-white/80 text-sm">{reel.caption}</p>
                </div>
              </div>
              <button onClick={() => setShowDetails(showDetails === reel.id ? null : reel.id)} className="text-white/60 text-xs hover:text-white/90 transition">
                {showDetails === reel.id ? 'Hide details ▲' : 'See details ▼'}
              </button>
              {showDetails === reel.id && (
                <div className="mt-1 text-white/70 text-xs space-y-0.5">
                  <p>❤️ {reel.likes_count} likes · 💬 {reel.comments_count} comments · 👁️ {reel.views_count || 0} views</p>
                  {isMonetized(reel) && <p className="text-yellow-400">💰 This reel is monetized — support the creator with a tip!</p>}
                </div>
              )}
            </div>

            {/* COMMENTS */}
            {showComments === reel.id && (
              <div className="absolute bottom-24 left-4 right-16 max-h-56 overflow-y-auto bg-black/80 rounded-xl p-3 z-20">
                <button onClick={(e) => { e.stopPropagation(); setShowComments(null); }} className="absolute top-2 right-2 text-white/60 hover:text-white">✕</button>
                <p className="text-white text-xs font-semibold mb-2">Comments</p>
                           

                           {(reelComments[reel.id] || []).map((c: any) => (
  <div key={c.id} className="mb-2">
    <div className="flex items-start gap-2">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{c.user?.username?.[0]?.toUpperCase() || 'U'}</div>
      <div className="flex-1">
        <span className="text-white text-xs font-semibold">{c.user?.username || 'user'}</span>
        <span className="text-white/70 text-xs ml-2">{c.text}</span>
        <button onClick={(e) => { e.stopPropagation(); setReplyingTo(replyingTo === c.id ? null : c.id); }} className="text-white/40 text-[10px] ml-2 hover:text-white/80">Reply</button>
        {/* EMOJI REACTIONS ON COMMENTS */}
        <div className="flex items-center gap-1 mt-1">
          {['❤️', '😂', '🔥', '😢'].map(emoji => {
            const count = c.reaction_counts?.[emoji] || 0;
            const isMyReaction = c.my_reaction === emoji;
            return (
              <button key={emoji} onClick={async (e) => { e.stopPropagation(); try { await api.post(`/content/reels/${reel.id}/like_comment/`, { comment_id: c.id, reaction: emoji }); fetchReelComments(reel.id); } catch {} }}
                className={`text-[11px] transition-all flex items-center gap-0.5 px-1 py-0.5 rounded-full ${isMyReaction ? 'bg-white/20 scale-110' : 'opacity-50 hover:opacity-80'}`}>
                {emoji}<span className="text-[9px] font-semibold">{count}</span>
              </button>
            );
          })}
        </div>

{(c.replies || []).map((r: any) => (
  <div key={r.id} className="flex items-start gap-2 ml-6 mt-1">
    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
      {r.user?.username?.[0]?.toUpperCase() || 'U'}
    </div>
    <div>
      <span className="text-white text-[10px] font-semibold">{r.user?.username || 'user'}</span>
      <span className="text-white/60 text-[10px] ml-1">{r.text}</span>
      <button onClick={(e) => { e.stopPropagation(); setReplyingTo(replyingTo === r.id ? null : r.id); setReplyTexts(prev => ({ ...prev, [r.id]: '' })); }}
        className="text-white/40 text-[8px] ml-1 hover:text-white/80">Reply</button>
      {/* Emoji reactions on replies */}
      <div className="flex items-center gap-1 mt-0.5">
        {['❤️', '😂', '🔥'].map(emoji => {
          const count = r.reaction_counts?.[emoji] || 0;
          return (
            <button key={emoji} onClick={async (e) => { e.stopPropagation(); try { await api.post(`/content/reels/${reel.id}/like_reply/`, { reply_id: r.id, reaction: emoji }); fetchReelComments(reel.id); } catch {} }}
              className={`text-[9px] transition-all flex items-center gap-0.5 px-1 py-0.5 rounded-full ${r.my_reaction === emoji ? 'bg-white/20 scale-110' : 'opacity-50 hover:opacity-80'}`}>
              {emoji}<span className="text-[7px]">{count}</span>
            </button>
          );
        })}
      </div>
      {/* Reply input for reply */}
      {replyingTo === r.id && (
        <div className="flex gap-1 mt-1">
          <input value={replyTexts[r.id] || ''} onChange={e => setReplyTexts(prev => ({ ...prev, [r.id]: e.target.value }))}
            placeholder="Reply..." className="flex-1 bg-white/10 text-white px-2 py-0.5 rounded-full text-[8px] outline-none"
            onKeyDown={e => e.key === 'Enter' && handleReply(reel.id, r.id)} />
          <button onClick={() => handleReply(reel.id, r.id)} className="text-green-400 text-[8px] font-semibold">Send</button>
        </div>
      )}
    </div>
  </div>
))}

                        {replyingTo === c.id && (
                          <div className="flex gap-1 mt-1">
                            <input value={replyTexts[c.id] || ''} onChange={e => setReplyTexts(prev => ({ ...prev, [c.id]: e.target.value }))} placeholder="Reply..." className="flex-1 bg-white/10 text-white px-2 py-1 rounded-full text-[10px] outline-none" onKeyDown={e => e.key === 'Enter' && handleReply(reel.id, c.id)} />
                            <button onClick={() => handleReply(reel.id, c.id)} className="text-green-400 text-[10px] font-semibold">Send</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 mt-2 pt-2 border-t border-white/10">
                  <input value={commentTexts[reel.id] || ''} onChange={e => setCommentTexts(prev => ({ ...prev, [reel.id]: e.target.value }))} placeholder="Add a comment..." className="flex-1 bg-white/20 text-white px-3 py-2 rounded-full text-xs outline-none" onKeyDown={e => e.key === 'Enter' && handleComment(reel.id)} />
                  <button onClick={() => handleComment(reel.id)} className="bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold">Post</button>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* PAYMENT MODAL - Tip Creator */}
      <PaymentModal
        amount={paymentAmount}
        type="tip"
        onSuccess={async () => {
          if (tipReelId) {
            try {
              await api.post(`/content/reels/${tipReelId}/tip/`, { amount: paymentAmount });
              toast.success('Tip sent! 🎉');
            } catch {
              toast.error('Tip failed');
            }
          }
          setShowPayment(false);
          setTipReelId(null);
        }}
        onClose={() => {
          setShowPayment(false);
          setTipReelId(null);
        }}
      />
    </div>
  );
}