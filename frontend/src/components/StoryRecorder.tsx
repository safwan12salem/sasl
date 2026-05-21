/**
 * Sasl - Story Recorder – record short video and upload as story.
 */
import React, { useRef, useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Camera, StopCircle, Loader2 } from 'lucide-react';

const MAX_DURATION = 15; // seconds

export default function StoryRecorder({ onDone }: { onDone?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [chunks, setChunks] = useState<Blob[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) setChunks(prev => [...prev, e.data]);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setPreviewUrl(URL.createObjectURL(blob));
      };
      mediaRecorder.start();
      setRecording(true);
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setRecording(false);
          stream.getTracks().forEach(t => t.stop());
        }
      }, MAX_DURATION * 1000);
     } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      toast.error('Camera permission denied. Please allow camera access in browser settings.');
    } else if (err.name === 'NotFoundError') {
      toast.error('No camera found.');
    } else {
      toast.error('Could not access camera.');
    }
  }
}, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
    }
  }, [recording]);

  const uploadStory = useCallback(async () => {
    if (!previewUrl || chunks.length === 0) return;
    setUploading(true);
    const blob = new Blob(chunks, { type: 'video/webm' });
    const formData = new FormData();
    formData.append('media', blob, 'story.webm');
    formData.append('media_type', 'video');
    try {
      await api.post('/content/stories/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Story uploaded!');
      setPreviewUrl(null);
      setChunks([]);
      onDone?.();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [previewUrl, chunks, onDone]);

  return (
    <div className="space-y-3">
      <h4 className="font-bold">Create Story</h4>
      <div className="relative bg-black rounded-xl overflow-hidden">
        <video ref={videoRef} autoPlay muted className="w-full h-64 object-cover" />
        {recording && (
          <span className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs animate-pulse">
            REC
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {!recording ? (
          <button onClick={startRecording} className="btn-primary flex items-center gap-1">
            <Camera size={16} /> Start
          </button>
        ) : (
          <button onClick={stopRecording} className="btn-secondary flex items-center gap-1">
            <StopCircle size={16} /> Stop
          </button>
        )}
        {previewUrl && !uploading && (
          <button onClick={uploadStory} className="btn-primary">
            Upload
          </button>
        )}
        {uploading && <Loader2 className="animate-spin" />}
      </div>
    </div>
  );
}