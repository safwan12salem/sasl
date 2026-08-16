/**
 * Sasl - Social Asynchronous Sharing Layer
 * Tutoring – Advanced with whiteboard, materials, certificates, group classes, subject search
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { WebRTCConnection } from '../services/webrtc';
import toast from 'react-hot-toast';
import {
  BookOpen, Calendar, Loader2, AlertCircle, Search, Filter,
  Video, VideoOff, Users, MessageCircle, Star, Clock, Play, Pause,
  ClipboardList, Award, FileText, Download, Upload, PenTool,
  GraduationCap, ChevronDown, ChevronUp, X, CheckCircle, Globe,
  DollarSign, BarChart3, Bookmark, Share2, Zap,
  Trophy,Send,Image
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TutoringChat from './TutoringChat';
import { useTranslation } from 'react-i18next';
import PaymentModal from './PaymentModal';
import AdBanner from './AdBanner';
import { uploadFile as uploadToCloud } from '../services/uploadService';

interface Session {
  id: string;
  tutor: { username: string; avatar_url?: string };
  student: { username: string; avatar_url?: string } | null;
  subject: string;
  description?: string;
  price: string;
  scheduled_at: string;
  status: string;
  is_group_class?: boolean;
  max_students?: number;
  students_enrolled?: number;
  duration_minutes?: number;
    background_image?: string;
  is_offline?: boolean;
  materials?: Material[];
  average_rating?: number;
   views?: number;
}

interface Material {
  id: string;
  title: string;
  file_url?: string;
  description?: string;
  created_at: string;
}

interface Certificate {
  id: string;
  subject: string;
  tutor_name: string;
  student_name: string;
  completed_at: string;
  certificate_url?: string;
}

interface WhiteboardData {
  id: string;
  data: string;
  updated_at: string;
}

interface TutorProfile {
  id: string;
  user: { username: string; avatar_url?: string };
  hourly_rate: string;
  subjects: string;
  rating: number;
  is_available: boolean;
  total_sessions?: number;
  total_students?: number;
}


export default function Tutoring() {
  const { user } = useAuth();
  const { t } = useTranslation();

const SUBJECTS = [
  t('Mathematics'), t('Physics'), t('Chemistry'), t('Biology'), t('English'),
  t('Programming'), t('Web Development'), t('Data Science'), t('AI/ML'),
  t('Music'), t('Art'), t('History'), t('Geography'), t('Economics'),
  t('Business'), t('Marketing'), t('Design'), t('Photography'), t('Language')
];

const STATUS_COLORS: Record<string, string> = {
  [t('scheduled')]: 'bg-blue-100 text-blue-700',
  [t('ongoing')]: 'bg-green-100 text-green-700',
  [t('completed')]: 'bg-purple-100 text-purple-700',
  [t('cancelled')]: 'bg-red-100 text-red-700',
};



  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'ongoing' | 'completed' | 'mine' | 'leaderboard' | 'calendar'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Create session form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [price, setPrice] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [maxStudents, setMaxStudents] = useState('10');
  const [description, setDescription] = useState('');
  const [isGroupClass, setIsGroupClass] = useState(false);
  const [duration, setDuration] = useState('60');
    const [bgImage, setBgImage] = useState<File | null>(null);
        const [bgImageUrl, setBgImageUrl] = useState('');
  const [isOffline, setIsOffline] = useState(true);

  // Tutor profiles
  const [tutors, setTutors] = useState<TutorProfile[]>([]);
  const [showTutors, setShowTutors] = useState(false);
    

  // Video call
  const [inCall, setInCall] = useState<string | null>(null);
    const [timer, setTimer] = useState<number>(0);
  const [timerActive, setTimerActive] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pendingStreamRef = useRef<MediaStream | null>(null);
  const callingRef = useRef(false);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
  const rtcRef = useRef<WebRTCConnection | null>(null);
  const token = localStorage.getItem('sasl_token');

  // Whiteboard
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [whiteboardData, setWhiteboardData] = useState<WhiteboardData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#000000');
  const [penSize, setPenSize] = useState(3);

  // Materials
  const [showMaterials, setShowMaterials] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDesc, setMaterialDesc] = useState('');

  // Certificates
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [showCertificates, setShowCertificates] = useState(false);

  // Chat
  const [showChat, setShowChat] = useState(false);

  // Stats
  const [stats, setStats] = useState({ totalSessions: 0, completedSessions: 0, totalEarned: '0', totalLearned: '0' });

  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [pendingJoinSession, setPendingJoinSession] = useState<string | null>(null);


  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeTab === 'mine') params.set('mine', 'true');
      else if (activeTab !== 'upcoming') params.set('status', activeTab);
      if (searchQuery) params.set('search', searchQuery);
      const res = await api.get(`/tutoring/sessions/?${params.toString()}`);
      const data = res.data.results || [];
      setSessions(data);
    } catch (err) {
      setError(t('Failed to load sessions.'));
    } finally {
      setLoading(false);
    }
  };



  const fetchTutors = async () => {
    try {
      const res = await api.get('/tutoring/profiles/');
      setTutors(res.data.results || res.data || []);
    } catch (err) {
      setError(t('Failed to load tutor profiles.'));
    }
  };

  const fetchCertificates = async () => {
    try {
      const res = await api.get('/tutoring/sessions/my_certificates/');
      setCertificates(res.data || []);
    } catch (err) {
      setError(t('Failed to load certificates.'));
    }
  };

  useEffect(() => { 
    fetchSessions(); 
    fetchTutors(); 
    fetchCertificates(); 
  }, [activeTab, searchQuery]);

     
  // Restore whiteboard from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sasl_whiteboard');
    if (saved) {
      try { setWhiteboardData(JSON.parse(saved)); } catch {}
    }
  }, []);



  useEffect(() => {
    if (timerActive && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            toast.success('⏰ Class time is up!');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timerActive, timer]);


useEffect(() => {
  if (remoteStreamRef.current && remoteVideoRef.current) {
    remoteVideoRef.current.srcObject = remoteStreamRef.current;
  }
}, [inCall, remoteStreamRef.current]);


  // ============================================================
  // ACTIONS
  // ============================================================
  const createSession = async () => {
    if (!subject || !price || !scheduledAt) return toast.error(t('Fill all required fields'));
    try {
      await api.post('/tutoring/sessions/', {
        subject,
        description,
        price: parseFloat(price),
        scheduled_at: scheduledAt,
        is_offline: isOffline,
        duration_minutes: parseInt(duration),
        max_students: parseInt(maxStudents),
        is_group_class: isGroupClass,
                background_image: bgImageUrl || null,
      });
      toast.success(`${isGroupClass ? 'Group class' : 'Session'} created! 🎉`);
      resetForm();
      fetchSessions();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error creating session');
    }
  };

  const requestBooking = async (id: string) => {
    try {
      await api.post(`/tutoring/sessions/${id}/request_booking/`);
      toast.success(t('Booking requested!'));
      fetchSessions();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('Failed to request booking'));
    }
  };

  const completeSession = async (id: string) => {
    try {
      await api.post(`/tutoring/sessions/${id}/complete/`);
      toast.success(t('Session completed & payment released! 💰'));
      fetchSessions();
      fetchCertificates();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('Action failed'));
    }
  };

  const cancelSession = async (id: string) => {
    try {
      await api.post(`/tutoring/sessions/${id}/cancel/`);
      toast.success(t('Session cancelled'));
      fetchSessions();
    } catch (err: any) {
      toast.error(t('Failed to cancel'));
    }
  };

  const uploadMaterial = async (sessionId: string) => {
    if (!uploadFile || !materialTitle) return toast.error(t('Title and file required'));
    const formData = new FormData();
    formData.append('title', materialTitle);
    formData.append('description', materialDesc);
    formData.append('file', uploadFile);

    try {
      await api.post(`/tutoring/sessions/${sessionId}/upload_material/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(t('Material uploaded!'));
      setMaterialTitle(''); setMaterialDesc(''); setUploadFile(null);
      fetchSessions();
    } catch (err: any) {
      toast.error(t('Failed to upload'));
    }
  };

  const confirmSession = async (id: string) => {
    try {
      await api.post(`/tutoring/sessions/${id}/confirm/`);
      toast.success(t('Session started!'));
      fetchSessions();
    } catch (err: any) {
      toast.error(t('Failed to confirm'));
    }
  };


   
      
        const startVideoCall = async (sessionId: string, role: 'tutor' | 'student' = 'student') => {
          if (callingRef.current) { console.log('⚠️ Already connecting'); return; }
callingRef.current = true;
    console.log('🔴 START startVideoCall', sessionId, role);
    try {
      console.log('🟠 Step 1: Permission check');
      try {
        const permStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        console.log('🟢 Step 1: Permission GRANTED');
        permStream.getTracks().forEach(t => t.stop());
          } catch (permErr) {
        console.log('🔴 Step 1: Permission DENIED, joining audio-only', permErr);
        toast.error('Camera access denied. Joining with audio only.');
        role = 'student'; // Force student role — can't be tutor without camera
      }
      
      console.log('🟠 Step 2: Get camera stream');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' }, 
        audio: true 
      }).catch(async (err) => {
        console.log('🔴 Step 2: Camera stream FAILED', err);
        toast.error('Camera busy. Joining with audio only.');
        return await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      });
      console.log('🟢 Step 2: Stream obtained, tracks:', stream.getTracks().length);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        console.log('🟢 Step 3: Local video set');
      } else {
                pendingStreamRef.current = stream;
      }
      
      console.log('🟠 Step 4: Create WebSocket');
      const isLocal = window.location.hostname === 'localhost';
      const wsUrl = isLocal
        ? `ws://localhost:8000/ws/video/${sessionId}/?token=${token}&role=${role}`
        : `wss://sasl-api-i34r.onrender.com/ws/video/${sessionId}/?token=${token}&role=${role}`;
      console.log('🟡 WebSocket URL:', wsUrl.substring(0, 100));
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      console.log('🟢 Step 4: WebSocket created');
      
      console.log('🟠 Step 5: Create RTC');
      const rtc = new WebRTCConnection((msg) => { 
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); 
      });
      rtcRef.current = rtc;
      console.log('🟢 Step 5: RTC created');

      console.log('🟠 Step 6: Set ws.onmessage');
      ws.onmessage = async (event) => {
        console.log('📩 WS message received:', event.data.substring(0, 50));
        const data = JSON.parse(event.data);
                if (data.type === 'student_joined' && role === 'tutor') {
          console.log('📩 Student joined, creating offer');
          setTimeout(() => {
            if (remoteVideoRef.current && stream.getVideoTracks().length > 0) {
              rtc.createOffer(remoteVideoRef.current);
            }
          }, 500);
          return;
        }
        if (data.type === 'answer') {
          console.log('📩 Handling answer');
          await rtc.handleAnswer(data.answer);
        }
        else if (data.type === 'offer') {
          console.log('📩 Handling offer');
          const waitForVideo = () => {
            if (remoteVideoRef.current) {
              rtc.handleOffer(data.offer, remoteVideoRef.current);
            } else {
              setTimeout(waitForVideo, 200);
            }
          };
          waitForVideo();
        }
        else if (data.type === 'candidate') {
          console.log('📩 Handling ICE candidate');
          await rtc.addIceCandidate(data.candidate);
        }
      };
      console.log('🟢 Step 6: onmessage set');

      console.log('🟠 Step 7: Set ws.onopen');
           ws.onopen = () => {
        console.log('🟢 Step 7: ws.onopen FIRED');
        if (stream.getVideoTracks().length > 0) {
          rtc.setLocalStream(stream);
          console.log('🟢 Local stream set on RTC');
        }
        if (role === 'student') {
          console.log('🟡 Student waiting for offer');
          ws.send(JSON.stringify({ type: 'student_joined' }));
        } else {
          console.log('🟡 Tutor waiting for student to join');
        }
      };
      console.log('🟢 Step 7: onopen set');
      

            setInCall(sessionId);
      console.log('🟢 Step 8: setInCall done');
      
      // Wait for React to render the video element, then apply stream
      setTimeout(() => {
        if (pendingStreamRef.current && localVideoRef.current) {
          console.log('🟢 Applying pending stream to video element');
          localVideoRef.current.srcObject = pendingStreamRef.current;
          localVideoRef.current.muted = true;
          pendingStreamRef.current = null;
        }
      }, 500);


      const currentSession = sessions.find(s => s.id === sessionId);
      if (currentSession?.duration_minutes) {
        setTimer(currentSession.duration_minutes * 60);
        setTimerActive(true);
      }
      console.log('🟢 Step 9: Timer set');
    } catch (err: any) {
      console.log('🔴 FATAL ERROR:', err.message, err);
      toast.error('Cannot access media: ' + (err.message || 'Unknown error'));
    }
  };

      const endCall = () => {
    rtcRef.current?.disconnect();
    wsRef.current?.close();
    setInCall(null);
    setTimer(0);
    setTimerActive(false);
    // Stop all tracks
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current?.srcObject) {
      const stream = remoteVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      remoteVideoRef.current.srcObject = null;
      callingRef.current = false;
    }
  };


  // ============================================================
  // WHITEBOARD
  // ============================================================
  const fetchWhiteboard = async (sessionId: string) => {
    try {
      const res = await api.get(`/tutoring/sessions/${sessionId}/whiteboard/`);
      setWhiteboardData(res.data);
            localStorage.setItem('sasl_whiteboard', JSON.stringify(res.data));
    } catch (err) {
      setError(t('Failed to load whiteboard data.'));
    }
  };

  const startDrawing = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);


const getTouchPos = (e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
  };

  const startDrawingTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getTouchPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const drawTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    const pos = getTouchPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const clearWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveWhiteboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !inCall) return;
    const dataUrl = canvas.toDataURL();
    try {
      await api.post(`/tutoring/sessions/${inCall}/update_whiteboard/`, { data: dataUrl });
      toast.success(t('Whiteboard saved!'));
    } catch (err) {
      toast.error(t('Failed to save'));
    }
  };

  // ============================================================
  // HELPERS
  // ============================================================
  const resetForm = () => {
    setShowCreateForm(false);
    setSubject(''); setPrice(''); setScheduledAt('');
    setDescription(''); setIsGroupClass(false);
    setMaxStudents('10'); setDuration('60'); setIsOffline(true);
        setBgImage(null as any); 
    setBgImageUrl('');
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star key={i} size={12} className={i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
    ));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // ============================================================
  // RENDER
  // ============================================================
  
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
           
      {/* Video Call Overlay */}
      <AnimatePresence>
                    {inCall && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
            {/* TOP BAR */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white">
              <h3 className="font-bold flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" /> Live Class
              </h3>
              {timer > 0 && (
                <span className={`font-mono font-bold text-xl ${timer <= 60 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                  {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                </span>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => { setShowWhiteboard(!showWhiteboard); if (!showWhiteboard && inCall) fetchWhiteboard(inCall); }}
                  className="px-3 py-1.5 rounded-full bg-gray-700 hover:bg-gray-600 text-sm flex items-center gap-1">
                  <PenTool size={14} /> Whiteboard
                </button>
                <button onClick={() => setShowChat(!showChat)}
                  className="px-3 py-1.5 rounded-full bg-gray-700 hover:bg-gray-600 text-sm flex items-center gap-1">
                  <MessageCircle size={14} /> Chat
                </button>
                <button onClick={() => setShowMaterials(!showMaterials)}
                  className="px-3 py-1.5 rounded-full bg-gray-700 hover:bg-gray-600 text-sm flex items-center gap-1">
                  <FileText size={14} /> Materials
                </button>
                <button onClick={endCall} className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-sm flex items-center gap-1">
                  <VideoOff size={14} /> End
                </button>
              </div>
            </div>
            
            {/* MAIN AREA */}
            <div className="flex-1 flex">
              {/* VIDEOS */}
              <div className={`${showChat || showWhiteboard || showMaterials ? 'flex-[3]' : 'flex-1'} p-2 flex flex-col gap-2`}>
                <div className="flex-1 grid grid-cols-2 gap-2" style={{ minHeight: '200px' }}>
                 <div className="relative rounded-xl overflow-hidden bg-gray-800" style={{ minHeight: '150px' }}>
                    <video ref={localVideoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                    <span className="absolute bottom-2 left-2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">You</span>
                  </div>
                 <div className="relative rounded-xl overflow-hidden bg-gray-800" style={{ minHeight: '150px' }}>
                   <video ref={remoteVideoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                    <span className="absolute bottom-2 left-2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">Remote</span>
                  </div>
                </div>
                                    <div className="absolute inset-0 z-10 cursor-pointer" onClick={(e) => {
                      e.stopPropagation();
                      const v = remoteVideoRef.current;
                      if (v) {
                        v.muted = !v.muted;
                        if (!v.muted) v.play().catch(() => {});
                      }
                    }}>
                      <span className="absolute bottom-8 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                        Tap to unmute
                      </span>
                    </div>
              </div>
              
              {/* SIDE PANEL */}
              {(showChat || showWhiteboard || showMaterials) && (
                <div className="w-80 border-l border-gray-700 bg-gray-800 flex flex-col">
                  {showWhiteboard && (
                    <div className="p-3">
                      <h4 className="font-bold text-white text-sm mb-2">Whiteboard</h4>
                      <div className="flex gap-1 mb-2">
                        <input type="color" value={penColor} onChange={e => setPenColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                        <select value={penSize} onChange={e => setPenSize(Number(e.target.value))} className="text-xs border rounded px-1 bg-gray-700 text-white">
                          {[1,2,3,5,8].map(s => <option key={s} value={s}>{s}px</option>)}
                        </select>
                        <button onClick={clearWhiteboard} className="text-xs px-2 py-1 bg-gray-600 rounded text-white">Clear</button>
                        <button onClick={saveWhiteboard} className="text-xs px-2 py-1 bg-green-600 rounded text-white">Save</button>
                      </div>
                      <canvas ref={canvasRef} width={300} height={250}
  className="border border-gray-600 rounded w-full bg-white cursor-crosshair touch-none"
  onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
  onTouchStart={startDrawingTouch} onTouchMove={drawTouch} onTouchEnd={stopDrawing}
/>
                    </div>
                  )}
                  {showChat && (
                    <div className="flex-1 overflow-hidden">
                      <TutoringChat roomId={inCall!} onClose={() => setShowChat(false)} />
                    </div>
                  )}
                  {showMaterials && (
                    <div className="p-3 text-white">
                      <h4 className="font-bold text-sm mb-2">Materials</h4>
                      <p className="text-gray-400 text-sm">Materials panel</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
             
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold gradient-text flex items-center gap-2">
            <GraduationCap className="text-blue-500" /> {t('Tutoring')}
          </h2>
          <p className="text-gray-500 text-sm mt-1">{t('Learn from experts, teach your skills, earn money')}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => { setShowTutors(!showTutors); fetchTutors(); }} className="btn-ghost text-sm flex items-center gap-1">
            <Users size={16} /> {t('Find Tutors')}
          </button>
          <button onClick={() => setShowCertificates(!showCertificates)} className="btn-ghost text-sm flex items-center gap-1">
            <Award size={16} /> {t('Certificates')}
          </button>
         <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2">
  <ClipboardList size={14} className="sm:size-16" /> <span className="whitespace-nowrap">{showCreateForm ? t('Cancel') : t('Create Session')}</span>
</button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: <BookOpen size={18} />, label: t('Total Sessions'), value: stats.totalSessions, color: 'blue' },
          { icon: <CheckCircle size={18} />, label: t('Completed'), value: stats.completedSessions, color: 'green' },
          { icon: <DollarSign size={18} />, label: user?.is_teacher ? t('Earned') : t('Spent'), value: `$${user?.is_teacher ? stats.totalEarned : stats.totalLearned}`, color: 'yellow' },
          { icon: <Star size={18} />, label: t('Rating'), value: '4.8', color: 'purple' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass p-3 rounded-xl text-center">
            <div className={`text-${stat.color}-500 mx-auto mb-1`}>{stat.icon}</div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Tutor Directory */}
      <AnimatePresence>
        {showTutors && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <div className="glass p-4 rounded-2xl">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Users size={18} /> {t('Top Tutors')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tutors.filter(t => t.is_available).slice(0, 6).map(tutor => (
                  <div key={tutor.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                      {tutor.user.username[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">@{tutor.user.username}</p>
                      <p className="text-xs text-gray-500">{tutor.subjects}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {renderStars(tutor.rating)}
                        <span className="text-xs text-green-600 font-bold">${tutor.hourly_rate}/hr</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Certificates */}
      <AnimatePresence>
        {showCertificates && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <div className="glass p-4 rounded-2xl">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Award size={18} /> {t('My Certificates')}</h3>
              {certificates.length === 0 ? (
                <p className="text-gray-500 text-sm">{t('Complete sessions to earn certificates!')}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {certificates.map(cert => (
                    <div key={cert.id} className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-xl border border-yellow-200 flex items-center gap-3">
                      <Award size={32} className="text-yellow-500" />
                      <div>
                        <p className="font-bold text-sm">{cert.subject}</p>
                        <p className="text-xs text-gray-600">{t('Tutor')}: @{cert.tutor_name}</p>
                        <p className="text-xs text-gray-500">{new Date(cert.completed_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Session Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="glass p-6 rounded-2xl mb-6 space-y-4 shadow-xl border-2 border-blue-200">
            <h3 className="font-bold text-xl flex items-center gap-2"><ClipboardList size={20} /> {t('Create New Session')}</h3>

            {/* Group Class Toggle */}
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl">
              <button onClick={() => setIsGroupClass(!isGroupClass)}
                className={`relative w-14 h-7 rounded-full transition-colors ${isGroupClass ? 'bg-purple-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${isGroupClass ? 'translate-x-7' : 'translate-x-0.5'}`} />
              </button>
              <div>
                <p className="font-semibold text-sm">{t('Group Class')}</p>
                <p className="text-xs text-gray-500">{t('Allow multiple students to join')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select className="input-field" value={subject} onChange={e => setSubject(e.target.value)}>
                <option value=""> {t('Select Subject *')}</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input className="input-field" type="number" placeholder={t('Price ($) *')} value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <textarea className="input-field" placeholder={t('Description...')} value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                       
                        <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-500 hover:text-gray-700">
                <Image size={16} />
                {bgImage ? bgImage.name : 'Session background image (optional)'}
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setBgImage(file);
                  // Upload to Cloudinary and set URL
                                    try {
                    const url = await uploadToCloud(file, 'sessions');
                    if (url) setBgImageUrl(url);
                  } catch {}
                }} />
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input className="input-field" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
              <select className="input-field" value={duration} onChange={e => setDuration(e.target.value)}>
                <option value="30">{t('30 minutes')}</option>
                <option value="60">{t('1 hour')}</option>
                <option value="90">{t('1.5 hours')}</option>
                <option value="120">{t('2 hours')}</option>
              </select>
              {isGroupClass && (
                <input className="input-field" type="number" placeholder={t('Max students')} value={maxStudents} onChange={e => setMaxStudents(e.target.value)} />
              )}
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isOffline} onChange={e => setIsOffline(e.target.checked)} className="rounded" />
              <Globe size={14} /> {t('Works offline via WaveMesh')}
            </label>
            <button onClick={createSession} className="btn-primary w-full py-3 text-lg font-bold">
              {t('🚀 Create')} {isGroupClass ? t('Group Class') : t('Session')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Tabs */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-10" placeholder={t('Search sessions by subject or tutor...')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
         <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
                    {[
            { key: 'upcoming' as const, label: t('Upcoming'), icon: <Calendar size={14} /> },
            { key: 'ongoing' as const, label: t('Live'), icon: <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> },
            { key: 'completed' as const, label: t('Completed'), icon: <CheckCircle size={14} /> },
            { key: 'mine' as const, label: t('My Sessions'), icon: <BookOpen size={14} /> },
            { key: 'leaderboard' as const, label: '🏆', icon: <Trophy size={14} /> },
            { key: 'calendar' as const, label: '📅', icon: <Calendar size={14} /> },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex-shrink-0 ${
                activeTab === tab.key ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={48} /></div>
      ) : error ? (
        <div className="glass p-12 rounded-2xl text-center">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={48} />
          <p className="text-lg text-gray-600">{error}</p>
          <button onClick={fetchSessions} className="btn-primary mt-4">{t('Retry')}</button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="glass p-12 rounded-2xl text-center">
          <BookOpen size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-xl text-gray-500">{t('No sessions found')}</p>
          <p className="text-sm text-gray-400 mt-1">{user?.is_teacher ? t('Create your first session!') : t('Browse available sessions!')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
         <motion.div key={session.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
  className={`glass rounded-2xl overflow-hidden transition hover:shadow-lg ${
    expandedSession === session.id ? 'ring-2 ring-blue-300' : ''
  }`}
  style={session.background_image ? {
    backgroundImage: `url(${session.background_image})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } : undefined}>
  <div className="p-4 sm:p-5 cursor-pointer" onClick={async () => {
        const isOpening = expandedSession !== session.id;
    if (isOpening) {
      try { await api.post(`/tutoring/sessions/${session.id}/increment_view/`); } catch {}
    }
    setExpandedSession(isOpening ? session.id : null);
    if (isOpening) {
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, views: (s.views || 0) + 1 } : s));
    }
  }}>
    
    {/* TOP ROW: Avatar + Subject + Status */}
    <div className="flex items-start gap-3 mb-3">
      {session.tutor.avatar_url ? (
        <img src={session.tutor.avatar_url} className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-2 ring-white/50" alt="" />
      ) : (
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ring-2 ring-white/50">
          {session.tutor.username[0]?.toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-base sm:text-lg flex items-center gap-2 flex-wrap">
          <span className="truncate">{session.subject}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${STATUS_COLORS[session.status]}`}>
            {session.status}
          </span>
          {session.is_group_class && (
            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
              <Users size={10} /> {t('Group')}
            </span>
          )}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">@{session.tutor.username}</p>
      </div>
    </div>

    {/* INFO ROW: Date, Time, Price, Enrolled */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2.5 py-1.5">
        <Calendar size={13} /> {formatDate(session.scheduled_at)}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2.5 py-1.5">
        <Clock size={13} /> {session.duration_minutes}min
      </div>
      <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg px-2.5 py-1.5">
        <DollarSign size={13} /> ${session.price}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-2.5 py-1.5">
        <Users size={13} /> {session.students_enrolled || 0}/{session.max_students || '∞'}
      </div>
    </div>

    {/* DESCRIPTION */}
    {session.description && (
      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">{session.description}</p>
    )}

    {/* ACTION BUTTONS */}
    <div className="flex items-center gap-2 flex-wrap z-50">
      {session.tutor?.username === user?.username ? (
        <>
          {session.status === 'pending_confirmation' && (
            <button onClick={(e) => { e.stopPropagation(); confirmSession(session.id); }}
              className="bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-green-600 transition">
              {t('Confirm')}
            </button>
          )}
                   {session.status === 'ongoing' && (
            <button onClick={(e) => { e.stopPropagation(); startVideoCall(session.id, 'tutor'); }}
              className="bg-blue-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-blue-600 transition flex items-center gap-1">
              <Play size={12} /> {t('Join Class')}
            </button>
          )}
          {session.status === 'ongoing' && (
            <button onClick={(e) => { e.stopPropagation(); completeSession(session.id); }}
              className="bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-emerald-600 transition">
              ✅ {t('Complete')}
            </button>
          )}
        </>
      ) : (
        <>
          {session.status === 'open' && (
            <button onClick={(e) => { e.stopPropagation(); requestBooking(session.id); }}
              className="bg-blue-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-blue-600 transition">
              {t('Request to Book')}
            </button>
                   )}
          {session.status === 'ongoing' && (
            <button onClick={(e) => { e.stopPropagation(); startVideoCall(session.id, 'student'); }}
              className="bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-green-600 transition flex items-center gap-1">
              <Play size={12} /> {t('Join Class')}
            </button>
          )}
        </>
      )}
      <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/tutoring/${session.id}`); toast.success('Link copied!'); }}
        className="text-xs text-gray-500 hover:text-blue-500 px-2 py-1">
        <Share2 size={14} />
      </button>
      {session.materials && session.materials.length > 0 && (
        <button onClick={(e) => { e.stopPropagation(); setShowMaterials(true); }}
          className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1">
          📎 {session.materials.length}
        </button>
      )}
    </div>
  </div>
</motion.div>
          ))}
        </div>
      )}



      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Trophy size={20} className="text-yellow-500" /> {t('Top Tutors')}</h3>
          <div className="space-y-3">
            {tutors.slice(0, 10).map((t, i) => (
              <div key={t.id || i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:shadow transition">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                  i === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                  i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                  i === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-700' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                </div>
                <div className="flex-1">
                                    <p className="font-semibold text-sm">{t.user?.username || 'Tutor'}</p>
                  <p className="text-xs text-gray-500">{t.subjects || 'Various'}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">{renderStars(t.rating || 4.5)}</div>
                  <p className="text-xs text-gray-400">{t.total_sessions || 0} sessions</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Calendar size={20} className="text-blue-500" /> {t('Session Calendar')}</h3>
          <div className="space-y-2">
            {sessions.filter(s => s.scheduled_at || s.scheduled_at).sort((a, b) => 
              new Date(a.scheduled_at || a.scheduled_at).getTime() - new Date(b.scheduled_at || b.scheduled_at).getTime()
            ).map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:shadow transition">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                  <span className="text-xs">{new Date(s.scheduled_at || s.scheduled_at).toLocaleString('en', { month: 'short' })}</span>
                  <span className="text-lg leading-none">{new Date(s.scheduled_at || s.scheduled_at).getDate()}</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{s.subject}</p>
                  <p className="text-xs text-gray-500">{t('with')} @{s.tutor?.username || 'Tutor'} · {new Date(s.scheduled_at || s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  s.status === 'ongoing' ? 'bg-green-100 text-green-700' :
                  s.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{s.status}</span>
              </div>
            ))}
            {sessions.filter(s => s.scheduled_at).length === 0 && (
              <p className="text-center text-gray-400 py-8">{t('No scheduled sessions')}</p>
            )}
          </div>
        </div>
      )}


      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal amount={paymentAmount} type="tutoring"
          onSuccess={() => {
            setShowPayment(false);
            if (pendingJoinSession) {
              startVideoCall(pendingJoinSession);
              setPendingJoinSession(null);
            }
            fetchSessions();
            toast.success('Payment successful!');
          }}
          onClose={() => { setShowPayment(false); setPendingJoinSession(null); }} />
      )}

    </div>
  );
}