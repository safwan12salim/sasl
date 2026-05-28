/**
 * Sasl - Social Asynchronous Sharing Layer
 * Reels — TikTok-style short video feed with likes, comments, upload
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Heart, MessageCircle, Share2, Loader2, Video, Plus } from 'lucide-react';
import { db } from '../services/offlineDB';
import { useTranslation } from 'react-i18next';

interface Reel {
  id: string;
  user: { username: string; avatar_url?: string };
  video_url: string;
  caption: string;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
}

export default function Reels() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [reelFile, setReelFile] = useState<File | null>(null);
  const [reelCaption, setReelCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reelComments, setReelComments] = useState<Record<string, any[]>>({});
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});

  const fetchReels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/content/reels/');
      const raw = res.data.results || res.data || [];

      let videoReels: any[] = raw
        .filter((r: any) => r.video_url)
        .map((r: any) => ({
          id: r.id,
          user: r.user || { username: 'unknown' },
          video_url: r.video_url,
          caption: r.caption || '',
          likes_count: r.likes_count || 0,
          comments_count: r.comments_count || 0,
          liked_by_me: r.liked_by_me || false,
        }));

      if (videoReels.length === 0) {
        videoReels.push({
          id: t('demo-reel'),
          user: { username: t('sasl_demo') },
          video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
          caption: t('Welcome to Sasl Reels! 🌍✨'),
          likes_count: 120,
          comments_count: 15,
          liked_by_me: false,
        });
      }

      setReels(videoReels);
    } catch (err) {
      setError(t('Could not load reels. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReels(); }, [fetchReels]);

  const handleLike = async (reelId: string) => {
    if (reelId === 'demo-reel') return;
    
    const reel = reels.find(r => r.id === reelId);
    if (!reel) return;
    
    const newLiked = !reel.liked_by_me;
    const newCount = newLiked ? reel.likes_count + 1 : reel.likes_count - 1;
    
    setReels(prev => prev.map(r => r.id === reelId ? {
      ...r,
      liked_by_me: newLiked,
      likes_count: Math.max(0, newCount)
    } : r));
    
    try {
      const res = await api.post(`/content/reels/${reelId}/like/`);
      if (res.data && typeof res.data.likes_count === 'number') {
        setReels(prev => prev.map(r => r.id === reelId ? {
          ...r,
          likes_count: res.data.likes_count,
          liked_by_me: res.data.status === 'liked'
        } : r));
      }
      if (navigator.vibrate) navigator.vibrate(10);
    } catch {
      setReels(prev => prev.map(r => r.id === reelId ? {
        ...r,
        liked_by_me: reel.liked_by_me,
        likes_count: reel.likes_count
      } : r));
    }
  };

  const handleShare = async (reelId: string) => {
    const reel = reels.find(r => r.id === reelId);
    if (!reel) return;
    
    const shareData = {
      title: 'Check out this reel on Sasl!',
      text: reel.caption || 'Amazing reel on Sasl',
      url: `${window.location.origin}/reels`,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success('Shared!');
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied!');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied!');
      } catch {
        toast.error('Could not share');
      }
    }
  };

  const handleComment = async (reelId: string) => {
    const text = commentTexts[reelId] || '';
    if (!text.trim()) return;
    try {
      await api.post(`/content/reels/${reelId}/comment/`, { text });
      setReels(prev => prev.map(r => r.id === reelId ? {
        ...r, comments_count: r.comments_count + 1
      } : r));
      setCommentTexts(prev => ({ ...prev, [reelId]: '' }));
      toast.success('Comment added! 💬');
      fetchReelComments(reelId);
    } catch {
      toast.error('Comment failed');
    }
  };
  const fetchReelComments = async (reelId: string) => {
    try {
      const res = await api.get(`/content/reels/${reelId}/comments/`);
      setReelComments(prev => ({ ...prev, [reelId]: res.data || [] }));
    } catch {}
  };

  const uploadReel = async () => {
    if (!reelFile) return toast.error(t('Select a video'));
    setUploading(true);
    const formData = new FormData();
    formData.append('video', reelFile);
    formData.append('caption', reelCaption);

    try {
      await api.post('/content/reels/', formData);
      toast.success(t('Reel uploaded! 🎬'));
      setShowUpload(false);
      setReelFile(null);
      setReelCaption('');
      fetchReels();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const scrollTo = (index: number) => {
    const nextIndex = index % reels.length;
    setActiveIndex(nextIndex);
    videoRefs.current.forEach((v, i) => {
      if (v) i === nextIndex ? v.play() : v.pause();
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-black">
        <Loader2 className="animate-spin text-white" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-black text-white">
        <div className="text-center">
          <p className="mb-4">{error}</p>
          <button onClick={fetchReels} className="btn-primary"> {t('Retry')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-scroll snap-y snap-mandatory bg-black relative">
      {/* Upload Button */}
      <button
        onClick={() => setShowUpload(true)}
        className="fixed bottom-24 right-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-full shadow-xl z-40 hover:scale-110 transition"
      >
        <Plus size={24} />
      </button>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Video size={20} /> {t('Upload Reel')}</h3>
            <input
              type="file"
              accept="video/*"
              onChange={e => setReelFile(e.target.files?.[0] || null)}
              className="mb-3 w-full text-sm"
            />
            <input
              className="input-field mb-3"
              placeholder={t('Write a caption...')}
              value={reelCaption}
              onChange={e => setReelCaption(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={uploadReel} disabled={uploading || !reelFile} className="btn-primary flex-1">
                {uploading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Upload'}
              </button>
              <button onClick={() => setShowUpload(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reels */}
      {reels.length === 0 ? (
        <div className="flex justify-center items-center h-full text-white">
          <p>{t('No reels yet. Be the first to create one!')}</p>
        </div>
      ) : (
        reels.map((reel, idx) => (
          <div key={reel.id} className="relative h-screen snap-start">
            <video
              ref={el => { videoRefs.current[idx] = el; }}
              src={reel.video_url}
              className="absolute inset-0 w-full h-full object-cover"
              loop
              muted
              autoPlay={idx === 0}
              playsInline
              onEnded={() => scrollTo(idx + 1)}
            />
            {/* Gradient Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
              {/* User Info */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg border-2 border-white">
                  {reel.user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-bold text-white">@{reel.user?.username || 'user'}</p>
                  <p className="text-white/80 text-sm">{reel.caption}</p>
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-6">
                <button onClick={() => handleLike(reel.id)} className="flex flex-col items-center gap-1 text-white hover:text-red-400 transition">
                  <Heart size={28} className={reel.liked_by_me ? 'fill-red-500 text-red-500' : 'text-white'} />
                  <span className="text-xs">{reel.likes_count}</span>
                </button>
                <button onClick={() => {
                  if (showComments === reel.id) {
                    setShowComments(null);
                  } else {
                    setShowComments(reel.id);
                    fetchReelComments(reel.id);
                  }
                }} className="flex flex-col items-center gap-1 text-white hover:text-blue-400 transition">
                  <MessageCircle size={28} />
                  <span className="text-xs">{reel.comments_count}</span>
                </button>
                <button onClick={() => handleShare(reel.id)} className="flex flex-col items-center gap-1 text-white hover:text-green-400 transition">
                  <Share2 size={28} />
                  <span className="text-xs">{t('Share')}</span>
                </button>
              </div>

              {/* Comments Panel */}
              {showComments === reel.id && (
                <div className="mt-3 max-h-48 overflow-y-auto bg-black/60 rounded-xl p-3">
                  {(reelComments[reel.id] || []).map((c: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {c.user?.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <span className="text-white text-xs font-semibold">{c.user?.username || 'user'}</span>
                        <span className="text-white/70 text-xs ml-2">{c.text}</span>
                      </div>
                    </div>
                  ))}
                  {(reelComments[reel.id] || []).length === 0 && (
                    <p className="text-white/50 text-xs text-center py-2">No comments yet</p>
                  )}
                  
                  {/* Comment input */}
                  <div className="flex gap-2 mt-2 pt-2 border-t border-white/10">
                    <input
                      value={commentTexts[reel.id] || ''}
  onChange={e => setCommentTexts(prev => ({ ...prev, [reel.id]: e.target.value }))}
  placeholder="Add a comment..."  
                      className="flex-1 bg-white/20 text-white px-3 py-2 rounded-full text-xs border border-white/20 outline-none"
                      onKeyDown={e => e.key === 'Enter' && handleComment(reel.id)}
                    />
                    <button onClick={() => handleComment(reel.id)}
                      className="bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold">
                      Post
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}