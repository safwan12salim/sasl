/**
 * Sasl - Social Asynchronous Sharing Layer
 * Complete Feed component with posts, likes, comments, polls, GIFs, ads, offline sync.
 * No WebSocket – fully stable. Infinite scroll fixed.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Heart, MessageCircle, Share2, Image, Smile, BarChart2,
  Loader2, ChevronDown, ChevronUp, X, Wifi
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useMesh } from '../hooks/useMesh';
import toast from 'react-hot-toast';
import GifPicker from './GifPicker';
import CommentThread from './CommentThread';
import AdBanner from './AdBanner';
import StoryRecorder from './StoryRecorder';
import { db } from '../services/offlineDB';
import NativeAd from './NativeAd';
import { saslBrain } from '../services/saslBrain';
import EmojiPicker from 'emoji-picker-react';
import { contentModerator } from '../services/contentModeration';
import { getMeshNode } from './OfflineMeshStatus';

// ---------- TYPES ----------
interface Post {
  id: string;
  author: { username: string; avatar_url?: string };
  text: string;
  media_url: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  liked_by_me: boolean;
  created_at: string;
  poll?: {
    id: string;
    question: string;
    options: { id: string; text: string; votes_count: number; voted_by_me: boolean }[];
  };
}

interface Story {
  id: string;
  user: { username: string; avatar_url?: string };
  media_url: string;
}

interface SuggestedUser {
  id: string;
  username: string;
  avatar_url?: string;
}

interface OfflinePost {
  text: string;
  timestamp: number;
}

const MAX_OFFLINE_POSTS = 100;

const Feed: React.FC = () => {
  const { user } = useAuth();
  const { isOnline, syncOfflinePosts } = useMesh();
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const loader = useRef<HTMLDivElement | null>(null);
  const [composing, setComposing] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [composingWithPoll, setComposingWithPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<OfflinePost[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [showStoryRecorder, setShowStoryRecorder] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const isFetching = useRef(false);

  // ============================================================
  // FETCH POSTS - Fixed to prevent infinite loops
  // ============================================================
  const fetchPosts = useCallback(async (pageNum: number, append = false) => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    
    try {
      if (!isOnline) {
        const offlinePosts = await db.posts.orderBy('created_at').reverse().toArray();
        const mapped: Post[] = offlinePosts.map(p => ({
          id: p.id,
          author: { username: p.author },
          text: p.text,
          media_url: p.media_url || null,
          likes_count: p.likes_count,
          comments_count: p.comments_count,
          shares_count: p.shares_count,
          liked_by_me: false,
          created_at: p.created_at,
          poll: undefined,
        }));

        setPosts(mapped);
        setHasMore(false);
        return;
      }

      const res = await api.get(`/content/posts/?page=${pageNum}`);
      const data = res.data;
      const results = Array.isArray(data?.results) ? data.results : [];
      
      // Rank posts with Sasl Brain
      let sortedResults = results;
      try {
        const ranked = await saslBrain.rankPosts(results);
        sortedResults = ranked
          .map((score: { postId: string }) => results.find((p: any) => p.id === score.postId))
          .filter(Boolean);
      } catch {
        sortedResults = results;
      }

      // Update state - prevent duplicates when appending
      setPosts(prev => {
        if (!append) return sortedResults;
        const existingIds = new Set(prev.map(p => p.id));
        const newPosts = sortedResults.filter((p: Post) => !existingIds.has(p.id));
        return [...prev, ...newPosts];
      });

      // Cache offline
      for (const p of results) {
        await db.posts.put({
          id: p.id,
          text: p.text,
          author: p.author?.username,
          media_url: p.media_url,
          likes_count: p.likes_count,
          comments_count: p.comments_count,
          shares_count: p.shares_count,
          created_at: p.created_at,
        });
      }

      // Check if more pages exist
            // Check if more pages exist — FIXED
      const nextPage = data?.next;
      const currentPageSize = results.length;
      setHasMore(!!nextPage && currentPageSize > 0);
    } catch (err) {
      if (!append && initialLoad) {
         console.warn('Feed fetch failed:', err);
      }
    } finally {
      setLoading(false);
      setInitialLoad(false);
      isFetching.current = false;
    }
  }, [isOnline, initialLoad]);

  // ============================================================
  // INITIAL LOAD
  // ============================================================
  

     useEffect(() => {
  // Ensure token is available before fetching
  const token = localStorage.getItem('sasl_token');
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  
  // Small delay to ensure everything is ready
  const timer = setTimeout(() => {
    fetchPosts(1, false);
    loadStories();
    loadSuggestedUsers();
    loadOfflineQueue();
  }, 100);
  
  return () => clearTimeout(timer);
}, []);

  // ============================================================
  // INFINITE SCROLL OBSERVER - Fixed
  // ============================================================
  useEffect(() => {
    if (!loader.current) return;
    
         const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading && !isFetching.current) {
        setPage(prev => {
          const nextPage = prev + 1;
          // Safety cap — stop after 50 pages
          if (nextPage > 50) {
            setHasMore(false);
            return prev;
          }
          fetchPosts(nextPage, true);
          return nextPage;
        });
      }
    }, { rootMargin: '200px' });
    
    observer.observe(loader.current);
    return () => observer.disconnect();
  }, [hasMore, loading, fetchPosts]);

  // ============================================================
  // HELPERS
  // ============================================================
  const loadStories = async () => {
    try { const res = await api.get('/content/stories/'); setStories(res.data.results || []); } catch {}
  };
  
  const loadSuggestedUsers = async () => {
    try { const res = await api.get('/users/suggested/'); setSuggestedUsers(res.data || []); } catch {}
  };
  
  const loadOfflineQueue = () => {
    const raw = localStorage.getItem('sasl_offline_posts');
    if (raw) setOfflineQueue(JSON.parse(raw).slice(0, MAX_OFFLINE_POSTS));
  };

  // ============================================================
  // LIKE HANDLER
  // ============================================================
  const handleLike = async (postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? {
      ...p,
      liked_by_me: !p.liked_by_me,
      likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1
    } : p));
    try {
      const res = await api.post(`/content/posts/${postId}/like/`);
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p,
        likes_count: res.data.likes_count,
        liked_by_me: res.data.status === 'liked'
      } : p));
      if (navigator.vibrate) navigator.vibrate(10);
    } catch {
      fetchPosts(1, false);
    }
  };

  // ============================================================
  // POLL VOTE HANDLER
  // ============================================================
  const handleVote = async (postId: string, optionId: string) => {
    try {
      const res = await api.post(`/content/posts/${postId}/vote_poll/`, { option_id: optionId });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, poll: res.data } : p));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Vote failed');
    }
  };

  // ============================================================
  // SHARE HANDLER
  // ============================================================
  const handleShare = async (postId: string) => {
    try {
      const res = await api.post(`/content/posts/${postId}/share/`);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, shares_count: res.data.shares_count } : p));
      
      const post = posts.find(p => p.id === postId);
      if (post && navigator.share) {
        await navigator.share({
          title: `Post by ${post.author.username}`,
          text: post.text,
          url: `${window.location.origin}/post/${postId}`,
        });
        toast.success('Shared!');
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
        toast.success('Link copied to clipboard!');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error('Could not share');
      }
    }
  };

  // ============================================================
  // COMPOSER HELPERS
  // ============================================================
  const resetComposer = () => {
    setComposing('');
    setSelectedFile(null);
    setFilePreview(null);
    setUploadProgress(0);
    setComposingWithPoll(false);
    setPollOptions(['', '']);
    setShowGifPicker(false);
    setShowEmojiPicker(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  // ============================================================
  // SUBMIT POST
  // ============================================================
  const submitPost = async () => {
    if (!composing.trim() && !selectedFile) return;
    
    if (!isOnline) {
      createOfflinePost();
      return;
    }

    const moderation = await contentModerator.moderateText(composing);
    if (moderation.isSpam || moderation.isHateful) {
      toast.error(`Content flagged: ${moderation.reason}. Please revise.`);
      return;
    }

    const formData = new FormData();
    formData.append('text', composing);
    if (selectedFile) formData.append('media', selectedFile);
    if (composingWithPoll) {
      const validOptions = pollOptions.filter(opt => opt.trim());
      formData.append('poll', JSON.stringify({
        question: composing,
        options: validOptions,
        expires_in_days: 1
      }));
    }

    try {
      const res = await api.post('/content/posts/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      } as any);
      setPosts(prev => [res.data, ...prev]);
      resetComposer();
      toast.success('Posted!');
    } catch {
      toast.error('Failed to post');
      setUploadProgress(0);
    }
  };

  // ============================================================
  // OFFLINE POST
  // ============================================================
  const createOfflinePost = () => {
    const newPost: OfflinePost = { text: composing, timestamp: Date.now() };
    const updatedQueue = [...offlineQueue, newPost].slice(0, MAX_OFFLINE_POSTS);
    setOfflineQueue(updatedQueue);
    
    const mesh = getMeshNode();
    if (mesh) {
      mesh.sendPostViaMesh({
        text: composing,
        author: user?.username,
        timestamp: Date.now(),
      });
      toast.success('Posted via WaveMesh! 📡');
    } else {
      toast.success('Queued – will sync when online');
    }
    
    localStorage.setItem('sasl_offline_posts', JSON.stringify(updatedQueue));
    
    const fakePost: Post = {
      id: `offline-${Date.now()}`,
      author: { username: user?.username || 'You' },
      text: composing,
      media_url: filePreview,
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      liked_by_me: false,
      created_at: new Date().toISOString(),
    };
    setPosts(prev => [fakePost, ...prev]);
    resetComposer();
  };

  // ============================================================
  // SYNC OFFLINE QUEUE
  // ============================================================
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncOfflineQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const syncOfflineQueue = async () => {
    setSyncing(true);
    try {
      await api.post('/content/posts/sync_offline_posts/', { posts: offlineQueue });
      setOfflineQueue([]);
      localStorage.removeItem('sasl_offline_posts');
      toast.success('Offline posts synced!');
      await fetchPosts(1, false);
    } catch {
      toast.error('Sync failed, will retry');
    } finally {
      setSyncing(false);
    }
  };

  const handleGifSelect = (url: string) => {
    setComposing(prev => prev + ' ' + url);
    setShowGifPicker(false);
  };

  // ============================================================
  // SUB-COMPONENTS
  // ============================================================
  const StoryRing = () => (
    <div className="flex gap-3 overflow-x-auto py-2 mb-4">
      <div className="flex flex-col items-center cursor-pointer" onClick={() => setShowStoryRecorder(true)}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-400 to-orange-400 p-[3px]">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-2xl">+</div>
        </div>
        <span className="text-xs mt-1">Your Story</span>
      </div>
      {stories.slice(0, 10).map(s => (
        <div key={s.id} className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-yellow-500 p-[3px]">
            <img src={s.media_url || '/avatar.png'} className="w-full h-full rounded-full object-cover" alt="" />
          </div>
          <span className="text-xs mt-1">{s.user.username}</span>
        </div>
      ))}
    </div>
  );

  const SuggestedBar = () => (
    <div className="flex gap-2 overflow-x-auto py-2 mb-4">
      {suggestedUsers.map(u => (
        <div key={u.id} className="flex items-center gap-1 bg-white rounded-full px-3 py-1 shadow-sm text-sm">
          <div className="w-6 h-6 rounded-full bg-gray-300" />
          <span>{u.username}</span>
          <button className="text-green-500 ml-1 text-xs">Follow</button>
        </div>
      ))}
    </div>
  );

  const PollSection = ({ poll, postId }: { poll: Post['poll']; postId: string }) => {
    if (!poll) return null;
    const alreadyVoted = poll.options.some(o => o.voted_by_me);
    return (
      <div className="mt-2 space-y-2">
        {poll.options.map(opt => (
          <div key={opt.id} className="flex items-center justify-between">
            <button
              onClick={() => handleVote(postId, opt.id)}
              disabled={alreadyVoted}
              className="text-left text-sm hover:bg-gray-100 p-1 rounded w-full flex items-center gap-2"
            >
              <span className={`w-4 h-4 rounded-full border-2 ${opt.voted_by_me ? 'bg-green-500' : 'border-gray-400'}`} />
              {opt.text}
              <span className="ml-auto text-xs text-gray-500">({opt.votes_count})</span>
            </button>
          </div>
        ))}
      </div>
    );
  };

  const PostCard = ({ post }: { post: Post }) => {
    const [showComments, setShowComments] = useState(false);
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card mb-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sasl-green to-sasl-orange flex items-center justify-center text-white font-bold">
            {post.author.username[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{post.author.username}</p>
            <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <p className="mb-3">{post.text}</p>
        {post.media_url && (
          <img
            src={post.media_url}
            className="rounded-xl mb-3 max-h-80 w-full object-cover"
            alt="post"
            loading="lazy"
          />
        )}
        {post.poll && <PollSection poll={post.poll} postId={post.id} />}
        <div className="flex justify-between text-gray-500 mb-2">
          <button onClick={() => handleLike(post.id)} className="flex items-center gap-1 hover:text-red-500">
            <Heart className={`w-5 h-5 ${post.liked_by_me ? 'fill-red-500 text-red-500' : ''} like-burst`} />
            {post.likes_count}
          </button>
          <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1 hover:text-blue-500">
            <MessageCircle className="w-5 h-5" /> {post.comments_count}
            {showComments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={() => handleShare(post.id)} className="flex items-center gap-1 hover:text-green-500">
            <Share2 className="w-5 h-5" /> {post.shares_count}
          </button>
        </div>
        <AnimatePresence>
          {showComments && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}>
              <CommentThread postId={post.id} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-2xl font-bold gradient-text">Sasl Feed</h1>
        <div className="flex items-center gap-2">
          {!isOnline && <span className="mesh-badge mesh-offline text-xs">Offline</span>}
          {offlineQueue.length > 0 && (
            <button onClick={syncOfflineQueue} disabled={syncing} className="flex items-center gap-1 btn-ghost text-xs">
              {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
              Sync ({offlineQueue.length})
            </button>
          )}
        </div>
      </div>
      
      {showStoryRecorder && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center">
          <div className="bg-white p-4 rounded-2xl w-full max-w-md">
            <button onClick={() => setShowStoryRecorder(false)} className="float-right text-gray-500 hover:text-gray-700">✕</button>
            <StoryRecorder onDone={() => setShowStoryRecorder(false)} />
          </div>
        </div>
      )}
      
      <SuggestedBar />
      <StoryRing />
      <AdBanner />
      
      {/* Composer */}
      <div className="bg-white rounded-2xl shadow p-4 mb-6">
        <textarea
          className="w-full border-none outline-none resize-none text-lg placeholder-gray-400"
          placeholder="What's happening? (Works offline!)"
          value={composing}
          onChange={e => setComposing(e.target.value)}
          rows={3}
        />
        {filePreview && (
          <div className="relative mt-2">
            <img src={filePreview} className="rounded-lg max-h-48" alt="preview" />
            <button onClick={() => { setSelectedFile(null); setFilePreview(null); setUploadProgress(0); }} className="absolute top-1 right-1 bg-white rounded-full p-1"><X size={16} /></button>
          </div>
        )}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
        )}
        {composingWithPoll && (
          <div className="mt-2 space-y-2">
            {pollOptions.map((opt, idx) => (
              <input key={idx} className="input-field" placeholder={`Option ${idx+1}`} value={opt}
                onChange={e => { const n = [...pollOptions]; n[idx] = e.target.value; setPollOptions(n); }} />
            ))}
          </div>
        )}
        {showGifPicker && <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />}
        
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-3 text-gray-500">
            <label className="cursor-pointer hover:text-green-500"><Image size={20} /><input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} /></label>
            <button onClick={() => setComposingWithPoll(!composingWithPoll)} className="hover:text-purple-500"><BarChart2 size={20} /></button>
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="hover:text-yellow-500 relative">
              <Smile size={20} />
            </button>
          </div>
          <button onClick={submitPost} disabled={!composing.trim() && !selectedFile} className="btn-primary text-sm py-2 px-6">
            Post
          </button>
        </div>
        
        {showEmojiPicker && (
          <div className="mt-2">
            <EmojiPicker 
              onEmojiClick={(emojiData) => {
                setComposing(prev => prev + emojiData.emoji);
                setShowEmojiPicker(false);
              }}
              width="100%"
              height={350}
            />
          </div>
        )}
      </div>

      {/* Posts */}
      {posts.map((post, idx) => (
        <React.Fragment key={post.id}>
          <PostCard post={post} />
          {(idx + 1) % 5 === 0 && <NativeAd />}
        </React.Fragment>
      ))}

      {/* Infinite scroll loader */}
      <div ref={loader} className="h-10 flex justify-center items-center">
        {loading && <Loader2 className="animate-spin text-green-500" />}
        {!hasMore && !loading && posts.length > 0 && (
          <p className="text-gray-400 text-sm">You're all caught up! 🎉</p>
        )}
        {!hasMore && !loading && posts.length === 0 && !initialLoad && (
          <p className="text-gray-400">No posts yet. Be the first to share something!</p>
        )}
      </div>
    </div>
  );
};

export default Feed;