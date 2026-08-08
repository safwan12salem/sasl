/**
 * Sasl Snap — Legendary Edition
 * Better than Snapchat: Streak rewards, tips, challenges, group streaks, drafts
 *//**
 * Sasl Snap — Legendary Edition
 * Better than Snapchat: Streak rewards, tips, challenges, group streaks, drafts
 */
import AdBanner from './AdBanner';
import React, { useRef, useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Camera, Video, X, Loader2, Send, RotateCcw, Zap,
  Users, Inbox, PenTool, Play, Pause, Plus, Music,
  Trophy, UserPlus, FileText, DollarSign, TrendingUp, Flame, Clock,ImageIcon
} from 'lucide-react';
import SoundUploader from './SoundUploader';
import { Sound } from '../services/soundLibrary';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { uploadFile } from '../services/uploadService';

interface Snap {
  id: string;
  sender_name: string;
  sender_avatar?: string;
  receiver_name?: string;
  video_url?: string;
  image_url?: string;
  media_url?: string;
  caption?: string;
  viewed: boolean;
  created_at: string;
  duration?: number;
  tip_amount?: number;
  screenshot_count?: number;
  view_count?: number;
  reactions?: Record<string, number>;
  is_draft?: boolean;
}

interface SnapStreak {
  id: string;
  other_user: string;
  current_streak: number;
  longest_streak: number;
  last_snap_date: string;
  total_reward_earned?: number;
}

interface SnapStory {
  id: string;
  user: { username: string; avatar_url?: string };
  media_url: string;
  caption?: string;
  expires_at: string;
  views_count: number;
}

type SnapMode = 'camera' | 'inbox' | 'stories' | 'streaks' | 'challenges' | 'groups' | 'drafts';

