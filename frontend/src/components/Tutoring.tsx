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
import { db } from '../services/offlineDB';

import DiscussionBoard from './DiscussionBoard';

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
  topic_detail?: string;
  max_students?: number;
  students_enrolled?: number;
  active_students?: number;
  duration_minutes?: number;
  background_image?: string;
  is_offline?: boolean;
  materials?: Material[];
  average_rating?: number;
  views?: number;
  enrollments?: { student: string; status: string }[];
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
  bio?: string;
  certifications?: string;
  experience_years?: number;
  linkedin_url?: string;
  website_url?: string;
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
    const [topicDetail, setTopicDetail] = useState('');
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
  const [remoteReady, setRemoteReady] = useState(false);
  const [timer, setTimer] = useState<number>(0);
  const [timerActive, setTimerActive] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pendingStreamRef = useRef<MediaStream | null>(null);
  const callingRef = useRef(false);
  const studentCallingRef = useRef(false);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const peerRef = useRef<any>(null);
  const studentStreams = useRef<Map<string, MediaStream>>(new Map());
  const rtcRef = useRef<WebRTCConnection | null>(null);
  const token = localStorage.getItem('sasl_token');
  const [remoteMuted, setRemoteMuted] = useState(true);
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
  const [showJitsi, setShowJitsi] = useState(false);
  const [tutorJoined, setTutorJoined] = useState(false);

  const [bookingRequests, setBookingRequests] = useState<Record<string, any[]>>({});
   const [sessionTimeline, setSessionTimeline] = useState<{time: number; label: string}[]>([]);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileBio, setProfileBio] = useState('');
  const [profileCertifications, setProfileCertifications] = useState('');
  const [fullscreenCert, setFullscreenCert] = useState<string | null>(null);
  const [profileLinkedin, setProfileLinkedin] = useState('');
  const [profileWebsite, setProfileWebsite] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');


const [noteSheets, setNoteSheets] = useState<any[]>([]);
const [showNoteSheet, setShowNoteSheet] = useState(false);
const [showNotesList, setShowNotesList] = useState(false);
const [noteContent, setNoteContent] = useState('');
const [remainingSheets, setRemainingSheets] = useState(4);
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
      // Don't filter by status for upcoming — show all non-completed
      if (searchQuery) params.set('search', searchQuery);
      const res = await api.get(`/tutoring/sessions/?${params.toString()}`);
      let data = res.data.results || [];
      // Filter on frontend
      if (activeTab === 'ongoing') data = data.filter((s: any) => s.status === 'ongoing');
      else if (activeTab === 'completed') data = data.filter((s: any) => s.status === 'completed');
      else if (activeTab === 'upcoming') data = data.filter((s: any) => ['open', 'scheduled', 'pending_confirmation'].includes(s.status));
      setSessions(data);
            // Update stats
      const totalSessions = data.length;
      const completedSessions = data.filter((s: any) => s.status === 'completed').length;
      const totalEarned = data.filter((s: any) => s.status === 'completed' && s.tutor?.username === user?.username).reduce((sum: number, s: any) => sum + parseFloat(s.price || '0'), 0);
      const totalLearned = data.filter((s: any) => s.status === 'completed' && s.student?.username === user?.username).reduce((sum: number, s: any) => sum + parseFloat(s.price || '0'), 0);
      setStats({ totalSessions, completedSessions, totalEarned: totalEarned.toFixed(2), totalLearned: totalLearned.toFixed(2) });
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

   const fetchBookingRequests = async (sessionId: string) => {
  try {
    const res = await api.get(`/tutoring/sessions/${sessionId}/booking_requests/`);
    setBookingRequests(prev => ({ ...prev, [sessionId]: res.data }));
  } catch {}
};


  const fetchActiveStudents = async (sessionId: string) => {
    try {
      const res = await api.get(`/tutoring/sessions/${sessionId}/active_students/`);
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, active_students: res.data.active_students } : s));
    } catch {}
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



// Auto-refresh whiteboard every 5s for students
useEffect(() => {
  if (!inCall || !showWhiteboard) return;
  const interval = setInterval(() => {
    fetchWhiteboard(inCall);
  }, 5000);
  return () => clearInterval(interval);
}, [inCall, showWhiteboard]);


useEffect(() => {
  if (remoteStreamRef.current && remoteVideoRef.current) {
    remoteVideoRef.current.srcObject = remoteStreamRef.current;
  }
}, [inCall, remoteStreamRef.current]);


useEffect(() => {
  if (remoteStreamRef.current && remoteVideoRef.current) {
    console.log('🔗 Attaching remote stream');
    remoteVideoRef.current.srcObject = remoteStreamRef.current;
    remoteVideoRef.current.play().catch(() => {});
  }
}, [inCall, remoteReady]);



