/**
 * Sasl - Social Asynchronous Sharing Layer
 * Snap – Enhanced with streaks, stories, AR filters, drawing, inbox
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Camera, Video, X, Loader2, Send, FlipHorizontal, Zap, Clock,
  Users, Inbox, Image as ImageIcon, PenTool, Type, Sticker,
  Play, Pause, RotateCcw, Download, Eye, EyeOff, MessageCircle,
  History, TrendingUp, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface Snap {
  id: string;
  sender_name: string;
  sender_avatar?: string;
  receiver_name?: string;
  video_url?: string;
  image_url?: string;
  caption?: string;
  viewed: boolean;
  created_at: string;
  duration?: number;
}

interface SnapStreak {
  id: string;
  other_user: string;
  current_streak: number;
  longest_streak: number;
  last_snap_date: string;
}

interface SnapStory {
  id: string;
  user: { username: string; avatar_url?: string };
  media_url: string;
  caption?: string;
  expires_at: string;
  views_count: number;
}

type SnapMode = 'camera' | 'inbox' | 'stories' | 'streaks';

export default function SnapSender() {
  const { t } = useTranslation();

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [uploading, setUploading] = useState(false);
  const [receiver, setReceiver] = useState('');
  const [caption, setCaption] = useState('');
  const [duration, setDuration] = useState(5);
  const [filter, setFilter] = useState('none');

  // Drawing
  const [drawingMode, setDrawingMode] = useState(false);
  const [penColor, setPenColor] = useState('#ffffff');
  const [penSize, setPenSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawings, setDrawings] = useState<{ x: number; y: number; color: string; size: number }[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number; color: string; size: number }[]>([]);

  // Inbox
  const [mode, setMode] = useState<SnapMode>('camera');
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [sentSnaps, setSentSnaps] = useState<Snap[]>([]);
  const [viewingSnap, setViewingSnap] = useState<Snap | null>(null);
  const [snapTimer, setSnapTimer] = useState<number>(0);

  // Streaks
  const [streaks, setStreaks] = useState<SnapStreak[]>([]);

  // Stories
  const [stories, setStories] = useState<SnapStory[]>([]);
  const [viewingStory, setViewingStory] = useState<SnapStory | null>(null);
  const [showStoryForm, setShowStoryForm] = useState(false);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState<string | null>(null);

  // Contacts
  const [recentContacts, setRecentContacts] = useState<{ id: string; username: string; avatar?: string }[]>([]);
  const [showContacts, setShowContacts] = useState(false);

  const FILTERS = [
    { name: t('none'), label: t('Normal'), style: '' },
    { name: 'grayscale', label: t('B&W'), style: 'grayscale(100%)' },
    { name: 'sepia', label: t('Sepia'), style: 'sepia(100%)' },
    { name: 'vintage', label: t('Vintage'), style: 'sepia(50%) hue-rotate(-20deg) brightness(0.9)' },
    { name: 'cool', label: t('Cool'), style: 'hue-rotate(180deg) brightness(1.1)' },
    { name: 'warm', label: t('Warm'), style: 'hue-rotate(-30deg) brightness(1.1) saturate(1.5)' },
  ];

  // ============================================================
  // CAMERA
  // ============================================================
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: mediaType ===  t('video'),
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.style.filter = FILTERS.find(f => f.name === filter)?.style || '';
      }
      setCameraActive(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') toast.error( t('Camera permission denied'));
      else toast.error(t('Camera access failed'));
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const flipCamera = () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setTimeout(startCamera, 300);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.filter = FILTERS.find(f => f.name === filter)?.style || 'none';
    ctx.drawImage(video, 0, 0);
    // Draw overlays
    drawings.forEach(stroke => {
      ctx.beginPath();
      ctx.strokeStyle = stroke[0]?.color || '#fff';
      ctx.lineWidth = stroke[0]?.size || 4;
      ctx.lineCap = 'round';
      stroke.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });
    canvas.toBlob(b => {
      if (b) { setBlob(b); setMediaType('image'); }
    }, 'image/jpeg', 0.9);
  };

  const startRecording = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    if (!stream) return;
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      const videoBlob = new Blob(chunks, { type: 'video/webm' });
      setBlob(videoBlob);
    };
    recorder.start();
    setRecording(true);
    setTimeout(() => {
      recorder.stop();
      setRecording(false);
    }, duration * 1000);
  };

  // ============================================================
  // DRAWING
  // ============================================================
  const handleCanvasDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
    setDrawingMode(true);
    const point = getCanvasPoint(e);
    setCurrentStroke([{ ...point, color: penColor, size: penSize }]);
    setIsDrawing(true);
  };

  const handleCanvasDrawMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const point = getCanvasPoint(e);
    setCurrentStroke(prev => [...prev, { ...point, color: penColor, size: penSize }]);
  };

  const handleCanvasDrawEnd = () => {
    if (currentStroke.length > 0) {
      setDrawings(prev => [...prev, currentStroke]);
    }
    setCurrentStroke([]);
    setIsDrawing(false);
  };

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const clearDrawings = () => setDrawings([]);

  // ============================================================
  // SEND SNAP
  // ============================================================
  const sendSnap = async () => {
    if (!blob || !receiver.trim()) return toast.error( t('Capture content and enter a username'));
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append(mediaType === 'video' ? 'video' : 'image', blob, `snap.${mediaType === 'video' ? 'webm' : 'jpg'}`);
      formData.append('receiver_username', receiver);
      formData.append('caption', caption);
      formData.append('duration', String(duration));

      await api.post('/snaps/snaps/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success( t('Snap sent! 📸'));
      setBlob(null); setReceiver(''); setCaption(''); setDrawings([]);
      fetchSnaps();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('Failed to send snap'));
    } finally {
      setUploading(false);
    }
  };

  // ============================================================
  // FETCH
  // ============================================================
  const fetchSnaps = async () => {
    try {
      const res = await api.get('/snaps/snaps/inbox/');
      setSnaps(res.data?.received || []);
      setSentSnaps(res.data?.sent || []);
    } catch {}
  };

  const fetchStreaks = async () => {
    try {
      const res = await api.get('/snaps/snaps/streaks/');
      setStreaks(res.data || []);
    } catch {}
  };

  const fetchStories = async () => {
    try {
      const res = await api.get('/snaps/snaps/stories/');
      setStories(res.data || []);
    } catch {}
  };

  const fetchContacts = async () => {
    try {
      const res = await api.get('/snaps/snaps/recent_contacts/');
      setRecentContacts(res.data || []);
    } catch {}
  };

  useEffect(() => { fetchSnaps(); fetchStreaks(); fetchStories(); fetchContacts(); }, []);

  // ============================================================
  // VIEW SNAP
  // ============================================================
  const viewSnap = (snap: Snap) => {
    setViewingSnap(snap);
    setSnapTimer(snap.duration || 5);
    const timer = setInterval(() => {
      setSnapTimer(prev => {
        if (prev <= 1) { clearInterval(timer); setViewingSnap(null); return 0; }
        return prev - 1;
      });
    }, 1000);
    api.post(`/snaps/snaps/${snap.id}/mark_viewed/`);
  };

  const postStory = async () => {
    if (!storyFile) return toast.error( t('Select an image or video'));
    const formData = new FormData();
    formData.append('media', storyFile);
    try {
      await api.post('/snaps/snaps/post_story/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success( t('Story posted! 📖'));
      setShowStoryForm(false); setStoryFile(null); setStoryPreview(null);
      fetchStories();
    } catch (err: any) {
      toast.error( t('Failed to post story'));
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  const modeTabs = [
    { key: 'camera' as SnapMode, icon: <Camera size={18} />, label: t('Camera') },
    { key: 'inbox' as SnapMode, icon: <Inbox size={18} />, label: `Inbox (${snaps.length})` },
    { key: 'stories' as SnapMode, icon: <Play size={18} />, label: t('Stories') },
    { key: 'streaks' as SnapMode, icon: <Zap size={18} />, label: t('Streaks') },
  ];

  return (
    <div className="max-w-md mx-auto p-4">
      {/* Header */}
      <h2 className="text-3xl font-bold gradient-text mb-4 flex items-center gap-2">
        <Camera className="text-yellow-500" /> {t('Snap')}
      </h2>

      {/* Mode Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        {modeTabs.map(tab => (
          <button key={tab.key} onClick={() => setMode(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
              mode === tab.key ? 'bg-white shadow text-yellow-600' : 'text-gray-500'
            }`}>
            {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Camera Mode */}
      {mode === 'camera' && (
        <div>
          {/* Camera View */}
          <div className="relative bg-black rounded-2xl overflow-hidden mb-4 aspect-[9/16] max-h-[60vh]">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"
              style={{ filter: FILTERS.find(f => f.name === filter)?.style, transform: facingMode === 'user' ? 'scaleX(-1)' : '' }} />
            
            {/* Drawing overlay */}
            <canvas ref={canvasRef}
              className={`absolute inset-0 w-full h-full ${drawingMode ? 'cursor-crosshair' : 'pointer-events-none'}`}
              onMouseDown={handleCanvasDrawStart} onMouseMove={handleCanvasDrawMove} onMouseUp={handleCanvasDrawEnd} onMouseLeave={handleCanvasDrawEnd}
              onTouchStart={handleCanvasDrawStart} onTouchMove={handleCanvasDrawMove} onTouchEnd={handleCanvasDrawEnd}
            />

            {/* Recording indicator */}
            {recording && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> REC
              </div>
            )}

            {/* Duration counter */}
            {recording && (
              <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm font-mono">
                {duration}s
              </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              {!cameraActive ? (
                <button onClick={startCamera} className="bg-white text-gray-800 p-4 rounded-full shadow-lg">
                  <Camera size={24} />
                </button>
              ) : (
                <>
                  <button onClick={flipCamera} className="bg-black/40 text-white p-3 rounded-full">
                    <FlipHorizontal size={20} />
                  </button>
                  <button onClick={mediaType === 'video' ? startRecording : capturePhoto}
                    className={`p-5 rounded-full border-4 border-white shadow-lg transition ${
                      recording ? 'bg-red-500 scale-110' : 'bg-white'
                    }`}>
                    {recording ? <Pause size={24} className="text-white" /> : mediaType === 'video' ? <Video size={24} /> : <Camera size={24} />}
                  </button>
                  <button onClick={() => setDrawingMode(!drawingMode)} className={`p-3 rounded-full ${drawingMode ? 'bg-yellow-500 text-white' : 'bg-black/40 text-white'}`}>
                    <PenTool size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Filter & options bar */}
            {cameraActive && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2">
                <select value={filter} onChange={e => { setFilter(e.target.value); if (videoRef.current) videoRef.current.style.filter = FILTERS.find(f => f.name === e.target.value)?.style || ''; }}
                  className="bg-black/60 text-white text-xs rounded-full px-3 py-1.5 border-none outline-none">
                  {FILTERS.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
                </select>
                <select value={duration} onChange={e => setDuration(Number(e.target.value))}
                  className="bg-black/60 text-white text-xs rounded-full px-3 py-1.5 border-none outline-none">
                  {[3,5,10,15,30].map(d => <option key={d} value={d}>{d}s</option>)}
                </select>
                <button onClick={() => { setMediaType(prev => prev === 'video' ? 'image' : 'video'); stopCamera(); setTimeout(startCamera, 300); }}
                  className="bg-black/60 text-white p-1.5 rounded-full">
                  {mediaType === 'video' ? <Camera size={16} /> : <Video size={16} />}
                </button>
              </div>
            )}

            {/* Drawing toolbar */}
            {drawingMode && (
              <div className="absolute top-16 left-4 flex flex-col gap-1">
                <input type="color" value={penColor} onChange={e => setPenColor(e.target.value)} className="w-8 h-8 rounded-full cursor-pointer" />
                {[2,4,6,8].map(s => (
                  <button key={s} onClick={() => setPenSize(s)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${penSize === s ? 'bg-white ring-2 ring-yellow-500' : 'bg-black/40 text-white'}`}>
                    <div className="rounded-full bg-white" style={{ width: s, height: s }} />
                  </button>
                ))}
                <button onClick={clearDrawings} className="bg-red-500 text-white p-1.5 rounded-full text-xs">✕</button>
              </div>
            )}
          </div>

          {/* Preview & Send */}
          {blob && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-4 rounded-2xl space-y-3">
              {mediaType === 'video' ? (
                <video src={URL.createObjectURL(blob)} controls className="w-full rounded-lg max-h-48" />
              ) : (
                <img src={URL.createObjectURL(blob)} alt="Captured" className="w-full rounded-lg max-h-48 object-cover" />
            
              )}
              
              <button 
  onClick={() => { setBlob(null); setDrawings([]); }}
  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow"
>
  <X size={14} />
</button>
              <div className="flex gap-2">
                <button onClick={() => setShowContacts(!showContacts)} className="btn-ghost text-sm flex items-center gap-1">
                  <Users size={14} /> {t('Contacts')}
                </button>
                <input value={receiver} onChange={e => setReceiver(e.target.value)}
                  placeholder={t('Username to send to')} className="input-field flex-1 text-sm" />
              </div>
              {showContacts && recentContacts.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {recentContacts.map(c => (
                    <button key={c.id} onClick={() => { setReceiver(c.username); setShowContacts(false); }}
                      className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full text-xs hover:bg-gray-200">
                      <div className="w-5 h-5 rounded-full bg-gray-300" /> {c.username}
                    </button>
                  ))}
                </div>
              )}
              <input value={caption} onChange={e => setCaption(e.target.value)}
                placeholder={t('Add a caption...')} className="input-field text-sm" />
              <button onClick={sendSnap} disabled={uploading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                {uploading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                {t('Send Snap')}
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* Inbox Mode */}
      {mode === 'inbox' && (
        <div className="space-y-3">
          <div className="flex gap-2 mb-3">
            <button className={`px-3 py-1 rounded-full text-xs font-semibold ${viewingSnap ? 'bg-gray-100' : 'bg-yellow-500 text-white'}`}>
              {t('Received')} ({snaps.length})
            </button>
            <button className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100">
              {t('Sent')} ({sentSnaps.length})
            </button>
          </div>

          {snaps.length === 0 ? (
            <div className="glass p-8 rounded-2xl text-center">
              <Inbox size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500"> {t('No new snaps')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {snaps.map(snap => (
                <motion.div key={snap.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  className={`glass p-3 rounded-xl flex items-center gap-3 cursor-pointer hover:shadow-md transition ${
                    !snap.viewed ? 'ring-2 ring-red-300 bg-red-50' : 'opacity-75'
                  }`}
                  onClick={() => viewSnap(snap)}>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-red-500 flex items-center justify-center text-white font-bold">
                    {snap.sender_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{snap.sender_name}</p>
                    <p className="text-xs text-gray-500">{snap.caption || '📸 Snap'} · {new Date(snap.created_at).toLocaleTimeString()}</p>
                  </div>
                  {!snap.viewed && <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stories Mode */}
      {mode === 'stories' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold"> {t('Stories')}</h3>
            <button onClick={() => setShowStoryForm(true)} className="btn-primary text-xs flex items-center gap-1">
              <Plus size={14} /> {t('Add Story')}
            </button>
          </div>

          {showStoryForm && (
            <div className="glass p-4 rounded-2xl mb-4 space-y-2">
              <input type="file" accept="image/*,video/*" onChange={e => {
                const file = e.target.files?.[0];
                if (file) { setStoryFile(file); setStoryPreview(URL.createObjectURL(file)); }
              }} className="text-sm" />
              {storyPreview && <img src={storyPreview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />}
              <div className="flex gap-2">
                <button onClick={postStory} className="btn-primary flex-1 text-sm">{t('Post Story')}</button>
                <button onClick={() => { setShowStoryForm(false); setStoryFile(null); setStoryPreview(null); }} className="btn-ghost text-sm">{t('Cancel')}</button>
              </div>
            </div>
          )}

          <div className="flex gap-3 overflow-x-auto pb-2">
            {stories.map(story => (
              <div key={story.id} className="flex-shrink-0 cursor-pointer" onClick={() => setViewingStory(story)}>
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-yellow-500 p-[3px]">
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-200">
                    {story.media_url ? (
                      <img src={story.media_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">📖</div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-center mt-1">{story.user.username}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Streaks Mode */}
      {mode === 'streaks' && (
        <div>
          <h3 className="font-bold mb-3 flex items-center gap-2"><Zap size={18} className="text-yellow-500" /> {t('Snap Streaks')}</h3>
          {streaks.length === 0 ? (
            <div className="glass p-8 rounded-2xl text-center">
              <Zap size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">{t('No streaks yet')}</p>
              <p className="text-sm text-gray-400">{t('Send snaps daily to build streaks!')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {streaks.map(streak => (
                <div key={streak.id} className="glass p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold">
                      {streak.other_user[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">@{streak.other_user}</p>
                      <p className="text-xs text-gray-500">{t('Last snap')}: {new Date(streak.last_snap_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-500 flex items-center gap-1">
                      <Zap size={20} className="fill-yellow-400 text-yellow-400" /> {streak.current_streak}
                    </p>
                    <p className="text-xs text-gray-400">{t('Best')}: {streak.longest_streak}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Viewing Snap Overlay */}
      <AnimatePresence>
        {viewingSnap && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            onClick={() => setViewingSnap(null)}>
            <div className="relative max-w-md w-full">
              {viewingSnap.video_url ? (
                <video src={viewingSnap.video_url} autoPlay className="w-full max-h-[80vh] object-contain" />
              ) : viewingSnap.image_url ? (
                <img src={viewingSnap.image_url} alt="" className="w-full max-h-[80vh] object-contain" />
              ) : null}
              <p className="absolute top-4 left-4 text-white font-bold">{viewingSnap.sender_name}</p>
              <p className="absolute top-4 right-4 text-white text-sm">{snapTimer}s</p>
              {viewingSnap.caption && (
                <p className="absolute bottom-20 left-4 right-4 text-white text-lg font-semibold">{viewingSnap.caption}</p>
              )}
              <button onClick={() => setViewingSnap(null)} className="absolute top-4 right-16 text-white">
                <X size={24} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Viewing Story Overlay */}
      <AnimatePresence>
        {viewingStory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            onClick={() => setViewingStory(null)}>
            <div className="relative max-w-md w-full">
              {viewingStory.media_url && (
                <img src={viewingStory.media_url} alt="" className="w-full max-h-[80vh] object-contain" />
              )}
              <p className="absolute top-4 left-4 text-white font-bold">@{viewingStory.user.username}</p>
              <p className="absolute top-4 right-4 text-white text-xs">{viewingStory.views_count}  {t('views')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}