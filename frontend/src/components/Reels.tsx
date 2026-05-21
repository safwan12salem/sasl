import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Heart, MessageCircle, Share2, Loader2 } from 'lucide-react';
import { db } from '../services/offlineDB';
import { useTranslation } from 'react-i18next';
import { Video } from 'lucide-react';

interface Reel {
  id: string;
  user: { username: string; avatar_url?: string };
  video_url: string;
  caption: string;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
}

export default function Reels() {
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [showUpload, setShowUpload] = useState(false);
const [reelFile, setReelFile] = useState<File | null>(null);
const [reelCaption, setReelCaption] = useState('');
const [uploading, setUploading] = useState(false);
  const { t } = useTranslation();
const uploadReel = async () => {
  if (!reelFile) return toast.error('Select a video');
  setUploading(true);
  const formData = new FormData();
  formData.append('video', reelFile);
  formData.append('caption', reelCaption);
  try {
    await api.post('/content/reels/', formData);
    toast.success('Reel uploaded!');
    setShowUpload(false);
    fetchReels();
  } catch (err: any) {
    toast.error(err.response?.data?.detail || 'Upload failed');
  } finally {
    setUploading(false);
  }
};
  
  const fetchReels = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const res = await api.get('/content/reels/');
    const raw = res.data.results || res.data || [];

    // map to a uniform shape
    let videoReels: any[] = raw
      .filter((r: any) => r.video_url)
      .map((r: any) => ({
        id: r.id,
        user: r.user || { username: 'unknown' },
        video_url: r.video_url,
        caption: r.caption || '',
        likes_count: r.likes_count || 0,
        comments_count: r.comments_count || 0,
        liked_by_me: false,
      }));

    // -------- FALLBACK: show a demo reel if list is empty --------
    if (videoReels.length === 0) {
      videoReels.push({
        id: 'demo-reel',
        user: { username: 'sasl_demo' },
        video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',  // public domain video
        caption: 'Welcome to Sasl Reels! 🌍✨',
        likes_count: 120,
        comments_count: 15,
        liked_by_me: false,
      });
    }

    setReels(videoReels);
    // cache for offline
    for (const r of videoReels) {
      await db.posts.put({
        id: r.id, text: r.caption || '', author: r.user?.username || '',
        media_url: r.video_url,
        likes_count: r.likes_count, comments_count: r.comments_count,
        shares_count: 0, created_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    setError('Could not load reels. Please try again.');
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => { fetchReels(); }, [fetchReels]);

  const handleLike = async (reelId: string) => {
    try {
      const res = await api.post(`/content/posts/${reelId}/like/`);
      setReels(prev => prev.map(r => r.id === reelId ? {
        ...r,
        likes_count: res.data.likes_count,
        liked_by_me: res.data.status === 'liked',
      } : r));
    } catch { }
  };

  const scrollTo = (index: number) => {
    const nextIndex = index % reels.length;
    // pause all, play the target
    videoRefs.current.forEach((v, i) => {
      if (v) {
        i === nextIndex ? v.play() : v.pause();
      }
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-black">
        <Loader2 className="animate-spin text-white" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-black text-white">
        <div className="text-center">
          <p className="mb-4">{error}</p>
          <button onClick={fetchReels} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen bg-black text-white">
        <p>No reels yet. Be the first to create one!</p>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-scroll snap-y snap-mandatory bg-black">
             
             {showUpload && (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
      <h3 className="font-bold mb-4">Upload Reel</h3>
      <input type="file" accept="video/*" onChange={e => setReelFile(e.target.files?.[0] || null)} className="mb-2" />
      <input className="input-field mb-2" placeholder="Caption..." value={reelCaption} onChange={e => setReelCaption(e.target.value)} />
      <div className="flex gap-2">
        <button onClick={uploadReel} disabled={uploading} className="btn-primary flex-1">
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <button onClick={() => setShowUpload(false)} className="btn-ghost">Cancel</button>
      </div>
    </div>
  </div>
)}


      {reels.map((reel, idx) => (
        <div key={reel.id} className="relative h-screen snap-start">
          <video
            ref={el => { videoRefs.current[idx] = el; }}
            src={reel.video_url}
            className="absolute inset-0 w-full h-full object-cover"
            loop
            muted
            autoPlay={idx === 0}
            onEnded={() => scrollTo(idx + 1)}
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-400" />
              <span className="font-bold">@{reel.user?.username || 'user'}</span>
            </div>
            <p className="mt-1 text-sm">{reel.caption}</p>
            <div className="flex gap-4 mt-2">
              <button onClick={() => handleLike(reel.id)} className="flex items-center gap-1">
                <Heart size={20} className={reel.liked_by_me ? 'fill-red-500' : ''} /> {reel.likes_count}
              </button>
              <button className="flex items-center gap-1"><MessageCircle size={20} /> {reel.comments_count}</button>
              <button className="flex items-center gap-1"><Share2 size={20} /></button>
              <button onClick={() => setShowUpload(true)} className="fixed bottom-20 right-4 bg-green-500 text-white p-3 rounded-full shadow-lg z-40">
  <Video size={24} />
</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}