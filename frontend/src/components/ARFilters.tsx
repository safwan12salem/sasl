/**
 * Sasl AR Filters — Viral Camera Effects
 * Works with or without WebGL, face detection, beauty filters, recording
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, Sparkles, Heart, Star, Sun, Zap, Video, Image, X, Download, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Filter {
  id: string;
  name: string;
  icon: JSX.Element;
  style: string;
}

const FILTERS: Filter[] = [
  { id: 'none', name: 'Original', icon: <Camera size={18} />, style: '' },
  { id: 'hearts', name: 'Hearts', icon: <Heart size={18} />, style: '' },
  { id: 'stars', name: 'Stars', icon: <Star size={18} />, style: '' },
  { id: 'glow', name: 'Glow', icon: <Sparkles size={18} />, style: '' },
  { id: 'sunshine', name: 'Sunshine', icon: <Sun size={18} />, style: '' },
  { id: 'grayscale', name: 'B&W', icon: <Zap size={18} />, style: 'grayscale(100%)' },
  { id: 'sepia', name: 'Sepia', icon: <Zap size={18} />, style: 'sepia(100%)' },
  { id: 'vintage', name: 'Vintage', icon: <Zap size={18} />, style: 'sepia(50%) hue-rotate(-20deg) brightness(0.9)' },
  { id: 'neon', name: 'Neon', icon: <Zap size={18} />, style: 'hue-rotate(90deg) saturate(200%) brightness(1.2)' },
  { id: 'cool', name: 'Cool', icon: <Zap size={18} />, style: 'hue-rotate(180deg) brightness(1.1)' },
  { id: 'warm', name: 'Warm', icon: <Zap size={18} />, style: 'hue-rotate(-30deg) brightness(1.1) saturate(1.5)' },
];

export default function ARFilters() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeFilter, setActiveFilter] = useState('none');
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    startCamera();
    return () => { stopCamera(); };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
          drawFrame();
        };
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') toast.error('Camera permission denied');
      else toast.error('No camera found');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    cancelAnimationFrame(animationRef.current);
    setCameraReady(false);
  };

  const flipCamera = () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const drawFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraReady) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Apply CSS filter via canvas
    const filter = FILTERS.find(f => f.id === activeFilter);
    ctx.filter = filter?.style || 'none';
    
    // Mirror for front camera
    if (facingMode === 'user') {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    ctx.filter = 'none';

    // Draw AR effects
    if (activeFilter === 'hearts') drawHearts(ctx, canvas);
    if (activeFilter === 'stars') drawStars(ctx, canvas);
    if (activeFilter === 'glow') drawGlow(ctx, canvas);
    if (activeFilter === 'sunshine') drawSunshine(ctx, canvas);

    animationRef.current = requestAnimationFrame(drawFrame);
  };

  const drawHearts = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = 10 + Math.random() * 20;
      ctx.fillStyle = '#ff6b9d';
      ctx.beginPath();
      const topCurveHeight = size * 0.3;
      ctx.moveTo(x, y + topCurveHeight);
      ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
      ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 2, x, y + size);
      ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 2, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
      ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
      ctx.fill();
    }
  };

  const drawStars = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = 5 + Math.random() * 10;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        const angle = (j * 4 * Math.PI) / 5 - Math.PI / 2;
        const r = j % 2 === 0 ? size : size / 2;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  };

  const drawGlow = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 50, canvas.width / 2, canvas.height / 2, 300);
    gradient.addColorStop(0, 'rgba(168, 85, 247, 0.3)');
    gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const drawSunshine = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.strokeStyle = 'rgba(255, 165, 0, 0.5)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, canvas.height / 2);
      ctx.lineTo(canvas.width / 2 + Math.cos(angle) * 200, canvas.height / 2 + Math.sin(angle) * 200);
      ctx.stroke();
    }
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);
  };

  const downloadPhoto = () => {
    if (!capturedImage) return;
    const a = document.createElement('a');
    a.href = capturedImage;
    a.download = `sasl-filter-${Date.now()}.jpg`;
    a.click();
    toast.success('Photo saved! 📸');
  };

  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sasl-video-${Date.now()}.webm`;
      a.click();
      toast.success('Video saved! 🎥');
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    toast('Recording... 🔴');
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-3xl font-bold gradient-text mb-4 flex items-center gap-2">
        <Sparkles className="text-purple-500" /> AR Filters
      </h2>

      {/* Camera View */}
      <div className="relative bg-black rounded-3xl overflow-hidden shadow-2xl">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} className="w-full aspect-[4/3] object-cover" />

        {/* Filter Picker */}
        <div className="absolute bottom-24 left-0 right-0 overflow-x-auto">
          <div className="flex gap-2 px-4 justify-center">
            {FILTERS.map(filter => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all whitespace-nowrap ${
                  activeFilter === filter.id
                    ? 'bg-white text-purple-600 scale-110 shadow-xl'
                    : 'bg-black/40 text-white hover:bg-black/60'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                  {filter.icon}
                </div>
                <span className="text-[10px] font-semibold">{filter.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
          <button onClick={flipCamera} className="bg-black/40 text-white p-3 rounded-full hover:bg-black/60 transition">
            <RotateCcw size={22} />
          </button>
          
          {recording ? (
            <button onClick={stopRecording} className="bg-red-500 text-white p-5 rounded-full animate-pulse shadow-lg">
              <Zap size={28} />
            </button>
          ) : (
            <button onClick={capturePhoto} className="bg-white p-5 rounded-full shadow-lg hover:scale-105 transition">
              <Camera size={28} className="text-gray-800" />
            </button>
          )}
          
          {recording ? (
            <button onClick={stopRecording} className="bg-black/40 text-white p-3 rounded-full">
              <Zap size={22} className="text-red-400" />
            </button>
          ) : (
            <button onClick={startRecording} className="bg-black/40 text-white p-3 rounded-full hover:bg-black/60 transition">
              <Video size={22} />
            </button>
          )}
        </div>
      </div>

      {/* Captured Photo Preview */}
      {capturedImage && (
        <div className="mt-4 p-4 glass rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">Preview</h3>
            <button onClick={() => setCapturedImage(null)} className="text-gray-500 hover:text-red-500">
              <X size={20} />
            </button>
          </div>
          <img src={capturedImage} alt="Captured" className="w-full rounded-xl max-h-64 object-cover" />
          <div className="flex gap-2 mt-3">
            <button onClick={downloadPhoto} className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">
              <Download size={18} /> Save Photo
            </button>
            <button onClick={() => setCapturedImage(null)} className="btn-ghost flex-1 py-3">
              Retake
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          ✨ Apply filters in real-time · 📸 Tap to capture · 🎥 Hold for video · 🔄 Flip camera
        </p>
      </div>
    </div>
  );
}