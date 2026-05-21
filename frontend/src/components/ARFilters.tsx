/**
 * Sasl - AR Filters for Stories & Reels
 * Face detection with fun filters
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import { Camera, Sparkles, Heart, Star, Sun } from 'lucide-react';
import toast from 'react-hot-toast';

interface Filter {
  id: string;
  name: string;
  icon: JSX.Element;
  color: string;
}

const filters: Filter[] = [
  { id: 'none', name: 'None', icon: <Camera size={20} />, color: 'bg-gray-500' },
  { id: 'hearts', name: 'Hearts', icon: <Heart size={20} />, color: 'bg-pink-500' },
  { id: 'stars', name: 'Stars', icon: <Star size={20} />, color: 'bg-yellow-500' },
  { id: 'glow', name: 'Glow', icon: <Sparkles size={20} />, color: 'bg-purple-500' },
  { id: 'sunshine', name: 'Sunshine', icon: <Sun size={20} />, color: 'bg-orange-500' },
];

export default function ARFilters() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeFilter, setActiveFilter] = useState('none');
  const [model, setModel] = useState<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    initCamera();
    loadModel();
    return () => {
      stopCamera();
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const loadModel = async () => {
    try {
      const detector = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        { runtime: 'tfjs', refineLandmarks: true }
      );
      setModel(detector);
    } catch (err) {
      console.log('Face detection model loaded in basic mode');
    }
    setLoading(false);
  };

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          detectFaces();
        };
      }
    } catch (err) {
      toast.error('Camera access denied');
      setLoading(false);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
  };

  const detectFaces = async () => {
    if (!videoRef.current || !canvasRef.current || !model) {
      animationRef.current = requestAnimationFrame(detectFaces);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    try {
      const faces = await model.estimateFaces(video);
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw video
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      // Apply filters on detected faces
      faces.forEach(face => {
        const keypoints = face.keypoints;
        if (activeFilter === 'hearts') {
          drawHearts(ctx, keypoints);
        } else if (activeFilter === 'stars') {
          drawStars(ctx, keypoints);
        } else if (activeFilter === 'glow') {
          drawGlow(ctx, keypoints);
        } else if (activeFilter === 'sunshine') {
          drawSunshine(ctx, keypoints);
        }
      });
    } catch (err) {
      // Face not detected, continue
    }

    animationRef.current = requestAnimationFrame(detectFaces);
  };

  const drawHearts = (ctx: CanvasRenderingContext2D, keypoints: any[]) => {
    // Draw hearts around eyes and mouth
    const leftEye = keypoints[33];
    const rightEye = keypoints[263];
    const mouth = keypoints[13];
    
    if (leftEye) drawHeart(ctx, leftEye.x, leftEye.y - 20, 15);
    if (rightEye) drawHeart(ctx, rightEye.x, rightEye.y - 20, 15);
    if (mouth) drawHeart(ctx, mouth.x, mouth.y + 10, 12);
  };

  const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.fillStyle = '#FF1493';
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(x, y + topCurveHeight);
    // Left curve
    ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
    // Bottom curve
    ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 2, x, y + size);
    // Right curve
    ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 2, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
    // Back to top
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
    ctx.fill();
  };

  const drawStars = (ctx: CanvasRenderingContext2D, keypoints: any[]) => {
    keypoints.forEach(point => {
      if (Math.random() < 0.02) {
        drawStar(ctx, point.x, point.y, 5, 8, 5);
      }
    });
  };

  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  };

  const drawGlow = (ctx: CanvasRenderingContext2D, keypoints: any[]) => {
    if (keypoints.length === 0) return;
    const center = keypoints[1]; // nose tip
    if (!center) return;
    
    const gradient = ctx.createRadialGradient(center.x, center.y, 10, center.x, center.y, 150);
    gradient.addColorStop(0, 'rgba(147, 51, 234, 0.6)');
    gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  const drawSunshine = (ctx: CanvasRenderingContext2D, keypoints: any[]) => {
    if (keypoints.length === 0) return;
    const center = keypoints[1]; // nose tip
    if (!center) return;
    
    // Draw sun rays
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(
        center.x + Math.cos(angle) * 100,
        center.y + Math.sin(angle) * 100
      );
      ctx.stroke();
    }
  };

  const startRecording = () => {
    const stream = canvasRef.current?.captureStream(30);
    if (!stream) return;
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      // Upload or save the video
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sasl-ar-filter.webm';
      a.click();
      toast.success('Recording saved!');
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    toast.success('Recording started');
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    toast.success('Recording stopped');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Filter selector */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {filters.map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`p-2 rounded-full transition-all ${
              activeFilter === filter.id
                ? `${filter.color} text-white scale-110 shadow-lg`
                : 'bg-white/80 text-gray-600 hover:bg-white'
            }`}
            title={filter.name}
          >
            {filter.icon}
          </button>
        ))}
      </div>

      {/* Camera view */}
      <div className="relative bg-black rounded-xl overflow-hidden">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} className="w-full h-64 object-cover" />
        
        {/* Record button */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          {recording ? (
            <button onClick={stopRecording} className="bg-red-500 text-white p-4 rounded-full animate-pulse">
              ⏹️
            </button>
          ) : (
            <button onClick={startRecording} className="bg-red-500 text-white p-4 rounded-full">
              🔴
            </button>
          )}
        </div>
      </div>
    </div>
  );
}