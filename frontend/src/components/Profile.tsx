/**
 * Sasl - Premium Profile Page
 * Viral-worthy design with animated cover, stats, and content tabs
 */
import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useParams } from 'react-router-dom';
import SubscribeButton from './SubscribeButton';
import toast from 'react-hot-toast';
import {
  Camera, Heart, MessageCircle, Share2, MapPin,
  Link2, Calendar, Edit3, Check, X, Eye, EyeOff,
  TrendingUp, Award, Star, Zap, Users, DollarSign,
  BookOpen, ShoppingBag, Video, Briefcase, PlusCircle,
  Upload, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function Profile() {
  const { user: currentUser } = useAuth();
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'products' | 'gigs' | 'portfolio'>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: '', bio: '' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [pfTitle, setPfTitle] = useState('');
  const [pfDesc, setPfDesc] = useState('');
  const [pfLink, setPfLink] = useState('');
  const [pfImage, setPfImage] = useState<File | null>(null);
  const { t } = useTranslation();
  const isOwnProfile = !username || (currentUser && currentUser.username === username);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userReels, setUserReels] = useState<any[]>([]);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [userGigs, setUserGigs] = useState<any[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const url = username ? `/users/user/${username}/` : '/users/profile/';
        const res = await api.get(url);
        setProfile(res.data);
        if (isOwnProfile) {
          setEditForm({ display_name: res.data.display_name || '', bio: res.data.bio || '' });
          setAvatarPreview(res.data.avatar_url || null);
        }
      } catch (err) {
        toast.error(t('Profile not found'));
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    fetchPortfolio();
  }, [username]);

  const fetchPortfolio = async () => {
    try {
      const res = await api.get('/gigs/gigs/portfolio/');
      setPortfolio(res.data || []);
    } catch {}
  };

  const fetchUserContent = async (tab: string) => {
    const uname = profile?.username;
    if (!uname) return;
    try {
      if (tab === 'posts') {
        const res = await api.get(`/content/posts/?author=${uname}`);
        setUserPosts(res.data.results || []);
      } else if (tab === 'reels') {
        const res = await api.get(`/content/reels/?user=${uname}`);
        setUserReels(res.data.results || []);
      } else if (tab === 'products') {
        const res = await api.get(`/marketplace/products/?seller=${uname}`);
        setUserProducts(res.data.results || []);
      } else if (tab === 'gigs') {
        const res = await api.get(`/gigs/gigs/?mine=true`);
        setUserGigs(res.data.results || []);
      }
    } catch {}
  };

  const handleSave = async () => {
    const formData = new FormData();
    formData.append('display_name', editForm.display_name);
    formData.append('bio', editForm.bio);
    if (avatarFile) formData.append('avatar', avatarFile);
    try {
      await api.patch('/users/profile/', formData, { headers: {'Content-Type': 'multipart/form-data'} });
      toast.success(t('Profile updated!'));
      setIsEditing(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('Update failed'));
    }
  };

  const handleFollow = async () => {
    if (!profile) return;
    try {
      await api.post('/users/follow/toggle/', { username: profile.username });
      toast.success(t('Done!'));
      window.location.reload();
    } catch {}
  };

  const addPortfolioItem = async () => {
    if (!pfTitle.trim()) return toast.error(t('Title required'));
    const formData = new FormData();
    formData.append('title', pfTitle);
    formData.append('description', pfDesc);
    if (pfLink) formData.append('link', pfLink);
    if (pfImage) formData.append('image', pfImage);
    try {
      await api.post('/gigs/gigs/add_portfolio/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(t('Portfolio item added!'));
      setShowPortfolioForm(false);
      setPfTitle(''); setPfDesc(''); setPfLink(''); setPfImage(null);
      fetchPortfolio();
    } catch (err: any) {
      toast.error(t('Failed to add portfolio item'));
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-48 bg-gradient-to-r from-gray-200 to-gray-300" />
        <div className="max-w-4xl mx-auto px-4 -mt-16">
          <div className="w-32 h-32 rounded-full bg-gray-300 border-4 border-white" />
          <div className="mt-4 h-6 bg-gray-200 rounded w-48" />
          <div className="mt-2 h-4 bg-gray-200 rounded w-32" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-600">{t('Profile not found')}</h2>
      </div>
    );
  }

  const isFollowing = false;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{ y: [0, -20, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2 }}
          />
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="relative">
            <motion.div whileHover={{ scale: 1.05 }} className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-5xl font-bold">
                  {profile.username[0].toUpperCase()}
                </div>
              )}
            </motion.div>
            {isOwnProfile && (
              <button onClick={() => document.getElementById('avatarInput')?.click()} className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-lg hover:bg-gray-50">
                <Camera size={16} className="text-gray-600" />
              </button>
            )}
            <input id="avatarInput" type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
              }}
            />
          </div>

          <div className="flex-1 pt-4">
            <div className="flex items-start justify-between">
              <div>
                {isEditing ? (
                  <input value={editForm.display_name} onChange={e => setEditForm({ ...editForm, display_name: e.target.value })}
                    className="text-2xl font-bold bg-white border rounded-lg px-3 py-1 mb-2" placeholder="Display name" />
                ) : (
                  <h1 className="text-2xl font-bold text-gray-900">
                    {profile.display_name || profile.username}
                    {profile.is_verified && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Check size={12} className="mr-1" /> {t('Verified')}
                      </span>
                    )}
                  </h1>
                )}
                <p className="text-gray-500">@{profile.username}</p>
              </div>
              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  isEditing ? (
                    <>
                      <button onClick={handleSave} className="btn-primary text-sm py-1.5 px-4"><Check size={14} className="mr-1" /> Save</button>
                      <button onClick={() => setIsEditing(false)} className="btn-ghost text-sm py-1.5 px-4"><X size={14} className="mr-1" /> Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setIsEditing(true)} className="btn-ghost text-sm py-1.5 px-4"><Edit3 size={14} className="mr-1" /> Edit Profile</button>
                  )
                ) : (
                  <>
                    <button onClick={handleFollow} className={`btn-primary text-sm py-1.5 px-6 ${isFollowing ? 'bg-gray-400' : ''}`}>
                      {isFollowing ? t('Following') : t('Follow')}
                    </button>
                    {profile.is_creator && <SubscribeButton creatorUsername={profile.username} />}
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <textarea value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                className="mt-2 w-full bg-white border rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Tell the world about yourself..." />
            ) : (
              <p className="mt-2 text-gray-600">{profile.bio || t('No bio yet.')}</p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-green-600">{profile.followers_count || 0}</p>
                <p className="text-xs text-gray-500">{t('Followers')}</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-blue-600">{profile.following_count || 0}</p>
                <p className="text-xs text-gray-500">{t('Following')}</p>
              </div>
              {(isOwnProfile || profile.show_balance) && (
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-yellow-600">${Number(profile.wallet?.balance || 0).toFixed(0)}</p>
                  <p className="text-xs text-gray-500">{t('Balance')}</p>
                </div>
              )}
              {(isOwnProfile || profile.show_earnings) && (
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-purple-600">${Number(profile.wallet?.total_earned || 0).toFixed(0)}</p>
                  <p className="text-xs text-gray-500">{t('Earned')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mt-8 overflow-x-auto">
          {[
            { key: 'posts', label: t('Posts'), icon: <Heart size={14} /> },
            { key: 'reels', label: t('Reels'), icon: <Video size={14} /> },
            { key: 'products', label: t('Products'), icon: <ShoppingBag size={14} /> },
            { key: 'gigs', label: t('Gigs'), icon: <Zap size={14} /> },
            { key: 'portfolio', label: t('Portfolio'), icon: <Briefcase size={14} /> },
          ].map(({ key, label, icon }) => (
            <button key={key} onClick={() => {
              setActiveTab(key as any);
              fetchUserContent(key);
            }}
              className={`flex items-center gap-1 px-6 py-3 text-sm font-semibold transition border-b-2 -mb-px whitespace-nowrap ${
                activeTab === key ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="py-6">
          {activeTab === 'posts' && (
            <div className="space-y-3">
              {userPosts.length === 0 && <p className="text-gray-500 text-center py-10">{t('no_posts_yet')}</p>}
              {userPosts.map((post: any) => (
                <div key={post.id} className="glass p-4 rounded-xl">
                  <p className="text-sm">{post.text}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>❤️ {post.likes_count}</span><span>💬 {post.comments_count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'reels' && (
            <div className="grid grid-cols-2 gap-3">
              {userReels.length === 0 && <p className="text-gray-500 text-center py-10 col-span-2">{t('no_reels_yet')}</p>}
              {userReels.map((reel: any) => (
                <div key={reel.id} className="glass rounded-xl overflow-hidden">
                  <video src={reel.video_url} className="w-full h-32 object-cover" />
                  <p className="p-2 text-xs">{reel.caption}</p>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'products' && (
            <div className="space-y-3">
              {userProducts.length === 0 && <p className="text-gray-500 text-center py-10">{t('no_products')}</p>}
              {userProducts.map((p: any) => (
                <div key={p.id} className="glass p-3 rounded-xl flex gap-3">
                  {p.image_url && <img src={p.image_url} className="w-16 h-16 rounded-lg object-cover" alt="" />}
                  <div><p className="font-semibold text-sm">{p.title}</p><p className="text-green-600">${p.price}</p></div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'gigs' && (
            <div className="space-y-3">
              {userGigs.length === 0 && <p className="text-gray-500 text-center py-10">{t('no_gigs')}</p>}
              {userGigs.map((g: any) => (
                <div key={g.id} className="glass p-3 rounded-xl">
                  <p className="font-semibold text-sm">{g.title}</p>
                  <p className="text-xs text-gray-500">{g.status} · ${g.budget}</p>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'portfolio' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {portfolio.map(item => (
                  <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-3 rounded-xl">
                    {item.image_url && <img src={item.image_url} className="w-full h-32 object-cover rounded-lg mb-2" alt="" />}
                    <h4 className="font-semibold text-sm">{item.title}</h4>
                    <p className="text-xs text-gray-500">{item.description}</p>
                    {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">View Project →</a>}
                  </motion.div>
                ))}
                {isOwnProfile && (
                  <button
                    onClick={() => setShowPortfolioForm(true)}
                    className="glass p-3 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:text-green-500 hover:border-green-400 transition min-h-[150px]"
                  >
                    <PlusCircle size={32} />
                    <span className="text-sm mt-2 font-semibold">{t('Add Project')}</span>
                  </button>
                )}
              </div>

              <AnimatePresence>
                {showPortfolioForm && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                    onClick={() => setShowPortfolioForm(false)}>
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                      className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
                      onClick={e => e.stopPropagation()}>
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Upload size={18} /> {t('Add Portfolio Item')}</h3>
                      <input className="input-field mb-3" placeholder={t('Project title *')} value={pfTitle} onChange={e => setPfTitle(e.target.value)} />
                      <textarea className="input-field mb-3" placeholder={t('Description...')} value={pfDesc} onChange={e => setPfDesc(e.target.value)} rows={2} />
                      <input className="input-field mb-3" placeholder={t('Link (optional)')} value={pfLink} onChange={e => setPfLink(e.target.value)} />
                      <div className="mb-3">
                        <label className="btn-ghost cursor-pointer flex items-center gap-1 text-sm">
                          <ImageIcon size={16} /> {pfImage ? pfImage.name : t('Upload Image')}
                          <input type="file" accept="image/*" className="hidden" onChange={e => setPfImage(e.target.files?.[0] || null)} />
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={addPortfolioItem} className="btn-primary flex-1">{t('Add to Portfolio')}</button>
                        <button onClick={() => setShowPortfolioForm(false)} className="btn-ghost">{t('Cancel')}</button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}