useEffect(() => {
  if (pendingStreamRef.current && localVideoRef.current) {
    localVideoRef.current.srcObject = pendingStreamRef.current;
    localVideoRef.current.muted = true;
    localVideoRef.current.play().catch(() => {});
  }
}, [inCall]);


// Save inCall + role to localStorage on join
useEffect(() => {
  if (inCall) {
    localStorage.setItem('sasl_in_call_session', inCall);
    const currentSession = sessions.find(s => s.id === inCall);
    localStorage.setItem('sasl_in_call_role', user?.username === currentSession?.tutor?.username ? 'tutor' : 'student');
  }
}, [inCall]);




useEffect(() => {
  const savedSession = localStorage.getItem('sasl_in_call_session');
  const savedRole = localStorage.getItem('sasl_in_call_role');
  if (savedSession && savedRole && savedRole === 'tutor') {
    const session = sessions.find(s => s.id === savedSession);
    if (session && session.status === 'ongoing') {
      toast('📞 Rejoining session...');
      setTimeout(() => {
        startVideoCall(savedSession, 'tutor');
      }, 1000);
    }
  }
  localStorage.removeItem('sasl_in_call_session');
  localStorage.removeItem('sasl_in_call_role');
}, []);



// Auto-refresh whiteboard for students
useEffect(() => {
  if (!inCall || !showWhiteboard) return;
  const interval = setInterval(() => {
    fetchWhiteboard(inCall);
  }, 3000);
  return () => clearInterval(interval);
}, [inCall, showWhiteboard]);
  // ============================================================
  // ACTIONS
  // ============================================================
 




  const createSession = async () => {
    if (!subject || !price || !scheduledAt) return toast.error(t('Fill all required fields'));
    try {
      // Convert datetime-local to ISO 8601 with timezone
      const scheduledISO = new Date(scheduledAt).toISOString();
      if (!navigator.onLine) {
        await db.offlineActions.put({ type: 'create_tutoring_session', data: { subject, description, price: parseFloat(price), scheduled_at: scheduledISO, is_group_class: isGroupClass }, created_at: Date.now() });
        toast.success('📦 Session saved offline');
        return;
      }
        await api.post('/tutoring/sessions/', {
        subject,
        description,
        price: parseFloat(price),
        scheduled_at: scheduledISO,
        is_offline: isOffline,
        duration_minutes: parseInt(duration),
        max_students: parseInt(maxStudents),
        topic_detail: topicDetail,
        is_group_class: isGroupClass,
        background_image: bgImageUrl || null,
      });
      toast.success(t('Session created!'));
      fetchSessions();
      setShowCreateForm(false);
    } catch (err: any) {
      console.log('Session creation error:', err.response?.data || err.message);
      toast.error(err.response?.data?.detail || err.response?.data?.error || t('Failed to create session'));
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
    
    try {
      // Upload to Supabase Storage
      const { supabase } = await import('../services/supabase');
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Date.now()}_${uploadFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(`materials/${fileName}`, uploadFile);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(`materials/${fileName}`);
      
      const fileUrl = urlData.publicUrl;
      
      // Save to backend with the Supabase URL
      await api.post(`/tutoring/sessions/${sessionId}/upload_material/`, {
        title: materialTitle,
        description: materialDesc,
        file_url: fileUrl
      });
      
      toast.success(t('Material uploaded!'));
      setMaterialTitle(''); setMaterialDesc(''); setUploadFile(null);
      fetchSessions();
    } catch (err: any) {
      console.log('Upload error:', err);
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


const respondBooking = async (sessionId: string, enrollmentId: string, action: 'accept' | 'reject') => {
  try {
    await api.post(`/tutoring/sessions/${sessionId}/respond_booking/`, { enrollment_id: enrollmentId, action });
    toast.success(action === 'accept' ? '✅ Student accepted!' : '❌ Student rejected');
    fetchBookingRequests(sessionId);
    fetchSessions();
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Action failed');
  }
};



const [bookingMessage, setBookingMessage] = useState('');

const requestBookingWithMessage = async (id: string) => {
  try {
    await api.post(`/tutoring/sessions/${id}/request_booking/`, { message: bookingMessage });
    toast.success(t('Booking requested!'));
    setBookingMessage('');
    fetchSessions();
  } catch (err: any) {
    toast.error(err.response?.data?.error || t('Failed to request booking'));
  }
};

const startVideoCall = async (sessionId: string, role: 'tutor' | 'student' = 'student') => {
    if (role === 'tutor') {
  if (callingRef.current) { console.log('⚠️ Tutor already connecting'); return; }
  callingRef.current = true;
} else {
  // Students can join independently — don't block on tutor's callingRef
   // Students can always join — no blocking
}
      // STUDENT GUARD: Session must be ongoing (tutor accepted all students)
    const session = sessions.find(s => s.id === sessionId);
   
        if (role === 'student' && session) {
      // Session must be ongoing
      if (session.status !== 'ongoing' && session.status !== 'in_progress') {
        toast.error('⛔ Session has not started yet. Wait for all seats to fill.');
        return;
      }
      
      // Tutor must have joined (check via API)
      try {
        const tutorRes = await api.get(`/tutoring/sessions/${sessionId}/tutor_presence/`);
        if (!tutorRes.data?.tutor_joined) {
          toast.error('⏳ Wait for the tutor to join the class.');
          return;
        }
      } catch {
        // If endpoint fails, allow join (don't block)
      }
    }

      console.log('🔴 START Sasl PeerJS call', sessionId, role);
  try {
       const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 480, facingMode: 'user' }, 
      audio: true 
    });


      // ALWAYS unmute audio tracks — muting happens on receiver side
    stream.getAudioTracks().forEach(track => {
      track.enabled = true;
      console.log('🎤 Audio track enabled:', track.enabled, 'muted:', track.muted);
    });  
    
    // ENSURE AUDIO TRACK IS ENABLED
    stream.getAudioTracks().forEach(track => {
      track.enabled = true;
      console.log('🎤 Audio track enabled:', track.enabled, 'muted:', track.muted);
    });
    stream.getVideoTracks().forEach(track => {
      track.enabled = true;
    });

            // In group class, students are muted by default. Tutor is ALWAYS unmuted.
    
      // ALL audio is ALWAYS live. Muting happens on receiver side only.
    console.log('🎤 All audio tracks LIVE');

        // Create clean stream with unmuted tracks for sending
    const cleanStream = new MediaStream();

    stream.getVideoTracks().forEach(t => cleanStream.addTrack(t));
    stream.getAudioTracks().forEach(t => {
      const clone = t.clone();
      clone.enabled = true;
      cleanStream.addTrack(clone);
    });

    pendingStreamRef.current = stream;

    

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {});
    }
    
    const { Peer } = await import('peerjs');
   const uniqueId = `sasl-${sessionId}-${role}-${user?.username}`;
