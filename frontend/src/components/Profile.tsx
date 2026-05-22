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

  const isOwnProfile = !username || (currentUser && currentUser.username === username);

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
        toast.error('Profile not found');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    fetchPortfolio();
  }, [username]);

  // ✅ FIXED: Fetch portfolio items
  const fetchPortfolio = async () => {
    try {
      const res = await api.get('/gigs/gigs/portfolio/');
      setPortfolio(res.data || []);
    } catch {}
  };

  const handleSave = async () => {
    const formData = new FormData();
    formData.append('display_name', editForm.display_name);
    formData.append('bio', editForm.bio);
    if (avatarFile) formData.append('avatar', avatarFile);
    try {
      await api.patch('/users/profile/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Profile updated!');
      setIsEditing(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Update failed');
    }
  };

  const handleFollow = async () => {
    if (!profile) return;
    try {
      await api.post('/users/follow/toggle/', { username: profile.username });
      toast.success('Done!');
      window.location.reload();
    } catch {}
  };

  // ✅ FIXED: Add portfolio item
  const addPortfolioItem = async () => {
    if (!pfTitle.trim()) return toast.error('Title required');
    const formData = new FormData();
    formData.append('title', pfTitle);
    formData.append('description', pfDesc);
    if (pfLink) formData.append('link', pfLink);
    if (pfImage) formData.append('image', pfImage);
    try {
      await api.post('/gigs/gigs/add_portfolio/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Portfolio item added!');
      setShowPortfolioForm(false);
      setPfTitle(''); setPfDesc(''); setPfLink(''); setPfImage(null);
      fetchPortfolio();
    } catch (err: any) {
      toast.error('Failed to add portfolio item');
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
        <h2 className="text-2xl font-bold text-gray-600">Profile not found</h2>
      </div>
    );
  }

  const isFollowing = false;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Photo */}
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

      {/* Profile Info */}
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
                        <Check size={12} className="mr-1" /> Verified
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
                      {isFollowing ? 'Following' : 'Follow'}
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
              <p className="mt-2 text-gray-600">{profile.bio || 'No bio yet.'}</p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-green-600">{profile.followers_count || 0}</p>
                <p className="text-xs text-gray-500">Followers</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-blue-600">{profile.following_count || 0}</p>
                <p className="text-xs text-gray-500">Following</p>
              </div>
              {(isOwnProfile || profile.show_balance) && (
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-yellow-600">${Number(profile.wallet?.balance || 0).toFixed(0)}</p>
                  <p className="text-xs text-gray-500">Balance</p>
                </div>
              )}
              {(isOwnProfile || profile.show_earnings) && (
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-purple-600">${Number(profile.wallet?.total_earned || 0).toFixed(0)}</p>
                  <p className="text-xs text-gray-500">Earned</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mt-8 overflow-x-auto">
          {[
            { key: 'posts', label: 'Posts', icon: <Heart size={14} /> },
            { key: 'reels', label: 'Reels', icon: <Video size={14} /> },
            { key: 'products', label: 'Products', icon: <ShoppingBag size={14} /> },
            { key: 'gigs', label: 'Gigs', icon: <Zap size={14} /> },
            { key: 'portfolio', label: 'Portfolio', icon: <Briefcase size={14} /> },
          ].map(({ key, label, icon }) => (
            <button key={key} onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-1 px-6 py-3 text-sm font-semibold transition border-b-2 -mb-px whitespace-nowrap ${
                activeTab === key ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="py-6">
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
                {/* ✅ FIXED: Add Portfolio Button actually works now */}
                {isOwnProfile && (
                  <button
                    onClick={() => setShowPortfolioForm(true)}
                    className="glass p-3 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:text-green-500 hover:border-green-400 transition min-h-[150px]"
                  >
                    <PlusCircle size={32} />
                    <span className="text-sm mt-2 font-semibold">Add Project</span>
                  </button>
                )}
              </div>

              {/* ✅ FIXED: Portfolio Form Modal */}
              <AnimatePresence>
                {showPortfolioForm && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                    onClick={() => setShowPortfolioForm(false)}>
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                      className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
                      onClick={e => e.stopPropagation()}>
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Upload size={18} /> Add Portfolio Item</h3>
                      <input className="input-field mb-3" placeholder="Project title *" value={pfTitle} onChange={e => setPfTitle(e.target.value)} />
                      <textarea className="input-field mb-3" placeholder="Description..." value={pfDesc} onChange={e => setPfDesc(e.target.value)} rows={2} />
                      <input className="input-field mb-3" placeholder="Link (optional)" value={pfLink} onChange={e => setPfLink(e.target.value)} />
                      <div className="mb-3">
                        <label className="btn-ghost cursor-pointer flex items-center gap-1 text-sm">
                          <ImageIcon size={16} /> {pfImage ? pfImage.name : 'Upload Image'}
                          <input type="file" accept="image/*" className="hidden" onChange={e => setPfImage(e.target.files?.[0] || null)} />
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={addPortfolioItem} className="btn-primary flex-1">Add to Portfolio</button>
                        <button onClick={() => setShowPortfolioForm(false)} className="btn-ghost">Cancel</button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          {activeTab !== 'portfolio' && (
            <p className="text-gray-500 text-center py-10">Content will appear here</p>
          )}
        </div>
      </div>
    </div>
  );
}