export default function SnapSender() {
  const { t } = useTranslation();

  // Camera states
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'image'>('image');
  const [uploading, setUploading] = useState(false);
  const [receiver, setReceiver] = useState('');
  const [caption, setCaption] = useState('');
  const [duration, setDuration] = useState(11);
  const [filter, setFilter] = useState('none');
  const [drawingMode, setDrawingMode] = useState(false);
  
  // Data states
  const [mode, setMode] = useState<SnapMode>('camera');
  const [inboxTab, setInboxTab] = useState<'received' | 'sent'>('received');
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [sentSnaps, setSentSnaps] = useState<Snap[]>([]);
  const [viewingSnap, setViewingSnap] = useState<Snap | null>(null);
  const [snapTimer, setSnapTimer] = useState<number>(0);
  const [streaks, setStreaks] = useState<SnapStreak[]>([]);
  const [stories, setStories] = useState<SnapStory[]>([]);
  const [viewingStory, setViewingStory] = useState<SnapStory | null>(null);
  const [showStoryForm, setShowStoryForm] = useState(false);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState<string | null>(null);
  const [recentContacts, setRecentContacts] = useState<{ id: string; username: string; avatar?: string }[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [groupStreaks, setGroupStreaks] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Snap[]>([]);

  // Group creation modal
    const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [selectedSound, setSelectedSound] = useState<Sound | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState('');
  const [storySound, setStorySound] = useState('');
  const [sendMode, setSendMode] = useState<'user' | 'group'>('user');

  const FILTERS = [
    { name: 'none', label: t('Normal'), style: '' },
    { name: 'grayscale', label: t('B&W'), style: 'grayscale(100%)' },
    { name: 'sepia', label: t('Sepia'), style: 'sepia(100%)' },
    { name: 'vintage', label: t('Vintage'), style: 'sepia(50%) hue-rotate(-20deg) brightness(0.9)' },
    { name: 'cool', label: t('Cool'), style: 'hue-rotate(180deg) brightness(1.1)' },
    { name: 'warm', label: t('Warm'), style: 'hue-rotate(-30deg) brightness(1.1) saturate(1.5)' },
  ];

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: mediaType === 'video',
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch { toast.error(t('Camera access failed')); }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const flipCamera = () => { stopCamera(); setFacingMode(prev => prev === 'user' ? 'environment' : 'user'); setTimeout(startCamera, 300); };

  const capturePhoto = () => {
    const video = videoRef.current; const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.filter = FILTERS.find(f => f.name === filter)?.style || 'none';
    if (facingMode === 'user') { ctx.save(); ctx.scale(-1, 1); ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height); ctx.restore(); }
    else ctx.drawImage(video, 0, 0);
    canvas.toBlob(b => { if (b) { setBlob(b); setMediaType('image'); } }, 'image/jpeg', 0.9);
  };

  const startRecording = () => {
    const stream = videoRef.current?.srcObject as MediaStream; if (!stream) return;
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => { setBlob(new Blob(chunks, { type: 'video/webm' })); setMediaType('video'); };
    recorder.start(); setRecording(true);
    setTimeout(() => { recorder.stop(); setRecording(false); }, duration * 1000);
  };

  // Send snap
  const sendSnap = async () => {
    if (!blob || !receiver.trim()) return toast.error(t('Capture content and enter a username'));
    setUploading(true);
    try {
           // Upload to Supabase first
      const fileName = `snaps/${Date.now()}_snap.${mediaType === 'video' ? 'webm' : 'jpg'}`;
      const file = new File([blob], fileName, { type: mediaType === 'video' ? 'video/webm' : 'image/jpeg' });
      const mediaUrl = await uploadFile(file, 'snaps');
      
           // Send URL to backend - user or group
      if (sendMode === 'group') {
        await api.post('/snaps/snaps/send_to_group/', {
          group_id: receiver,
          media_url: mediaUrl,
          caption: caption,
        });
        toast.success(t(`Snap sent to group! 📸`));
      } else {
        await api.post('/snaps/snaps/', {
          media_url: mediaUrl,
          receiver_username: receiver,
          caption: caption,
        });
        toast.success(t('Snap sent! 📸'));
      }
      setBlob(null); setReceiver(''); setCaption(''); fetchSnaps();
    } catch (err: any) { 
  console.log('Snap error:', err.response?.data);
  toast.error(JSON.stringify(err.response?.data) || t('Failed to send snap')); 
}
    finally { setUploading(false); }
  };

  // Fetch functions
  const fetchSnaps = async () => {
    try { const res = await api.get('/snaps/snaps/inbox/'); setSnaps(res.data?.received || []); setSentSnaps(res.data?.sent || []); } catch {}
  };
  const fetchStreaks = async () => {
    try { const res = await api.get('/snaps/snaps/streaks/'); setStreaks(res.data || []); } catch {}
  };
  const fetchStories = async () => {
    try { const res = await api.get('/snaps/snaps/stories/'); setStories(res.data || []); } catch {}
  };
  const fetchContacts = async () => {
    try { const res = await api.get('/snaps/snaps/recent_contacts/'); setRecentContacts(res.data || []); } catch {}
  };
  const fetchChallenges = async () => {
    try { const res = await api.get('/snaps/snaps/challenges/'); setChallenges(res.data || []); } catch {}
  };
  const fetchGroupStreaks = async () => {
    try { const res = await api.get('/snaps/snaps/group_streaks/'); setGroupStreaks(res.data || []); } catch {}
  };
  const fetchDrafts = async () => {
    try { const res = await api.get('/snaps/snaps/inbox/'); setDrafts(res.data?.drafts || []); } catch {}
  };

  useEffect(() => { fetchSnaps(); fetchStreaks(); fetchStories(); fetchContacts(); fetchChallenges(); fetchGroupStreaks(); fetchDrafts(); }, []);

  // View snap
  const viewSnap = (snap: Snap) => {
    setViewingSnap(snap); setSnapTimer(snap.duration || 11);
    const timer = setInterval(() => { setSnapTimer(prev => { if (prev <= 1) { clearInterval(timer); setViewingSnap(null); return 0; } return prev - 1; }); }, 1000);
    api.post(`/snaps/snaps/${snap.id}/mark_viewed/`);
  };

  // Post story
    const postStory = async () => {
    if (!storyFile) return toast.error(t('Select an image or video'));
       // Upload to Supabase first
    const mediaUrl = await uploadFile(storyFile, 'stories');
    
    try {
      await api.post('/snaps/snaps/post_story/', {
        media_url: mediaUrl,
        caption: caption,
        sound_track: storySound,
        sound_url: selectedSound?.audio_url || ''
      });
      toast.success(t('Story posted! 📖'));
      setShowStoryForm(false); setStoryFile(null); setStoryPreview(null); setStorySound(''); setSelectedSound(null); fetchStories();
    } catch { toast.error(t('Failed to post story')); }
  };

  // Create group streak
  const createGroupStreak = async () => {
    if (!groupName.trim()) return toast.error(t('Group name required'));
    try {
      const members = groupMembers.split(',').map(m => m.trim()).filter(Boolean);
      await api.post('/snaps/snaps/create_group_streak/', { name: groupName, members });
      toast.success(t('Group created!'));
      setShowCreateGroup(false); setGroupName(''); setGroupMembers('');
      fetchGroupStreaks();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('Failed to create group'));
    }
  };

  // Tip a snap
  const tipSnap = async (snapId: string, amount: number) => {
    try {
      await api.post(`/snaps/snaps/${snapId}/tip/`, { amount });
      toast.success(`Tipped $${amount}! 💸`);
      fetchSnaps();
    } catch { toast.error(t('Tip failed')); }
  };

  const tabs: { key: SnapMode; icon: JSX.Element; label: string }[] = [
    { key: 'camera', icon: <Camera size={16} />, label: t('Camera') },
    { key: 'inbox', icon: <Inbox size={16} />, label: `${snaps.length}` },
    { key: 'stories', icon: <Play size={16} />, label: t('Stories') },
    { key: 'streaks', icon: <Flame size={16} />, label: t('Streaks') },
    { key: 'challenges', icon: <Trophy size={16} />, label: t('Challenges') },
    { key: 'groups', icon: <UserPlus size={16} />, label: t('Groups') },
    { key: 'drafts', icon: <FileText size={16} />, label: t('Drafts') },
  ];

  return (
    <div className="max-w-md mx-auto p-4">
   
      <h2 className="text-3xl font-bold gradient-text mb-4 flex items-center gap-2">
        <Camera className="text-yellow-500" /> {t('Snap')}
      </h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-4 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              mode === tab.key ? 'bg-white dark:bg-gray-700 shadow text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ===== CAMERA TAB ===== */}
      {mode === 'camera' && (
        <div>
          <div className="relative bg-black rounded-2xl overflow-hidden mb-4 aspect-[9/16] max-h-[60vh]">
            <video
              ref={videoRef} autoPlay muted playsInline
              className="w-full h-full object-cover"
              style={{ filter: FILTERS.find(f => f.name === filter)?.style, transform: facingMode === 'user' ? 'scaleX(-1)' : '' }}
            />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            {recording && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> REC
              </div>
            )}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              {!cameraActive ? (
                <button onClick={startCamera} className="bg-white text-gray-800 p-4 rounded-full shadow-lg">
                  <Camera size={24} />
                </button>
              ) : (
                <>
                  <button onClick={flipCamera} className="bg-black/40 text-white p-3 rounded-full"><RotateCcw size={22} /></button>
                  <button
                    onClick={mediaType === 'video' ? startRecording : capturePhoto}
                    className={`p-5 rounded-full border-4 border-white shadow-lg transition ${recording ? 'bg-red-500 scale-110' : 'bg-white'}`}
                  >
                    {recording ? <Pause size={24} className="text-white" /> : mediaType === 'video' ? <Video size={24} /> : <Camera size={24} />}
                  </button>
                  <button onClick={() => setDrawingMode(!drawingMode)} className={`p-3 rounded-full ${drawingMode ? 'bg-yellow-500 text-white' : 'bg-black/40 text-white'}`}>
                    <PenTool size={20} />
                  </button>
                  <label className="bg-black/40 text-white p-3 rounded-full cursor-pointer hover:bg-black/60 transition">
  <ImageIcon size={20} />
  <input type="file" accept="image/*,video/*" className="hidden" onChange={async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBlob(file);
    setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
  }} />
</label>
                </>
                            
              )}
            </div>
            {cameraActive && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2">
                <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-black/60 text-white text-xs rounded-full px-3 py-1.5 border-none outline-none">
                  {FILTERS.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
                </select>
                <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="bg-black/60 text-white text-xs rounded-full px-3 py-1.5 border-none outline-none">
                  {[3, 5, 10, 15, 30].map(d => <option key={d} value={d}>{d}s</option>)}
                </select>
              </div>
            )}
          </div>

          {blob && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-4 rounded-2xl space-y-3 relative">
              <button onClick={() => setBlob(null)} className="absolute top-4 right-4 bg-red-500 text-white rounded-full p-1 shadow z-10"><X size={14} /></button>
              {mediaType === 'video' ? (
                <video src={URL.createObjectURL(blob)} controls className="w-full rounded-lg max-h-48" />
              ) : (
                <img src={URL.createObjectURL(blob)} alt="Captured" className="w-full rounded-lg max-h-48 object-cover" />
              )}
              <input value={caption} onChange={e => setCaption(e.target.value)} placeholder={t('Add a caption...')} className="input-field text-sm" />
              <div>
                <p className="text-xs text-gray-500 mb-2 font-semibold">{t('Send to:')}</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {recentContacts.length > 0 ? recentContacts.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setReceiver(c.username)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                        receiver === c.username ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg scale-105' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 flex items-center justify-center text-white text-xs font-bold">
                        {c.username[0]?.toUpperCase()}
                      </div>
                      @{c.username}
                    </button>
                  )) : <p className="text-xs text-gray-400 italic">{t('No recent contacts. Enter a username below.')}</p>}
                </div>
                                {/* Send Mode Toggle */}
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => { setSendMode('user'); setReceiver(''); }} 
                    className={`text-xs px-3 py-1 rounded-full ${sendMode === 'user' ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}>
                    👤 User
                  </button>
                  <button onClick={() => { setSendMode('group'); setReceiver(''); }} 
                    className={`text-xs px-3 py-1 rounded-full ${sendMode === 'group' ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}>
                    👥 Group
                  </button>
                </div>
                
                {sendMode === 'user' ? (
                  <input value={receiver} onChange={e => setReceiver(e.target.value)} placeholder={t('Or type any username...')} className="input-field flex-1 text-sm rounded-full mt-2" />
                ) : (
                  <select value={receiver} onChange={e => setReceiver(e.target.value)} className="input-field flex-1 text-sm rounded-full mt-2">
                    <option value="">Select a group...</option>
                    {groupStreaks.map((g: any) => (
                      <option key={g.id} value={g.id}>{g.name} ({g.member_count} members)</option>
                    ))}
                  </select>
                )}
              </div>
              <button onClick={() => setShowSoundPicker(true)} className={`p-2 rounded-full text-sm ${selectedSound ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
  <Music size={18} />
</button>
              <button
                onClick={sendSnap}
                disabled={uploading || !receiver.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-lg font-bold rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 shadow-xl disabled:opacity-50"
              >
                {uploading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                {receiver.trim() ? `${t('Send to')} @${receiver}` : t('Send Snap')} 🔥
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* ===== INBOX TAB ===== */}
      {mode === 'inbox' && (
        <div className="space-y-3">
          <div className="flex gap-2 mb-3">
            <button onClick={() => setInboxTab('received')} className={`px-3 py-1 rounded-full text-xs font-semibold ${inboxTab === 'received' ? 'bg-yellow-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{t('Received')} ({snaps.length})</button>
            <button onClick={() => setInboxTab('sent')} className={`px-3 py-1 rounded-full text-xs font-semibold ${inboxTab === 'sent' ? 'bg-yellow-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{t('Sent')} ({sentSnaps.length})</button>
          </div>
          {(inboxTab === 'received' ? snaps : sentSnaps).length === 0 ? (
            <div className="glass p-8 rounded-2xl text-center">
              <Inbox size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">{t('No new snaps')}</p>
            </div>
          ) : (
            <div className="space-y-2">
             {(inboxTab === 'received' ? snaps : sentSnaps).map(snap => (
                <motion.div
                  key={snap.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  className={`glass p-3 rounded-xl flex items-center gap-3 cursor-pointer ${!snap.viewed ? 'ring-2 ring-red-300 bg-red-50 dark:bg-red-900/20' : 'opacity-75'}`}
                  onClick={() => viewSnap(snap)}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-red-500 flex items-center justify-center text-white font-bold">
                    {snap.sender_name[0]?.toUpperCase()}
                  </div>
                               <div className="flex-1">
                    <p className="font-semibold text-sm">{snap.sender_name}</p>
                    <p className="text-xs text-gray-500">{snap.caption || '📸 Snap'} · {new Date(snap.created_at).toLocaleTimeString()}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">👁️ {snap.view_count || 0}</span>
                      {snap.reactions && Object.entries(snap.reactions).map(([emoji, count]) => (
                        <span key={emoji} className="text-xs">{emoji}{count}</span>
                      ))}
                    </div>
                  </div>
                  {!snap.viewed && <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== STORIES TAB ===== */}
      {mode === 'stories' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">{t('Stories')}</h3>
            <button onClick={() => setShowStoryForm(true)} className="btn-primary text-xs flex items-center gap-1"><Plus size={14} /> {t('Add Story')}</button>
          </div>
          {showStoryForm && (
            <div className="glass p-4 rounded-2xl mb-4 space-y-2">
              <input type="file" accept="image/*,video/*" onChange={e => { const file = e.target.files?.[0]; if (file) { setStoryFile(file); setStoryPreview(URL.createObjectURL(file)); } }} className="text-sm" />
                            <button onClick={() => setShowSoundPicker(true)} className="flex items-center gap-2 text-sm text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-3 py-2 rounded-xl transition">
                <Music size={16} /> {storySound ? storySound : t('Add Sound')}
              </button>
              {storyPreview && (
                storyFile?.type.startsWith('video/') ? <video src={storyPreview || ''} controls className="w-full h-32 object-cover rounded-lg" /> : <img src={storyPreview || ''} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
              )}
              <div className="flex gap-2">
                <button onClick={postStory} className="btn-primary flex-1 text-sm">{t('Post Story')}</button>
                <button onClick={() => { setShowStoryForm(false); setStoryFile(null); setStoryPreview(null); }} className="btn-ghost text-sm">{t('Cancel')}</button>
              </div>
            </div>
          )}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {stories.length === 0 ? (
              <p className="text-gray-400 text-sm py-4">{t('No stories yet')}</p>
            ) : (
              stories.map(story => (
                <div key={story.id} className="flex-shrink-0 cursor-pointer" onClick={() => setViewingStory(story)}>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-yellow-500 p-[3px]">
                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-200">
                      {story.media_url ? (
                        story.media_url.match(/\.(mp4|webm|mov)$/i) ? <video src={story.media_url} className="w-full h-full object-cover" muted /> : <img src={story.media_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📖</div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-center mt-1 truncate w-16">{story.user?.username || 'user'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===== STREAKS TAB ===== */}
      {mode === 'streaks' && (
        <div>
          <h3 className="font-bold mb-3 flex items-center gap-2"><Flame size={18} className="text-orange-500" /> {t('Snap Streaks')}</h3>
          {streaks.length === 0 ? (
            <div className="glass p-8 rounded-2xl text-center">
              <Flame size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-semibold">{t('No streaks yet')}</p>
              <p className="text-sm text-gray-400 mt-1">{t('Send snaps daily to build streaks!')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {streaks.map(streak => (
                <div key={streak.id} className="glass p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold">
                      {streak.other_user?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">@{streak.other_user}</p>
                      <p className="text-xs text-gray-500">{t('Last snap')}: {new Date(streak.last_snap_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-500 flex items-center gap-1">
                      <Flame size={20} className="fill-orange-400 text-orange-400" /> {streak.current_streak}
                    </p>
                    <p className="text-xs text-gray-400">{t('Best')}: {streak.longest_streak}</p>
                    {(streak.total_reward_earned || 0) > 0 && (
                      <p className="text-xs text-green-500 font-semibold">+${streak.total_reward_earned}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== CHALLENGES TAB ===== */}
      {mode === 'challenges' && (
        <div>
          <h3 className="font-bold mb-3 flex items-center gap-2"><Trophy size={18} className="text-yellow-500" /> {t('Snap Challenges')}</h3>
          <p className="text-xs text-gray-500 mb-3">🏆 {t('Enter daily challenges and win prizes!')}</p>
          {challenges.length === 0 ? (
            <div className="glass p-8 rounded-2xl text-center">
              <Trophy size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-semibold">{t('No active challenges')}</p>
              <p className="text-sm text-gray-400 mt-1">{t('Check back soon for new challenges!')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {challenges.map((ch: any) => (
                <div key={ch.id} className="glass p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm">{ch.name}</p>
                    <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full font-semibold">
                      💰 ${ch.prize_pool}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{ch.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{ch.entries_count || 0} {t('entries')}</span>
                    <span>{t('Ends')}: {new Date(ch.ends_at).toLocaleDateString()}</span>
                  </div>
                  <button onClick={async () => {
  const snapId = prompt('Enter your snap ID to submit:');
  if (snapId) {
    try {
      await api.post('/snaps/snaps/enter_challenge/', { challenge_id: ch.id, snap_id: snapId });
      toast.success('🎉 Entered challenge!');
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to enter'); }
  }
}} className="w-full mt-2 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg text-xs font-semibold hover:from-yellow-600 hover:to-orange-600">
  {t('Enter Challenge')}
</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== GROUPS TAB ===== */}
      {mode === 'groups' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2"><UserPlus size={18} className="text-purple-500" /> {t('Group Streaks')}</h3>
            <button onClick={() => setShowCreateGroup(true)} className="text-xs bg-purple-500 text-white px-3 py-1 rounded-full font-semibold">
              + {t('Create')}
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">👥 {t('Snap with multiple friends and earn together!')}</p>
          {groupStreaks.length === 0 ? (
            <div className="glass p-8 rounded-2xl text-center">
              <Users size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-semibold">{t('No group streaks')}</p>
              <p className="text-sm text-gray-400 mt-1">{t('Create a group and start snapping together!')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groupStreaks.map((gs: any) => (
                <div key={gs.id} className="glass p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{gs.name}</p>
                    <p className="text-xs text-gray-500">{gs.member_count} {t('members')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-purple-500">🔥 {gs.current_streak}</p>
                    <p className="text-xs text-gray-400">${gs.total_reward_earned || 0}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== DRAFTS TAB ===== */}
      {mode === 'drafts' && (
        <div>
          <h3 className="font-bold mb-3 flex items-center gap-2"><FileText size={18} className="text-gray-500" /> {t('Snap Drafts')}</h3>
          <p className="text-xs text-gray-500 mb-3">📝 {t('Finish and send your saved snaps')}</p>
          {drafts.length === 0 ? (
            <div className="glass p-8 rounded-2xl text-center">
              <FileText size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-semibold">{t('No drafts')}</p>
              <p className="text-sm text-gray-400 mt-1">{t('Save snaps as drafts to send later!')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {drafts.map((draft: any) => (
                <div key={draft.id} className="glass p-3 rounded-xl flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                    {draft.image_url ? <img src={draft.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Camera size={20} className="text-gray-400" /></div>}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{draft.caption || t('Untitled snap')}</p>
                    <p className="text-xs text-gray-400">{new Date(draft.created_at).toLocaleDateString()}</p>
                  </div>
                  <button className="text-xs bg-sasl-green text-white px-3 py-1 rounded-full">{t('Send')}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== CREATE GROUP MODAL ===== */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateGroup(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><UserPlus size={20} className="text-purple-500" /> {t('Create Group Streak')}</h3>
              <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 mb-3 text-sm outline-none focus:border-purple-500" placeholder={t('Group name')} value={groupName} onChange={e => setGroupName(e.target.value)} />
              <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 mb-3 text-sm outline-none focus:border-purple-500" placeholder={t('Member usernames (comma separated)')} value={groupMembers} onChange={e => setGroupMembers(e.target.value)} />
              <p className="text-xs text-gray-400 mb-4">{t('Example: user1, user2, user3')}</p>
              <div className="flex gap-2">
                <button onClick={createGroupStreak} className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2.5 rounded-xl font-semibold text-sm transition">{t('Create')}</button>
                <button onClick={() => setShowCreateGroup(false)} className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 py-2.5 rounded-xl font-semibold text-sm transition">{t('Cancel')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== VIEW SNAP MODAL ===== */}
      <AnimatePresence>
        {viewingSnap && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-50 flex items-center justify-center" onClick={() => setViewingSnap(null)}>
            <div className="relative max-w-md w-full">
              {viewingSnap.video_url ? <video src={viewingSnap.video_url} autoPlay className="w-full max-h-[80vh] object-contain" /> : viewingSnap.image_url ? <img src={viewingSnap.image_url} alt="" className="w-full max-h-[80vh] object-contain" /> : viewingSnap.media_url ? <img src={viewingSnap.media_url} alt="" className="w-full max-h-[80vh] object-contain" /> : null}
              <p className="absolute top-4 left-4 text-white font-bold">{viewingSnap.sender_name}</p>
              <p className="absolute top-4 right-4 text-white text-sm">{snapTimer}s</p>
              {viewingSnap.caption && <p className="absolute bottom-20 left-4 right-4 text-white text-lg">{viewingSnap.caption}</p>}
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
  {/* Tip button */}
  <button onClick={async (e) => { e.stopPropagation();
    const amount = prompt('Enter tip amount ($):', '1');
    if (amount && parseFloat(amount) > 0) {
      try {
        await api.post(`/snaps/snaps/${viewingSnap.id}/tip/`, { amount: parseFloat(amount) });
        toast.success(`💰 Tipped $${amount}!`);
      } catch { toast.error('Tip failed'); }
    }
  }} className="flex items-center gap-1 bg-yellow-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-yellow-600">
    <DollarSign size={16} /> Tip
  </button>
  {/* Screenshot button */}
  <button onClick={async (e) => { e.stopPropagation();
    try {
      await api.post(`/snaps/snaps/${viewingSnap.id}/screenshot/`);
      toast.success('📸 Screenshot tracked!');
    } catch {}
  }} className="flex items-center gap-1 bg-gray-700 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-600">
    <Camera size={16} /> Screenshot
  </button>
</div>
<button onClick={() => setViewingSnap(null)} className="absolute top-4 right-4 text-white"><X size={24} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== VIEW STORY MODAL ===== */}
      <AnimatePresence>
        {viewingStory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-50 flex items-center justify-center" onClick={() => setViewingStory(null)}>
            <div className="relative max-w-md w-full h-full flex items-center justify-center">
              {viewingStory.media_url ? (
                viewingStory.media_url.match(/\.(mp4|webm|mov)$/i) ? <video src={viewingStory.media_url} autoPlay controls className="w-full max-h-[80vh] object-contain" /> : <img src={viewingStory.media_url} alt="" className="w-full max-h-[80vh] object-contain" />
              ) : (
                <div className="text-white text-center"><Camera size={48} className="mx-auto mb-2 opacity-50" /><p>No media</p></div>
              )}
              <div className="absolute top-4 left-4 right-4">
                <p className="text-white font-bold text-lg">@{viewingStory.user?.username || 'user'}</p>
                <p className="text-white/60 text-xs">{viewingStory.views_count} {t('views')}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setViewingStory(null); }} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 rounded-full p-2 transition"><X size={20} className="text-white" /></button>
            </div>
          </motion.div>
        )}
            
      </AnimatePresence>
      {showSoundPicker && (
        <SoundUploader
          onSelect={(sound) => {
            setSelectedSound(sound);
            setStorySound(sound.title);
            setShowSoundPicker(false);
          }}
          onClose={() => setShowSoundPicker(false)}
        />
      )}
    </div>
  );
}