const peer = new Peer(uniqueId, {
      host: 'sasl-peerjs.onrender.com',
      port: 443,
      path: '/sasl-peerjs',
      secure: true
    });
        peerRef.current = peer;
    
    peer.on('open', () => {
      console.log('🟢 PeerJS connected:', peer.id);
            if (role === 'tutor') {
      
      }
      setInCall(sessionId);

      if (role === 'student') {
           setRemoteReady(false);     // Reset remote video
      }
      
      if (role === 'tutor') {
                        api.post(`/tutoring/sessions/${sessionId}/tutor_join/`).catch((err) => {
          console.log('tutor_join failed, continuing anyway:', err);
        });
        // Don't let API failure block the call
        setTutorJoined(true);
      }
      // Set up data connection for hand raise
      if (role === 'student') {
        const conn = peer.connect(`sasl-${sessionId}-tutor-${sessions.find(s => s.id === sessionId)?.tutor?.username}`, { reliable: true });
        conn.on('open', () => {
          console.log('📡 Data connection open');
        });
            }
    });
      
    
    // Tutor receives data connections
    peer.on('connection', (conn: any) => {
      // No data handling needed — Notebook Sheets replace hand-raise
    });


    

    peer.on('call', (call) => {
      console.log('📞 Incoming call, answering');
      call.answer(cleanStream);
      call.on('stream', (remoteStream) => {
        console.log('🎥 Remote stream received');
        remoteStreamRef.current = remoteStream;
        
        // Unmute all audio tracks from picked student
               remoteStream.getAudioTracks().forEach(track => {
          track.enabled = true;
          console.log('🎤 Remote audio track enabled:', track.enabled);
        });
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.volume = 1.0;
          remoteVideoRef.current.play().then(() => {
            console.log('🔊 Remote video playing WITH audio');
          }).catch((e) => {
            console.log('🔊 Play blocked, waiting for user gesture');
            document.addEventListener('click', () => {
              remoteVideoRef.current?.play().catch(() => {});
            }, { once: true });
          });
        }
      });
    });
    
    if (role === 'tutor') {
      console.log('🟡 Tutor waiting for student to call');
    
        } else {
      setTimeout(() => {
        const tutorUsername = sessions.find(s => s.id === sessionId)?.tutor?.username;
        const call = peer.call(`sasl-${sessionId}-tutor-${tutorUsername}`, cleanStream);
        call.on('stream', (remoteStream) => {
          console.log('🎥 Tutor stream received');
          remoteStreamRef.current = remoteStream;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(() => {});
          }
        });
      }, 2000);
    }
    
    const currentSession = sessions.find(s => s.id === sessionId);
    if (currentSession?.duration_minutes) {
      setTimer(currentSession.duration_minutes * 60);
      setTimerActive(true);
    }
  } catch (err: any) {
    console.log('🔴 PeerJS error:', err);
    toast.error(err.message || 'Failed to start call');
    callingRef.current = false;
  
    studentCallingRef.current = false;
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

        if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
  };



   const saveProfile = async () => {
  try {
    await api.patch('/tutoring/profiles/me/', {
      bio: profileBio,
      certifications: profileCertifications,
      linkedin_url: profileLinkedin,
      website_url: profileWebsite
    });
    toast.success('Profile updated!');
    setShowProfileEdit(false);
    fetchTutors();
  } catch {
    toast.error('Failed to update profile');
  }
};

  // ============================================================
  // WHITEBOARD
  // ============================================================
  const fetchWhiteboard = async (sessionId: string) => {
    try {
      const res = await api.get(`/tutoring/sessions/${sessionId}/whiteboard/`);
      setWhiteboardData(res.data);
            // Draw fetched data onto canvas
      if (res.data?.data && canvasRef.current) {
      const img = new window.Image();
        img.onload = () => {
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
            ctx.drawImage(img, 0, 0);
          }
        };
        img.src = res.data.data;
      }
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


const submitNote = async () => {
  if (!noteContent.trim() || remainingSheets <= 0) return;
  try {
    await api.post(`/tutoring/sessions/${inCall}/submit_note/`, { content: noteContent });
    toast.success('📤 Note submitted!');
    setNoteContent('');
    setRemainingSheets(prev => prev - 1);
    setShowNoteSheet(false);
  } catch {
    toast.error('Failed to submit');
  }
};




const fetchNotes = async () => {
  try {
    const res = await api.get(`/tutoring/sessions/${inCall}/student_notes/`);
    const newNotes = res.data || [];
    if (newNotes.length > noteSheets.length) {
      toast('📝 New student note received!', { icon: '📝' });
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
      } catch {}
    }
    setNoteSheets(newNotes);
  } catch {}
};


