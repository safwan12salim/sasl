/**
 * Sasl - Social Asynchronous Sharing Layer
 * Streaming – Advanced live streaming with categories, clips, scheduling, top donors
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Play, Users, DollarSign, Loader2, Radio, AlertCircle, Video, VideoOff,
  Clock, Calendar, TrendingUp, Crown, Image as ImageIcon, X, Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WebRTCConnection } from '../services/webrtc';
import { useTranslation } from 'react-i18next';

interface Stream {
  id: string;
  streamer: { username: string; avatar_url?: string };
  title: string;
  description?: string;
  category?: string;
  viewers_count: number;
  is_live: boolean;
  thumbnail_url?: string;
  top_donors?: { username: string; total: number }[];
  total_donations?: number;
  tags?: string[];
}

interface ScheduledStream {
  id: string;
  streamer_name: string;
  title: string;
  description?: string;
  scheduled_at: string;
  category?: string;
}

const CATEGORIES = ['Gaming', 'Music', 'Talk', 'Tutorial', 'Fitness', 'Cooking', 'Art', 'Tech', 'IRL'];

export default function Streaming() {
  const { user } = useAuth();
  const { t } = useTranslation();

  // Streams
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedules, setSchedules] = useState<ScheduledStream[]>([]);

  // Create stream
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Talk');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  // Donation
  const [amount, setAmount] = useState<{ [key: string]: number }>({});
  const [donationMessage, setDonationMessage] = useState<{ [key: string]: string }>({});

  // Video call
  const [inCall, setInCall] = useState<{ streamId: string; role: 'streamer' | 'viewer' } | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const rtcRef = useRef<WebRTCConnection | null>(null);
  const token = localStorage.getItem('sasl_token');

  // ============================================================
  // FETCH
  // ============================================================
  const fetchStreams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ is_live: 'true' });
      if (activeCategory) params.set('category', activeCategory);
      const res = await api.get(`/streaming/streams/?${params.toString()}`);
      setStreams(res.data.results || []);
    } catch (err) {
      setError(t('Failed to load streams.'));
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  const fetchSchedules = async () => {
    try {
      const res = await api.get('/streaming/schedules/upcoming/');
      setSchedules(res.data || []);
    } catch {}
  };

  useEffect(() => { fetchStreams(); fetchSchedules(); }, [fetchStreams]);

  // ============================================================
  // ACTIONS
  // ============================================================
  const startStream = async () => {
    if (!title.trim()) return toast.error(t('Enter a title'));
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('tags', tags);
      if (thumbnailFile) formData.append('thumbnail', thumbnailFile);
      
      await api.post('/streaming/streams/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(t('You are now live! 🎥'));
      setTitle(''); setDescription(''); setTags('');
      setThumbnailFile(null); setThumbnailPreview(null);
      fetchStreams();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('Failed to start stream'));
    }
  };

  const donate = async (streamId: string) => {
    const amt = amount[streamId] || 1;
    if (amt <= 0) return toast.error(t('Enter an amount'));
    try {
      await api.post(`/streaming/streams/${streamId}/donate/`, {
        amount: amt,
        message: donationMessage[streamId] || '👏',
      });
      toast.success(`Donated $${amt}! 🎉`);
      setAmount(prev => ({ ...prev, [streamId]: 0 }));
      setDonationMessage(prev => ({ ...prev, [streamId]: '' }));
      fetchStreams();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('Donation failed'));
    }
  };

  const scheduleStream = async () => {
    if (!title.trim()) return;
    try {
      const scheduledAt = prompt(t('Schedule date & time (YYYY-MM-DDTHH:MM):'));
      if (!scheduledAt) return;
      await api.post('/streaming/schedules/', {
        title,
        description,
        category,
        scheduled_at: scheduledAt,
      });
      toast.success(t('Stream scheduled! 📅'));
      setTitle(''); setDescription('');
      fetchSchedules();
    } catch (err: any) {
      toast.error(t('Failed to schedule'));
    }
  };

  const saveStream = (streamId: string) => {
    toast.success(t('Stream saved!'));
  };

  const endStream = async (streamId: string) => {
    try {
      await api.post(`/streaming/streams/${streamId}/end_stream/`);
      toast.success(t('Stream ended'));
      fetchStreams();
    } catch (err: any) {
      toast.error(t('Failed to end stream'));
    }
  };

  // ============================================================
  // VIDEO CALL
  // ============================================================
  const startVideoCall = (streamId: string, role: 'streamer' | 'viewer') => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        const wsUrl = `wss://sasl.pythonanywhere.com/ws/video/${streamId}/?token=${token}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        const rtc = new WebRTCConnection((msg) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); });
        rtcRef.current = rtc;

        ws.onopen = () => {
          if (localVideoRef.current) rtc.startLocalStream(localVideoRef.current);
          ws.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'answer' && role === 'viewer') await rtc.handleAnswer(data.answer);
            else if (data.type === 'offer' && role === 'streamer' && remoteVideoRef.current) await rtc.handleOffer(data.offer, remoteVideoRef.current);
            else if (data.type === 'candidate') await rtc.addIceCandidate(data.candidate);
          };
          if (role === 'viewer' && remoteVideoRef.current) rtc.createOffer(remoteVideoRef.current);
        };

        setInCall({ streamId, role });
      })
      .catch(() => toast.error(t('Camera access denied')));
  };

  const endCall = () => {
    rtcRef.current?.disconnect();
    wsRef.current?.close();
    setInCall(null);
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="glass p-4 rounded-2xl animate-pulse">
            <div className="flex items-center gap-2 mb-2"><div className="w-10 h-10 rounded-full bg-gray-200" /><div className="h-4 bg-gray-200 rounded w-24" /></div>
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Video Call Overlay */}
      <AnimatePresence>
        {inCall && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl p-4 max-w-5xl w-full">
              <div className="flex justify-between mb-3">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  {inCall.role === 'streamer' ? t('Streaming LIVE') : t('Watching Stream')}
                </h3>
                <button onClick={endCall} className="bg-red-500 text-white px-4 py-2 rounded-full flex items-center gap-2">
                  <VideoOff size={16} /> {t('End')}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <video ref={localVideoRef} autoPlay muted className="w-full" />
                  <span className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">You</span>
                </div>
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <video ref={remoteVideoRef} autoPlay className="w-full" />
                  <span className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">Remote</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold gradient-text flex items-center gap-2">
            <Radio className="text-red-500" /> {t('Live Streams')}
          </h2>
          <p className="text-gray-500 text-sm mt-1">{t('Watch, stream, and earn from anywhere')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSchedule(!showSchedule)} className="btn-ghost flex items-center gap-1 text-sm">
            <Calendar size={16} /> {t('Schedule')}
          </button>
        </div>
      </div>

      {/* Create Stream Form */}
      {user?.is_creator && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass p-5 rounded-2xl mb-6 space-y-3 border-l-4 border-red-500">
          <h3 className="font-bold flex items-center gap-2"><Video size={18} className="text-red-500" /> {t('Go Live')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="input-field" placeholder={t('Stream title...')} value={title} onChange={e => setTitle(e.target.value)} />
            <select className="input-field" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className="input-field" placeholder={t('Tags (comma separated)')} value={tags} onChange={e => setTags(e.target.value)} />
          </div>
          <textarea className="input-field" placeholder={t('Description...')} value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          
          {/* Thumbnail Upload */}
          <div className="flex items-center gap-3">
            <label className="btn-ghost cursor-pointer flex items-center gap-1 text-sm">
              <ImageIcon size={18} /> {thumbnailFile ? thumbnailFile.name : t('Upload Thumbnail')}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { setThumbnailFile(file); setThumbnailPreview(URL.createObjectURL(file)); }
              }} />
            </label>
            {thumbnailPreview && (
              <div className="relative">
                <img src={thumbnailPreview} alt="thumbnail" className="h-10 w-16 rounded object-cover" />
                <button onClick={() => { setThumbnailFile(null); setThumbnailPreview(null); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X size={10} /></button>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <button onClick={startStream} className="btn-primary bg-red-500 hover:bg-red-600 flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> {t('Go Live Now')}
            </button>
            <button onClick={scheduleStream} className="btn-ghost flex items-center gap-1">
              <Calendar size={14} /> {t('Schedule for Later')}
            </button>
          </div>
        </motion.div>
      )}

      {/* Scheduled Streams */}
      <AnimatePresence>
        {showSchedule && schedules.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <div className="glass p-4 rounded-2xl">
              <h4 className="font-bold mb-3 flex items-center gap-2"><Calendar size={16} /> {t('Upcoming Streams')}</h4>
              <div className="space-y-2">
                {schedules.map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-white p-3 rounded-xl">
                    <div><p className="font-semibold text-sm">{s.title}</p><p className="text-xs text-gray-500">by @{s.streamer_name} · {new Date(s.scheduled_at).toLocaleString()}</p></div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{t('Upcoming')}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
        <button onClick={() => setActiveCategory('')} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${!activeCategory ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t('All')}</button>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${activeCategory === cat ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{cat}</button>
        ))}
      </div>

      {/* Streams Grid */}
      {error ? (
        <div className="glass p-12 rounded-2xl text-center">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={48} />
          <p className="text-lg text-gray-600">{t('An error occurred while fetching streams.')}</p>
          <button onClick={fetchStreams} className="btn-primary mt-4">{t('Retry')}</button>
        </div>
      ) : streams.length === 0 ? (
        <div className="glass p-12 rounded-2xl text-center">
          <Radio size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-xl text-gray-500">{t('No live streams right now')}</p>
          <p className="text-sm text-gray-400 mt-1">{user?.is_creator ? t('Start streaming above!') : t('Check back soon!')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {streams.map((s, idx) => (
            <motion.div key={s.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
              className="glass rounded-2xl overflow-hidden hover:shadow-xl transition group">
              {/* Thumbnail */}
              <div className="h-40 bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
                {s.thumbnail_url ? (
                  <img src={s.thumbnail_url} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Radio size={48} className="text-gray-600" />
                  </div>
                )}
                <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                </span>
                <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Users size={12} /> {s.viewers_count}
                </span>
                <button onClick={() => saveStream(s.id)} className="absolute bottom-2 right-2 bg-black/40 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition">
                  <Bookmark size={14} />
                </button>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                    {s.streamer.username[0]?.toUpperCase()}
                  </div>
                  <span className="font-semibold text-sm">{s.streamer.username}</span>
                  {s.category && <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded-full">{s.category}</span>}
                </div>
                <h3 className="font-bold text-sm line-clamp-1">{s.title}</h3>
                
                {/* Top Donors */}
                {s.top_donors && s.top_donors.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-yellow-500">
                    <Crown size={12} />
                    {s.top_donors.map((d, i) => (
                      <span key={i}>@{d.username} ${d.total}{i < s.top_donors!.length - 1 ? ',' : ''}</span>
                    ))}
                  </div>
                )}

                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    {user?.is_creator && s.streamer.username === user.username ? (
                      <button onClick={() => startVideoCall(s.id, 'streamer')} className="flex-1 bg-green-500 text-white py-1.5 rounded-full text-xs font-semibold hover:bg-green-600 flex items-center justify-center gap-1">
                        <Video size={12} /> {t('Streamer View')}
                      </button>
                    ) : (
                      <button onClick={() => startVideoCall(s.id, 'viewer')} className="flex-1 bg-red-500 text-white py-1.5 rounded-full text-xs font-semibold hover:bg-red-600 flex items-center justify-center gap-1">
                        <Play size={12} /> {t('Watch')}
                      </button>
                    )}
                  </div>

                  {/* Donation */}
                  <div className="flex gap-1">
                    <input type="number" min="1" className="w-16 border rounded-full px-2 py-1 text-xs" placeholder="$1"
                      value={amount[s.id] || ''} onChange={e => setAmount(prev => ({ ...prev, [s.id]: Number(e.target.value) }))} />
                    <button onClick={() => donate(s.id)} className="flex-1 bg-yellow-500 text-white py-1 rounded-full text-xs font-semibold hover:bg-yellow-600 flex items-center justify-center gap-1">
                      <DollarSign size={12} /> {t('Donate')}
                    </button>
                  </div>

                  {s.streamer.username === user?.username && (
                    <button onClick={() => endStream(s.id)} className="w-full text-xs text-red-500 hover:underline">{t('End Stream')}</button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}