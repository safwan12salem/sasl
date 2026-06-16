/**
 * Sasl - Voice Message Recorder
 * Record, play, and send voice messages in chats
 */

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface VoiceMessageRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

const VoiceMessageRecorder: React.FC<VoiceMessageRecorderProps> = ({ onSend, onCancel }) => {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setDuration(recordingTime);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setAudioUrl(null);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 300) { // Max 5 minutes
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      toast.error(t('Microphone access denied'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
      playbackTimerRef.current = setInterval(() => {
        if (audioRef.current) {
          setPlaybackTime(audioRef.current.currentTime);
          if (audioRef.current.ended || audioRef.current.paused) {
            setIsPlaying(false);
            setPlaybackTime(0);
            if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
          }
        }
      }, 100);
    }
  };

  const handleSend = () => {
    if (chunksRef.current.length > 0) {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      onSend(blob, duration);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-2xl"
    >
      {isRecording ? (
        <>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-3 h-3 bg-red-500 rounded-full"
          />
          <span className="text-sm font-mono text-red-500 font-bold">
            {formatTime(recordingTime)}
          </span>
          <div className="flex-1 h-2 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-red-500 rounded-full"
              animate={{ width: `${(recordingTime / 300) * 100}%` }}
            />
          </div>
          <button
            onClick={stopRecording}
            className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition"
          >
            <Square size={16} />
          </button>
        </>
      ) : audioUrl ? (
        <>
          <audio ref={audioRef} src={audioUrl} onEnded={() => { setIsPlaying(false); setPlaybackTime(0); }} />
          <button
            onClick={togglePlayback}
            className="p-2 rounded-full bg-green-500 text-white hover:bg-green-600 transition"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <div className="flex-1">
            <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${duration > 0 ? (playbackTime / duration) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 font-mono">
              {formatTime(Math.floor(isPlaying ? playbackTime : duration))} / {formatTime(duration)}
            </span>
          </div>
          <button
            onClick={() => { setAudioUrl(null); chunksRef.current = []; }}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 transition"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={handleSend}
            className="px-3 py-1.5 rounded-full bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition"
          >
            {t('Send')}
          </button>
        </>
      ) : (
        <button
          onClick={startRecording}
          className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition flex items-center gap-1"
        >
          <Mic size={18} />
          <span className="text-sm font-semibold">{t('Record')}</span>
        </button>
      )}
      
      <button
        onClick={onCancel}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 transition"
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  );
};

export default VoiceMessageRecorder;