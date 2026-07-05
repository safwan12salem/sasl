import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Play, Pause, Scissors, X, Check, Music } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useTranslation } from 'react-i18next';

interface SoundUploaderProps {
  onSelect: (sound: { id: string; title: string; artist: string; audio_url: string; duration: number }) => void;
  onClose: () => void;
}

export default function SoundUploader({ onSelect, onClose }: SoundUploaderProps) {
  const { t } = useTranslation();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('Original');
  const [isPublic, setIsPublic] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('Audio must be under 10MB'));
      return;
    }
    setAudioFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, ''));
    const url = URL.createObjectURL(file);
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.onloadedmetadata = () => {
        const d = audioRef.current!.duration;
        setDuration(d);
        setEndTime(d);
      };
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.currentTime = startTime;
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const t = audioRef.current.currentTime;
    setCurrentTime(t);
    if (t >= endTime) {
      audioRef.current.pause();
      setPlaying(false);
      audioRef.current.currentTime = startTime;
    }
  };

  const handleUpload = async () => {
    if (!audioFile || !title.trim()) return toast.error(t('Title required'));
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('audio_file', audioFile);
      formData.append('title', title);
      formData.append('artist', artist);
      formData.append('duration', String(duration));
      formData.append('start_time', String(startTime));
      formData.append('end_time', String(endTime));
      formData.append('is_public', String(isPublic));

      const res = await api.post('/content/sounds/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      toast.success(t('Sound uploaded! 🎵'));
      onSelect({
        id: res.data.id,
        title: res.data.title,
        artist: res.data.artist,
        audio_url: res.data.audio_url,
        duration: endTime - startTime,
      });
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto">
        
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white dark:bg-gray-900 z-10">
          <button onClick={onClose} className="p-1"><X size={20} /></button>
          <h3 className="font-bold flex items-center gap-2"><Music size={18} className="text-purple-500" /> {t('Upload Sound')}</h3>
          <div className="w-8" />
        </div>

        <div className="p-4 space-y-4">
          {/* File select */}
          {!audioFile ? (
            <label className="flex flex-col items-center gap-3 py-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl cursor-pointer hover:border-purple-400 transition">
              <Upload size={40} className="text-gray-400" />
              <span className="text-sm text-gray-500">{t('Tap to upload audio (MP3, WAV)')}</span>
              <span className="text-xs text-gray-400">{t('Max 10MB')}</span>
              <input type="file" accept="audio/*" className="hidden" onChange={handleFileSelect} />
            </label>
          ) : (
            <>
              {/* Audio preview */}
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4">
                <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={() => setPlaying(false)} />
                <div className="flex items-center gap-3 mb-3">
                  <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-purple-500 text-white flex items-center justify-center">
                    {playing ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                  </button>
                  <div className="flex-1">
                    <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                      <div className="bg-purple-500 h-2 rounded-full transition-all" 
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Trim controls */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Scissors size={12} className="text-gray-500" />
                    <span className="text-gray-500">{t('Trim')}:</span>
                    <input type="number" value={startTime} onChange={e => setStartTime(Number(e.target.value))} 
                      className="w-16 px-2 py-1 rounded bg-white dark:bg-gray-700 text-xs" min="0" max={endTime} step="0.1" />
                    <span className="text-gray-400">-</span>
                    <input type="number" value={endTime} onChange={e => setEndTime(Number(e.target.value))} 
                      className="w-16 px-2 py-1 rounded bg-white dark:bg-gray-700 text-xs" min={startTime} max={duration} step="0.1" />
                    <span className="text-gray-400">s</span>
                  </div>
                  <button onClick={() => { setAudioFile(null); setTitle(''); }} className="text-xs text-red-500 hover:underline">
                    {t('Change file')}
                  </button>
                </div>
              </div>

              {/* Details */}
              <input className="input-field text-sm" placeholder={t('Sound title')} value={title} onChange={e => setTitle(e.target.value)} />
              <input className="input-field text-sm" placeholder={t('Artist (optional)')} value={artist} onChange={e => setArtist(e.target.value)} />
              
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="rounded" />
                <span className="text-gray-600 dark:text-gray-300">{t('Allow others to use this sound')}</span>
              </label>

              <button onClick={handleUpload} disabled={uploading} className="btn-primary w-full py-3 text-sm">
                {uploading ? t('Uploading...') : t('Upload Sound 🎵')}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