// Auto-poll notes every 5s when tutor is in a group class call
useEffect(() => {
  if (!inCall) return;
  const isTutor = user?.username === sessions.find(s => s.id === inCall)?.tutor?.username;
  const isGroup = sessions.find(s => s.id === inCall)?.is_group_class;
  if (!isTutor || !isGroup) return;
  
  const interval = setInterval(async () => {
    try {
      const res = await api.get(`/tutoring/sessions/${inCall}/student_notes/`);
      const newNotes = res.data || [];
      if (newNotes.length > noteSheets.length) {
        toast(`📝 ${newNotes.length - noteSheets.length} new note(s) from students!`, { icon: '📝' });
      }
      setNoteSheets(newNotes);
    } catch {}
  }, 5000);
  
  return () => clearInterval(interval);
}, [inCall, noteSheets.length, user?.username, sessions]);

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
                            {/* Timeline + Timer */}
              <div className="hidden sm:flex items-center gap-2 w-40">
                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-orange-500 transition-all duration-1000" 
                    style={{ width: `${timer > 0 ? (((sessions.find(s => s.id === inCall)?.duration_minutes || 60) * 60 - timer) / ((sessions.find(s => s.id === inCall)?.duration_minutes || 60) * 60)) * 100 : 0}%` }}/>
                </div>
                               {timer > 0 && (
                  <span className={`font-mono font-bold text-lg whitespace-nowrap ${timer <= 60 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                    {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                  </span>
                )}
                {/* Rewind 30 seconds */}
                <button onClick={() => setTimer(prev => Math.min(prev + 30, (sessions.find(s => s.id === inCall)?.duration_minutes || 60) * 60))}
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded-full whitespace-nowrap">
                  ⏪ 30s
                </button>
              </div>
                      
              <div className="flex items-center gap-2 flex-wrap relative z-50">
                   
                <button onClick={() => { setShowWhiteboard(!showWhiteboard); if (!showWhiteboard && inCall) fetchWhiteboard(inCall); }}
                  className="px-3 py-1.5 rounded-full bg-gray-700 hover:bg-gray-600 text-sm flex items-center gap-1">
                  <PenTool size={14} /> Whiteboard
                </button>
                <button onClick={() => setShowChat(!showChat)}
                  className="px-3 py-1.5 rounded-full bg-gray-700 hover:bg-gray-600 text-sm flex items-center gap-1">
                  <MessageCircle size={14} /> Chat
                </button>

                                                {/* Note to Tutor — Student only in group class */}
                {sessions.find(s => s.id === inCall)?.is_group_class && user?.username !== sessions.find(s => s.id === inCall)?.tutor?.username && (
                  <button onClick={() => setShowNoteSheet(true)}
                    className="px-3 py-1.5 rounded-full text-sm flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white">
                    📝 Note to Tutor ({remainingSheets} left)
                  </button>
                )}
                                {/* Tutor Notes button */}
                {sessions.find(s => s.id === inCall)?.is_group_class && user?.username === sessions.find(s => s.id === inCall)?.tutor?.username && (
                                    <button onClick={() => { setShowNotesList(!showNotesList); if (!showNotesList) fetchNotes(); }}
                    className="px-3 py-1.5 rounded-full bg-gray-700 hover:bg-gray-600 text-sm flex items-center gap-1">
                    <FileText size={14} /> Notes
                  </button>
                )}
                <button onClick={() => { setShowMaterials(!showMaterials); if (!showMaterials) fetchSessions(); }}
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
          
                                  {/* VIDEOS — Sasl */}
              <div className={`${showChat || showWhiteboard || showMaterials ? 'flex-[3]' : 'flex-1'} p-2`}>
                                                                            {sessions.find(s => s.id === inCall)?.is_group_class ? (
                                   // GROUP CLASS: Everyone sees TUTOR
                    <div className="flex-1 relative h-full">
                     <video ref={user?.username === sessions.find(s => s.id === inCall)?.tutor?.username ? localVideoRef : remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
                      <span className="absolute bottom-2 left-2 bg-orange-500/80 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        {user?.username === sessions.find(s => s.id === inCall)?.tutor?.username ? 'Tutor (You)' : `@${sessions.find(s => s.id === inCall)?.tutor?.username}`}
                      </span>
                    </div>
                ) : (     
                  // 1-ON-1: Split screen
                  <div className="flex-1 grid grid-cols-2 gap-2 h-full" style={{ minHeight: '100%' }}>
                    <div className="relative rounded-xl overflow-hidden bg-black" style={{ minHeight: '100%', minWidth: '100%' }}>
                      <video ref={localVideoRef} autoPlay  playsInline className="absolute inset-0 w-full h-full object-cover" />
                     {remoteMuted && (
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <span className="bg-green-500/90 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse">
                               👆 Tap to Unmute
                      </span>
                      </div>
                        )}
                      <span className="absolute bottom-2 left-2 bg-green-500/80 text-white px-3 py-1 rounded-full text-sm font-semibold">You</span>
                    </div>
                    <div className="relative rounded-xl overflow-hidden bg-black" style={{ minHeight: '100%', minWidth: '100%' }}>
                     <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" onClick={(e) => {
                         const v = e.currentTarget;
                          v.muted = !v.muted;
                          setRemoteMuted(v.muted);
                          if (!v.muted) v.play().catch(() => {});
                            }}/>
                      <span className="absolute bottom-2 left-2 bg-orange-500/80 text-white px-3 py-1 rounded-full text-sm font-semibold">Remote</span>
                    </div>
                  </div>
                )}
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
                      {sessions.find(s => s.id === inCall)?.is_group_class ? (
                        <DiscussionBoard 
                          sessionId={inCall!} 
                          isTutor={user?.username === sessions.find(s => s.id === inCall)?.tutor?.username}
                          onClose={() => setShowChat(false)} 
                        />
                      ) : (
                        <TutoringChat roomId={inCall!} onClose={() => setShowChat(false)} />
                      )}
                    </div>
                  )}
                                                      {showMaterials && (
                    <div className="p-3 text-white">
                      <h4 className="font-bold text-sm mb-2">Materials</h4>
                      <input 
                        placeholder="Title (required)" 
                        value={materialTitle}
                        onChange={e => setMaterialTitle(e.target.value)}
                        className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1.5 mb-2"
                      />
                      <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} 
                        className="text-xs mb-2 w-full" />
                      <button 
                        onClick={() => uploadMaterial(inCall!)}
                        disabled={!uploadFile || !materialTitle}
                        className="w-full py-1.5 bg-gradient-to-r from-green-500 to-orange-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 mb-3">
                        📤 Upload Material
                      </button>
                      {sessions.find(s => s.id === inCall)?.materials?.map(m => (
                        <a key={m.id} href={m.file_url} target="_blank" 
                          className="block text-xs text-green-400 hover:text-green-300 mb-1">
                          📄 {m.title}
                        </a>
                      ))}
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
          {(user?.is_teacher || sessions.some(s => s.tutor?.username === user?.username)) && (
  <button onClick={() => setShowProfileEdit(true)} className="btn-ghost text-sm flex items-center gap-1">
    <Award size={16} /> Edit Profile
  </button>
)}
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
                           <input className="input-field" list="subjects-list" placeholder={t('Subject * (type or select)')} value={subject} onChange={e => setSubject(e.target.value)} />
              <datalist id="subjects-list">
                {SUBJECTS.map(s => <option key={s} value={s} />)}
              </datalist>
              <input className="input-field" type="number" placeholder={t('Price ($) *')} value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <textarea className="input-field" placeholder={t('Description...')} value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                          <input className="input-field" placeholder={t('What specific topic will you teach? (optional)')} value={topicDetail} onChange={e => setTopicDetail(e.target.value)} />
                       
                        <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-500 hover:text-gray-700">
                <Image size={16} />
               {bgImage?.name || 'Session background image (optional)'}
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

            {/* Tutor Profile Edit Modal */}
      <AnimatePresence>
        {showProfileEdit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="font-bold text-xl mb-4 text-transparent bg-gradient-to-r from-green-500 to-orange-500 bg-clip-text">🏆 Your Expert Profile</h3>
              <textarea className="input-field mb-3" placeholder="Bio — tell students about your expertise..." value={profileBio} onChange={e => setProfileBio(e.target.value)} rows={3} />
              <textarea className="input-field mb-3" placeholder="Certifications (one per line)..." value={profileCertifications} onChange={e => setProfileCertifications(e.target.value)} rows={3} />
                               <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-400 hover:text-gray-300 mb-3">
  <Upload size={16} />
  Upload Certifications (Multiple)
  <input type="file" accept=".pdf,.jpg,.png,image/*" multiple className="hidden" onChange={async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const url = await uploadToCloud(file, 'certifications');
      if (url) setProfileCertifications(prev => prev ? prev + '\n' + url : url);
    }
  }} />
</label>
              <input className="input-field mb-3" placeholder="LinkedIn URL" value={profileLinkedin} onChange={e => setProfileLinkedin(e.target.value)} />
              <input className="input-field mb-4" placeholder="Website URL" value={profileWebsite} onChange={e => setProfileWebsite(e.target.value)} />
              <input className="input-field mb-3" placeholder="Email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} />
<input className="input-field mb-3" placeholder="Phone/WhatsApp" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} />
              <button onClick={saveProfile}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-orange-500/30 transition">
                💾 Save Profile
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
               {/* Fullscreen Certificate Modal */}
      <AnimatePresence>
        {fullscreenCert && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[999] flex items-center justify-center p-4" onClick={() => setFullscreenCert(null)}>
             <motion.img src={fullscreenCert || ''} initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
              className="max-w-full max-h-full object-contain rounded-xl" />
            <button onClick={() => setFullscreenCert(null)} className="absolute top-5 right-5 text-white/70 hover:text-white text-3xl">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notebook Sheet Modal */}
<AnimatePresence>
  {showNoteSheet && (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="font-bold text-xl mb-2">📝 Note to Tutor</h3>
        <p className="text-xs text-gray-500 mb-4">{remainingSheets} sheets remaining</p>
        <textarea
          className="input-field mb-4"
          placeholder="Write what you didn't understand, which part to re-explain..."
          value={noteContent}
          onChange={e => setNoteContent(e.target.value)}
          rows={5}
        />
        <button
          onClick={submitNote}
          disabled={!noteContent.trim() || remainingSheets <= 0}
          className="w-full py-3 bg-gradient-to-r from-green-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50">
          📤 Submit to Tutor
        </button>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>


      {/* Tutor Notes List Modal */}
      <AnimatePresence>
        {showNotesList && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl max-h-[80vh] overflow-y-auto">
              <h3 className="font-bold text-xl mb-4">📝 Student Notes</h3>
              {noteSheets.length === 0 ? (
                <p className="text-gray-500 text-sm">No notes submitted yet.</p>
              ) : (
                noteSheets.map(note => (
                  <div key={note.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 mb-2">
                    <p className="text-xs font-bold text-green-600">@{note.student_username}</p>
                    <p className="text-sm mt-1">{note.content}</p>
                  </div>
                ))
              )}
              <button onClick={() => setShowNotesList(false)} className="w-full py-2 bg-gray-200 dark:bg-gray-600 rounded-xl mt-3">Close</button>
            </motion.div>
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
        <div className="space-y-4">
          {sessions.map(session => (
         <motion.div key={session.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
  className={`rounded-3xl overflow-hidden transition-all duration-300 ${
    expandedSession === session.id ? 'ring-2 ring-green-400 shadow-2xl shadow-green-500/20' : 'hover:shadow-xl hover:shadow-orange-500/10'
  } ${session.background_image ? 'bg-cover bg-center' : 'bg-gradient-to-br : from-gray-50 to-white dark:from-gray-800 dark:to-gray-900'}`}
  style={session.background_image ? {
    backgroundImage: `linear-gradient(rgba(17,24,39,0.92), rgba(17,24,39,0.92)), url(${session.background_image})`,
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
      fetchActiveStudents(session.id);
    }
    if (isOpening) {
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, views: (s.views || 0) + 1 } : s));
    }
    if (isOpening && session.tutor?.username === user?.username) {
  fetchBookingRequests(session.id);

      if (isOpening) {
      fetchActiveStudents(session.id);
    }
}
  }}>
    
    {/* TOP ROW: Avatar + Subject + Status */}
    <div className="flex items-start gap-3 mb-3">
      {session.tutor.avatar_url ? (
        <img src={session.tutor.avatar_url} className="w-12 h-12 rounded-full object-cover flex-shrink-0 ring-2 ring-green-400 shadow-lg shadow-green-500/30" alt="" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-orange-500 flex items-center justify-center text-white font-bold text-base flex-shrink-0 ring-2 ring-green-400/50 shadow-lg">
          {session.tutor.username[0]?.toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-base sm:text-lg flex items-center gap-2 flex-wrap text-white">
          <span className="truncate bg-gradient-to-r from-green-300 to-orange-300 bg-clip-text text-transparent">{session.subject}</span>
                    {session.topic_detail && (
            <span className="text-xs text-orange-400 mt-0.5 truncate">📌 {session.topic_detail}</span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${
            session.status === 'ongoing' ? 'bg-green-500 text-white' :
            session.status === 'completed' ? 'bg-gray-500 text-white' :
            'bg-orange-500 text-white'
          }`}>
            {session.status}
          </span>
          {session.is_group_class && (
            <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap border border-orange-400/30">
              <Users size={10} /> Group
            </span>
          )}
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">@{session.tutor.username}</p>
      </div>
    </div>

    {/* INFO ROW: Date, Time, Price, Enrolled */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-300 bg-gray-700/50 rounded-lg px-2.5 py-1.5 border border-gray-600/30">
        <Calendar size={13} className="text-green-400" /> {formatDate(session.scheduled_at)}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-300 bg-gray-700/50 rounded-lg px-2.5 py-1.5 border border-gray-600/30">
        <Clock size={13} className="text-orange-400" /> {session.duration_minutes}min
      </div>
      <div className="flex items-center gap-1.5 text-xs font-bold text-green-300 bg-green-500/10 rounded-lg px-2.5 py-1.5 border border-green-400/30">
        <DollarSign size={13} /> ${session.price}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-orange-300 bg-orange-500/10 rounded-lg px-2.5 py-1.5 border border-orange-400/30">
        <Users size={13} /> {session.students_enrolled || 0}/{session.max_students || '∞'}
                
                {session.active_students ? (
          <span className="text-xs text-green-500 font-bold flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> {session.active_students} active
          </span>
        ) : null}
      </div>
    </div>

    {/* DESCRIPTION */}
    {session.description && (
      <p className="text-sm text-gray-400 line-clamp-2 mb-3 leading-relaxed">{session.description}</p>
    )}

    {/* EXPANDED: Tutor Showcase + Booking */}
    {expandedSession === session.id && (
      <div className="mb-3 border-t border-gray-700 pt-3" onClick={e => e.stopPropagation()}>
        <h4 className="text-sm font-bold text-transparent bg-gradient-to-r from-green-300 to-orange-300 bg-clip-text mb-2">
          🏆 Tutor Excellence
        </h4>
        <div className="max-h-40 overflow-y-auto pr-2 space-y-1.5 scrollbar-thin">
                   {(() => {
            const certs = tutors.find(t => t.user?.username === session.tutor?.username)?.certifications;
            if (!certs) return <p className="text-xs text-gray-500">No certifications listed yet.</p>;
            const certList = certs.split('\n').filter(Boolean);
            return (
              <div className="space-y-2">
                {certList.map((cert, i) => (
                  cert.startsWith('http') ? (
                <img key={i} src={cert} alt={`Certification ${i + 1}`} onClick={(e) => { e.stopPropagation(); setFullscreenCert(cert); }} className="w-full max-w-[180px] rounded-xl object-cover border border-green-200 dark:border-green-800 cursor-pointer hover:ring-2 hover:ring-green-400 transition" />
                  ) : (
                    <p key={i} className="text-xs text-gray-400 flex items-center gap-1">
                      <Award size={12} className="text-green-500" /> {cert}
                    </p>
                  )
                ))}
              </div>
            );
          })()}
          {tutors.find(t => t.user?.username === session.tutor?.username)?.bio && (
            <p className="text-xs text-gray-400">{tutors.find(t => t.user?.username === session.tutor?.username)?.bio}</p>
          )}
          <div className="flex gap-2 pt-1">
            {tutors.find(t => t.user?.username === session.tutor?.username)?.linkedin_url && (
              <a href={tutors.find(t => t.user?.username === session.tutor?.username)?.linkedin_url} target="_blank" className="text-xs text-green-400 hover:text-green-300 underline">LinkedIn</a>
            )}
            {tutors.find(t => t.user?.username === session.tutor?.username)?.website_url && (
              <a href={tutors.find(t => t.user?.username === session.tutor?.username)?.website_url} target="_blank" className="text-xs text-orange-400 hover:text-orange-300 underline">Website</a>
            )}
          </div>
        </div>
      </div>
    )}

         {/* BOOKING REQUESTS — Tutor only */}
    {expandedSession === session.id && session.tutor?.username === user?.username && (
      <div className="mb-3 border-t border-gray-300 dark:border-gray-700 pt-3" onClick={e => e.stopPropagation()}>
        <h4 className="text-sm font-bold text-green-600 mb-2 flex items-center gap-1">
          <Users size={14} /> Booking Requests
        </h4>
        {bookingRequests[session.id]?.length > 0 ? (
                    bookingRequests[session.id].map((req: any) => (
            <div key={req.id} className="flex items-center justify-between mb-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {req.student_avatar ? (
                  <img src={req.student_avatar} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-orange-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {req.student_username?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-green-700 dark:text-green-400">@{req.student_username}</p>
                  {req.message && <p className="text-xs text-gray-500 mt-0.5 italic">"{req.message}"</p>}
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={(e) => { e.stopPropagation(); respondBooking(session.id, req.id, 'accept'); }}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-bold hover:shadow-lg transition">
                  ✅ Accept
                </button>
                <button onClick={(e) => { e.stopPropagation(); respondBooking(session.id, req.id, 'reject'); }}
                  className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold hover:shadow-lg transition">
                  ❌ Reject
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-gray-500">No pending requests.</p>
        )}
      </div>
    )}

    {/* ACTION BUTTONS */}
    <div className="flex items-center gap-2 flex-wrap z-50">
      {session.tutor?.username === user?.username ? (
        <>
          {session.status === 'pending_confirmation' && (
            <button onClick={(e) => { e.stopPropagation(); confirmSession(session.id); }}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-full text-xs font-bold hover:shadow-lg hover:shadow-green-500/30 transition">
              ✅ Confirm
            </button>
          )}
          {session.status === 'ongoing' && (
            <button onClick={(e) => { e.stopPropagation(); startVideoCall(session.id, 'tutor'); }}
              className="bg-gradient-to-r from-green-500 to-orange-500 text-white px-4 py-2 rounded-full text-xs font-bold hover:shadow-lg hover:shadow-orange-500/30 transition flex items-center gap-1">
              <Play size={12} /> Join Class
            </button>
          )}
          {session.status === 'ongoing' && (
            <button onClick={(e) => { e.stopPropagation(); completeSession(session.id); }}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full text-xs font-bold hover:shadow-lg transition">
              ✅ Complete
            </button>
          )}
        </>
      ) : (
        <>
                  {session.status === 'open' && (
            <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
              <input 
                placeholder="✉️ Message to tutor..." 
                className="bg-gray-700/50 text-white text-xs rounded-full px-3 py-1.5 border border-gray-600/30 w-40"
                onChange={e => setBookingMessage(e.target.value)}
              />
              <button onClick={(e) => { e.stopPropagation(); requestBookingWithMessage(session.id); }}
                className="bg-gradient-to-r from-green-500 to-orange-500 text-white px-4 py-2 rounded-full text-xs font-bold hover:shadow-lg hover:shadow-orange-500/30 transition">
                🎯 Request
              </button>
            </div>
          )}
          {session.status === 'ongoing' && (
            <button onClick={(e) => { e.stopPropagation(); startVideoCall(session.id, 'student'); }}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-full text-xs font-bold hover:shadow-lg transition flex items-center gap-1">
              <Play size={12} /> Join Class
            </button>
          )}
        </>
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