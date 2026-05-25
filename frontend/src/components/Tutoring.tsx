/**
 * Sasl - Social Asynchronous Sharing Layer
 * Tutoring – Advanced with whiteboard, materials, certificates, group classes, subject search
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  BookOpen, Calendar, Loader2, AlertCircle, Search, Filter,
  Video, VideoOff, Users, MessageCircle, Star, Clock, Play, Pause,
  ClipboardList, Award, FileText, Download, Upload, PenTool,
  GraduationCap, ChevronDown, ChevronUp, X, CheckCircle, Globe,
  DollarSign, BarChart3, Bookmark, Share2, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WebRTCConnection } from '../services/webrtc';
import WebRTCPrivateChat from './WebRTCPrivateChat';
import { useTranslation } from 'react-i18next';

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
  is_offline?: boolean;
  materials?: Material[];
  average_rating?: number;
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
  const [activeTab, setActiveTab] = useState<'upcoming' | 'ongoing' | 'completed' | 'mine'>('upcoming');
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
  const [isOffline, setIsOffline] = useState(true);

  // Tutor profiles
  const [tutors, setTutors] = useState<TutorProfile[]>([]);
  const [showTutors, setShowTutors] = useState(false);

  // Video call
  const [inCall, setInCall] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
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

  // ============================================================
  // FETCH
  // ============================================================
  const fetchSessions = useCallback(async () => {
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

      // Calculate stats
      const completed = data.filter((s: Session) => s.status === t('completed'));
      setStats({
        totalSessions: data.length,
        completedSessions: completed.length,
        totalEarned: completed
          .filter((s: Session) => s.tutor?.username === user?.username)
          .reduce((sum: number, s: Session) => sum + parseFloat(s.price || '0'), 0)
          .toFixed(2),
        totalLearned: completed
          .filter((s: Session) => s.student?.username === user?.username)
          .reduce((sum: number, s: Session) => sum + parseFloat(s.price || '0'), 0)
          .toFixed(2),
      });
    } catch (err) {
      setError(t('Failed to load sessions.'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, user]);

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

  useEffect(() => { fetchSessions(); fetchTutors(); fetchCertificates(); }, [fetchSessions]);

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
      });
      toast.success(`${isGroupClass ? 'Group class' : 'Session'} created! 🎉`);
      resetForm();
      fetchSessions();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error creating session');
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

  // ============================================================
  // VIDEO CALL
  // ============================================================
  const startVideoCall = (sessionId: string) => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        const wsUrl = `wss://sasl.pythonanywhere.com/ws/video/${sessionId}/?token=${token}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        const rtc = new WebRTCConnection((msg) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); });
        rtcRef.current = rtc;

        ws.onopen = () => {
          if (localVideoRef.current) rtc.startLocalStream(localVideoRef.current);
          ws.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'answer') await rtc.handleAnswer(data.answer);
            else if (data.type === 'offer' && remoteVideoRef.current) await rtc.handleOffer(data.offer, remoteVideoRef.current);
            else if (data.type === 'candidate') await rtc.addIceCandidate(data.candidate);
          };
          if (remoteVideoRef.current) rtc.createOffer(remoteVideoRef.current);
        };
        setInCall(sessionId);
      })
      .catch(() => toast.error(t('Camera access denied')));
  };

  const endCall = () => {
    rtcRef.current?.disconnect();
    wsRef.current?.close();
    setInCall(null);
  };

  // ============================================================
  // WHITEBOARD
  // ============================================================
  const fetchWhiteboard = async (sessionId: string) => {
    try {
      const res = await api.get(`/tutoring/sessions/${sessionId}/whiteboard/`);
      setWhiteboardData(res.data);
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
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="font-bold flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" /> {t('Live Class')}
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setShowWhiteboard(!showWhiteboard); if (!showWhiteboard && inCall) fetchWhiteboard(inCall); }}
                    className="btn-ghost text-sm flex items-center gap-1">
                    <PenTool size={14} /> {t('Whiteboard')}
                  </button>
                  <button onClick={() => setShowChat(!showChat)} className="btn-ghost text-sm flex items-center gap-1">
                    <MessageCircle size={14} /> {showChat ? t('Hide Chat') : t('Chat')}
                  </button>
                  <button onClick={() => setShowMaterials(!showMaterials)} className="btn-ghost text-sm flex items-center gap-1">
                    <FileText size={14} /> {t('Materials')}
                  </button>
                  <button onClick={endCall} className="bg-red-500 text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-1">
                    <VideoOff size={14} /> {t('End')}
                  </button>
                </div>
              </div>
              <div className="flex">
                <div className={`${showChat || showWhiteboard || showMaterials ? 'w-2/3' : 'w-full'} p-4`}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                      <video ref={localVideoRef} autoPlay muted className="w-full h-full object-cover" />
                      <span className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">You</span>
                    </div>
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                      <video ref={remoteVideoRef} autoPlay className="w-full h-full object-cover" />
                      <span className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                        {expandedSession ? sessions.find(s => s.id === inCall)?.tutor?.username || 'Remote' : 'Remote'}
                      </span>
                    </div>
                  </div>
                </div>
                {showWhiteboard && (
                  <div className="w-1/3 border-l p-3">
                    <h4 className="font-bold text-sm mb-2">{t('Whiteboard')}</h4>
                    <div className="flex gap-1 mb-2">
                      <input type="color" value={penColor} onChange={e => setPenColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                      <select value={penSize} onChange={e => setPenSize(Number(e.target.value))} className="text-xs border rounded px-1">
                        {[1,2,3,5,8].map(s => <option key={s} value={s}>{s}px</option>)}
                      </select>
                      <button onClick={clearWhiteboard} className="text-xs btn-ghost">{t('Clear')}</button>
                      <button onClick={saveWhiteboard} className="text-xs btn-primary">{t('Save')}</button>
                    </div>
                    <canvas ref={canvasRef} width={400} height={300}
                      className="border rounded w-full bg-white cursor-crosshair"
                      onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                    />
                  </div>
                )}
                {showChat && (
                  <div className="w-1/3 border-l">
                    <WebRTCPrivateChat roomId={inCall} onClose={() => setShowChat(false)} />
                  </div>
                )}
                {showMaterials && (
                  <div className="w-1/3 border-l p-3 overflow-y-auto max-h-[60vh]">
                    <h4 className="font-bold text-sm mb-3">{t('Session Materials')}</h4>
                    {sessions.find(s => s.id === inCall)?.materials?.map(m => (
                      <div key={m.id} className="bg-gray-50 p-2 rounded-lg mb-2">
                        <p className="text-sm font-semibold">{m.title}</p>
                        {m.description && <p className="text-xs text-gray-500">{m.description}</p>}
                        {m.file_url && <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1"><Download size={12} /> {t('Download')}</a>}
                      </div>
                    ))}
                    {user?.is_teacher && (
                      <div className="border-t pt-3 mt-3 space-y-2">
                        <input className="input-field text-sm" placeholder={t('Material title')} value={materialTitle} onChange={e => setMaterialTitle(e.target.value)} />
                        <input className="input-field text-sm" placeholder={t('Description')} value={materialDesc} onChange={e => setMaterialDesc(e.target.value)} />
                        <input type="file" className="text-sm" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                        <button onClick={() => uploadMaterial(inCall!)} className="btn-primary text-sm w-full">{t('Upload')}</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowTutors(!showTutors); fetchTutors(); }} className="btn-ghost text-sm flex items-center gap-1">
            <Users size={16} /> {t('Find Tutors')}
          </button>
          <button onClick={() => setShowCertificates(!showCertificates)} className="btn-ghost text-sm flex items-center gap-1">
            <Award size={16} /> {t('Certificates')}
          </button>
          {user?.is_teacher && (
            <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-primary flex items-center gap-2">
              <ClipboardList size={16} /> {showCreateForm ? t('Cancel') : t('Create Session')}
            </button>
          )}
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
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {[
            { key: 'upcoming' as const, label: t('Upcoming'), icon: <Calendar size={14} /> },
            { key: 'ongoing' as const, label: t('Live'), icon: <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> },
            { key: 'completed' as const, label: t('Completed'), icon: <CheckCircle size={14} /> },
            { key: 'mine' as const, label: t('My Sessions'), icon: <BookOpen size={14} /> },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
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
              }`}>
              <div className="p-5 cursor-pointer" onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}>
                <div className="flex flex-col md:flex-row justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        {session.tutor.username[0]?.toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          {session.subject}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[session.status]}`}>
                            {session.status}
                          </span>
                          {session.is_group_class && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Users size={10} /> {t('Group')}
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(session.scheduled_at)}</span>
                          <span className="flex items-center gap-1"><Clock size={12} /> {session.duration_minutes}min</span>
                          <span className="flex items-center gap-1 text-green-600 font-bold"><DollarSign size={12} />${session.price}</span>
                          <span>{t('Tutor')}: @{session.tutor.username}</span>
                          {session.student && <span>{t('Student')}: @{session.student.username}</span>}
                        </p>
                      </div>
                    </div>
                    {session.description && <p className="text-sm text-gray-600 line-clamp-2 mt-1">{session.description}</p>}
                    {session.students_enrolled !== undefined && (
                      <p className="text-xs text-purple-600 mt-1">{session.students_enrolled}/{session.max_students} students enrolled</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); startVideoCall(session.id); }}
                      className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-blue-600 flex items-center gap-1">
                      <Play size={14} /> {t('Join Class')}
                    </button>
                    {user?.is_teacher && session.tutor.username === user.username && session.status === 'scheduled' && (
                      <button onClick={(e) => { e.stopPropagation(); confirmSession(session.id); }}
                        className="bg-green-500 text-white px-3 py-2 rounded-full text-sm hover:bg-green-600">
                        {t('Confirm')}
                      </button>
                    )}
                    {user?.is_teacher && session.tutor.username === user.username && session.status === 'ongoing' && (
                      <button onClick={(e) => { e.stopPropagation(); completeSession(session.id); }}
                        className="text-green-600 hover:underline text-sm font-semibold">
                        {t('Complete')} →
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setExpandedSession(expandedSession === session.id ? null : session.id); }}
                      className="p-2 rounded-full hover:bg-gray-100">
                      {expandedSession === session.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {session.status !== 'cancelled' && session.status !== 'completed' && (
  <button onClick={() => cancelSession(session.id)} className="text-red-500 text-xs hover:underline">
    {t('cancel_session')}
  </button>
)}
                  </div>
                </div>
              </div>

              {/* Expanded Materials */}
              <AnimatePresence>
                {expandedSession === session.id && session.materials && session.materials.length > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t">
                    <div className="p-4 bg-gray-50/50">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-1"><FileText size={14} /> {t('Session Materials')}</h4>
                      <div className="space-y-2">
                        {session.materials.map(m => (
                          <div key={m.id} className="bg-white p-3 rounded-xl flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-sm">{m.title}</p>
                              {m.description && <p className="text-xs text-gray-500">{m.description}</p>}
                            </div>
                            {m.file_url && (
                              <a href={m.file_url} target="_blank" rel="noopener noreferrer"
                                className="text-blue-500 hover:underline text-sm flex items-center gap-1">
                                <Download size={14} /> {t('Download')}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}