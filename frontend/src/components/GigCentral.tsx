/**
 * Sasl - Social Asynchronous Sharing Layer
 * Gig Central – Advanced freelancer marketplace with milestones, reviews, disputes, portfolio
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Briefcase, PlusCircle, Loader2, UserCheck, CheckCircle, Star,
  AlertCircle, DollarSign, MessageCircle, Calendar, FileText,
  Search, Filter, Clock, Award, Shield, Zap, TrendingUp,
  ChevronDown, ChevronUp, X, Image as ImageIcon, Link, Upload,
  ThumbsUp, Flag, Users, Target, BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import WebRTCPrivateChat from './WebRTCPrivateChat';
import { useTranslation } from 'react-i18next';

interface Gig {
  id: string;
  creator_name: string;
  creator_avatar?: string;
  title: string;
  description: string;
  budget: string;
  status: string;
  category?: string;
  taker_name?: string;
  taker_avatar?: string;
  milestones?: Milestone[];
  reviews?: Review[];
  average_rating?: number;
  review_count?: number;
  created_at: string;
  deadline?: string;
}

interface Milestone {
  id: string;
  title: string;
  amount: string;
  completed: boolean;
  completed_at?: string;
}

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface SkillBadge {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'expert';
  endorsements: number;
}

interface Portfolio {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  link?: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 border-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
  disputed: 'bg-red-100 text-red-700 border-red-300',
  cancelled: 'bg-gray-100 text-gray-700 border-gray-300',
};

const STATUS_ICONS: Record<string, JSX.Element> = {
  open: <Target size={14} />,
  in_progress: <Clock size={14} />,
  completed: <CheckCircle size={14} />,
  disputed: <Flag size={14} />,
  cancelled: <X size={14} />,
};

export default function GigCentral() {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  // State
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'open' | 'in_progress' | 'completed' | 'mine'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedGig, setExpandedGig] = useState<string | null>(null);
  const [chatRoom, setChatRoom] = useState<string | null>(null);
  
  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [newCategory, setNewCategory] = useState('design');
  const [newDeadline, setNewDeadline] = useState('');
  const [milestones, setMilestones] = useState<{ title: string; amount: string }[]>([
    { title: '', amount: '' }
  ]);
  
  // Review state
  const [showReview, setShowReview] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  
  // Dispute state
  const [showDispute, setShowDispute] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  
  // Portfolio state
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [pfTitle, setPfTitle] = useState('');
  const [pfDesc, setPfDesc] = useState('');
  const [pfLink, setPfLink] = useState('');
  const [pfImage, setPfImage] = useState<File | null>(null);
  
  // Skill badges
  const [skillBadges, setSkillBadges] = useState<SkillBadge[]>([]);
  const [showBadges, setShowBadges] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({ totalGigs: 0, completedGigs: 0, totalEarned: '0', avgRating: 0 });

  // ============================================================
  // FETCH
  // ============================================================
  const fetchGigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'mine') params.set('status', activeTab);
if (activeTab === 'mine') params.set('mine', 'true');
if (searchQuery) params.set('search', searchQuery);
      
      const res = await api.get(`/gigs/gigs/?${params.toString()}`);
      setGigs(Array.isArray(res.data) ? res.data : res.data.results || []);
      
      // Calculate stats
      const all = Array.isArray(res.data) ? res.data : res.data.results || [];
      const completed = all.filter((g: Gig) => g.status === 'completed');
      setStats({
        totalGigs: all.length,
        completedGigs: completed.length,
        totalEarned: completed.reduce((sum: number, g: Gig) => sum + parseFloat(g.budget || '0'), 0).toFixed(2),
        avgRating: completed.length > 0 
          ? completed.reduce((sum: number, g: Gig) => sum + (g.average_rating || 0), 0) / completed.length 
          : 0,
      });
    } catch (err) {
      setError(t('Could not load gigs.'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => { fetchGigs(); }, [fetchGigs]);

  const fetchPortfolio = async () => {
    try {
      const res = await api.get('/gigs/gigs/portfolio/');
      setPortfolio(res.data || []);
    } catch {}
  };

  const fetchBadges = async () => {
    try {
      const res = await api.get('/gigs/gigs/my_badges/');
      setSkillBadges(res.data || []);
    } catch {}
  };

  useEffect(() => { fetchPortfolio(); fetchBadges(); }, []);

  // ============================================================
  // ACTIONS
  // ============================================================
  const createGig = async () => {
    if (!newTitle || !newBudget) return toast.error(t('Title & budget required'));
    try {
      await api.post('/gigs/gigs/', {
        title: newTitle,
        description: newDesc,
        budget: parseFloat(newBudget),
        category: newCategory,
        deadline: newDeadline || null,
        milestones: milestones.filter(m => m.title && m.amount),
      });
      toast.success(t('🎉 Gig posted successfully!'));
      setShowForm(false);
      resetForm();
      fetchGigs();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('Failed to post gig'));
    }
  };

  const takeGig = async (id: string) => {
    try {
      await api.post(`/gigs/gigs/${id}/take/`);
      toast.success(t('Gig accepted! You can now chat with the client.'));
      fetchGigs();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('Could not take gig'));
    }
  };

  const completeGig = async (id: string) => {
    try {
      await api.post(`/gigs/gigs/${id}/complete/`);
      toast.success(t('🎉 Gig completed & payment released!'));
      fetchGigs();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('Completion failed'));
    }
  };

  const completeMilestone = async (gigId: string, milestoneId: string) => {
    try {
      await api.post(`/gigs/gigs/${gigId}/complete_milestone/`, { milestone_id: milestoneId });
      toast.success(t('Milestone approved & paid!'));
      fetchGigs();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('Failed'));
    }
  };

  const submitReview = async (gigId: string) => {
    try {
      await api.post(`/gigs/gigs/${gigId}/review/`, {
        rating: reviewRating,
        comment: reviewComment,
      });
      toast.success(t('Review submitted!'));
      setShowReview(null);
      setReviewComment('');
      setReviewRating(5);
      fetchGigs();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('Review failed'));
    }
  };

  const fileDispute = async (gigId: string) => {
    if (!disputeReason.trim()) return toast.error(t('Please provide a reason'));
    try {
      await api.post(`/gigs/gigs/${gigId}/dispute/`, { reason: disputeReason });
      toast.success(t('Dispute filed. Our team will review within 24 hours.'));
      setShowDispute(null);
      setDisputeReason('');
      fetchGigs();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('Failed to file dispute'));
    }
  };

  const addPortfolioItem = async () => {
    if (!pfTitle) return toast.error(t('Title required'));
    const formData = new FormData();
    formData.append('title', pfTitle);
formData.append('description', pfDesc);
formData.append('link', pfLink);
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

  // ============================================================
  // HELPERS
  // ============================================================
  const resetForm = () => {
    setNewTitle(''); setNewDesc(''); setNewBudget('');
    setNewDeadline(''); setNewCategory(t('design'));
    setMilestones([{ title: '', amount: '' }]);
  };

  const addMilestone = () => {
    setMilestones(prev => [...prev, { title: '', amount: '' }]);
  };

  const updateMilestone = (index: number, field: 'title' | 'amount', value: string) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const removeMilestone = (index: number) => {
    setMilestones(prev => prev.filter((_, i) => i !== index));
  };

  const toggleExpand = (gigId: string) => {
    setExpandedGig(expandedGig === gigId ? null : gigId);
  };

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const tabs = [
    { key: 'open' as const, icon: <Target size={16} />, label: t('Open'), count: gigs.filter(g => g.status === 'open').length },
    { key: 'in_progress' as const, icon: <Clock size={16} />, label: t('In Progress'), count: gigs.filter(g => g.status === 'in_progress').length },
    { key: 'completed' as const, icon: <CheckCircle size={16} />, label: t('Completed'), count: gigs.filter(g => g.status === 'completed').length },
    { key: 'mine' as const, icon: <Briefcase size={16} />, label: t('My Gigs'), count: 0 },
  ];

  const categories = [t('design'), t('development'), t('writing'), t('marketing'), t('video'), t('music'), t('business'), t('other')];

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star key={i} size={14} className={i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
    ));
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading && gigs.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-green-500" size={48} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold gradient-text flex items-center gap-2">
            <Briefcase className="text-green-500" /> {t('Gig Central')}
          </h2>
          <p className="text-gray-500 text-sm mt-1">Find work, hire talent, earn money – all in one place</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowBadges(!showBadges)} className="btn-ghost text-sm flex items-center gap-1">
            <Award size={16} /> Badges {skillBadges.length > 0 && `(${skillBadges.length})`}
          </button>
          <button onClick={() => setShowPortfolioForm(!showPortfolioForm)} className="btn-ghost text-sm flex items-center gap-1">
            <ImageIcon size={16} /> {t('Portfolio')}
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <PlusCircle size={18} /> {showForm ? t('Cancel') : t('Post a Gig')}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: <Briefcase size={18} />, label: t('Total Gigs'), value: stats.totalGigs, color: 'blue' },
          { icon: <CheckCircle size={18} />, label: t('Completed'), value: stats.completedGigs, color: 'green' },
          { icon: <DollarSign size={18} />, label: t('Earned'), value: `$${stats.totalEarned}`, color: 'yellow' },
          { icon: <Star size={18} />, label: t('Avg Rating'), value: stats.avgRating.toFixed(1), color: 'purple' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-3 rounded-xl text-center"
          >
            <div className={`text-${stat.color}-500 mx-auto mb-1`}>{stat.icon}</div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Badges Panel */}
      <AnimatePresence>
        {showBadges && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <div className="glass p-4 rounded-2xl">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Award size={18} /> {t('My Skill Badges')}</h3>
              {skillBadges.length === 0 ? (
                <p className="text-gray-500 text-sm">{t('Complete gigs to earn skill badges!')}</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {skillBadges.map(badge => (
                    <div key={badge.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        badge.level === 'expert' ? 'bg-purple-100 text-purple-600' :
                        badge.level === 'intermediate' ? 'bg-blue-100 text-blue-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        <Award size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{badge.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{badge.level} · {badge.endorsements} endorsements</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portfolio Panel */}
      <AnimatePresence>
        {showPortfolioForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <div className="glass p-6 rounded-2xl space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><Upload size={18} /> {t('Add Portfolio Item')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input className="input-field" placeholder="Project title" value={pfTitle} onChange={e => setPfTitle(e.target.value)} />
                <input className="input-field" placeholder="Link (optional)" value={pfLink} onChange={e => setPfLink(e.target.value)} />
              </div>
              <textarea className="input-field" placeholder="Description..." value={pfDesc} onChange={e => setPfDesc(e.target.value)} rows={2} />
              <div className="flex items-center gap-3">
                <label className="btn-ghost cursor-pointer flex items-center gap-1 text-sm">
                  <ImageIcon size={16} /> {pfImage ? pfImage.name : t('Upload Image')}
                  <input type="file" accept="image/*" className="hidden" onChange={e => setPfImage(e.target.files?.[0] || null)} />
                </label>
                <button onClick={addPortfolioItem} className="btn-primary">{t('Add to Portfolio')}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Gig Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass p-6 rounded-2xl mb-6 space-y-4 shadow-xl border-2 border-green-200">
            <h3 className="font-bold text-xl flex items-center gap-2"><FileText size={20} /> {t('Create New Gig')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="input-field" placeholder="What do you need done? *" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              <select className="input-field" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                {categories.map(cat => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
              </select>
            </div>
            
            <textarea className="input-field" placeholder="Describe the work in detail..." value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="input-field" type="number" placeholder="Total Budget ($) *" value={newBudget} onChange={e => setNewBudget(e.target.value)} />
              <input className="input-field" type="date" placeholder="Deadline" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} />
            </div>

            {/* Milestones */}
            <div className="space-y-2 bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold flex items-center gap-1"><Target size={14} /> Milestones</p>
                <button onClick={addMilestone} className="text-xs text-green-600 hover:underline font-semibold">+ Add Milestone</button>
              </div>
              {milestones.map((m, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input className="input-field flex-1 text-sm" placeholder="Milestone title" value={m.title} onChange={e => updateMilestone(idx, 'title', e.target.value)} />
                  <input className="input-field w-28 text-sm" type="number" placeholder="Amount" value={m.amount} onChange={e => updateMilestone(idx, 'amount', e.target.value)} />
                  {milestones.length > 1 && (
                    <button onClick={() => removeMilestone(idx)} className="text-red-500 hover:text-red-700 p-1">✕</button>
                  )}
                </div>
              ))}
            </div>

            <button onClick={createGig} className="btn-primary w-full py-3 text-lg font-bold">
              {t('🚀 Post Gig')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Tabs */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field pl-10"
            placeholder={t('Search gigs...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
                activeTab === tab.key
                  ? 'bg-white shadow text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
              {tab.count > 0 && <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Gigs List */}
      {error ? (
        <div className="glass p-12 rounded-2xl text-center">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={48} />
          <p className="text-lg text-gray-600">{error}</p>
          <button onClick={fetchGigs} className="btn-primary mt-4"> {t('Retry')}</button>
        </div>
      ) : gigs.length === 0 ? (
        <div className="glass p-12 rounded-2xl text-center">
          <Briefcase size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-xl text-gray-500">{t('No gigs found')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('Be the first to post a gig!')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {gigs.map(gig => (
            <motion.div
              key={gig.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass rounded-2xl overflow-hidden transition hover:shadow-lg ${
                expandedGig === gig.id ? 'ring-2 ring-green-300' : ''
              }`}
            >
              {/* Main Row */}
              <div className="p-5 cursor-pointer" onClick={() => toggleExpand(gig.id)}>
                <div className="flex flex-col md:flex-row justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                        {gig.creator_name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          {gig.title}
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${STATUS_COLORS[gig.status]}`}>
                            {STATUS_ICONS[gig.status]} {gig.status.replace('_', ' ')}
                          </span>
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-3">
                          <span>{t('by')} @{gig.creator_name}</span>
                          {gig.taker_name && (
                            <span className="flex items-center gap-1 text-purple-600">
                              <UserCheck size={14} /> @{gig.taker_name}
                            </span>
                          )}
                          {gig.average_rating && (
                            <span className="flex items-center gap-1 text-yellow-500">
                              <Star size={14} className="fill-yellow-400" /> {gig.average_rating}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{gig.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-green-600 font-bold flex items-center gap-1"><DollarSign size={14} />${gig.budget}</span>
                      {gig.category && <span className="text-gray-400">📁 {gig.category}</span>}
                      {gig.deadline && <span className="text-gray-400">📅 {new Date(gig.deadline).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(gig.creator_name === user?.username || gig.taker_name === user?.username) && (
                      <button onClick={(e) => { e.stopPropagation(); setChatRoom(`gig-${gig.id}`); }} className="btn-ghost text-sm flex items-center gap-1">
                        <MessageCircle size={14} /> {t('Chat')}
                      </button>
                    )}
                    {gig.creator_name !== user?.username && gig.status === 'open' && (
                      <button onClick={(e) => { e.stopPropagation(); takeGig(gig.id); }} className="btn-primary text-sm">
                        <Zap size={14} className="mr-1" /> {t('Take Gig')}
                      </button>
                    )}
                    {gig.taker_name === user?.username && gig.status === 'in_progress' && (
                      <button onClick={(e) => { e.stopPropagation(); completeGig(gig.id); }} className="btn-secondary text-sm">
                        <CheckCircle size={14} className="mr-1" /> {t('Complete')}
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); toggleExpand(gig.id); }} className="p-2 rounded-full hover:bg-gray-100">
                      {expandedGig === gig.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedGig === gig.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t">
                    <div className="p-5 space-y-4 bg-gray-50/50">
                      {/* Milestones */}
                      {gig.milestones && gig.milestones.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2 flex items-center gap-1"><Target size={14} /> Milestones</h4>
                          <div className="space-y-2">
                            {gig.milestones.map(m => (
                              <div key={m.id} className="flex items-center justify-between bg-white p-3 rounded-xl">
                                <div className="flex items-center gap-2">
                                  <CheckCircle size={16} className={m.completed ? 'text-green-500' : 'text-gray-300'} />
                                  <span className="text-sm">{m.title}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-sm">${m.amount}</span>
                                  {gig.creator_name === user?.username && !m.completed && gig.taker_name && (
                                    <button onClick={() => completeMilestone(gig.id, m.id)} className="text-xs text-green-600 hover:underline">
                                      {t('Approve & Pay')}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Reviews */}
                      {gig.reviews && gig.reviews.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2 flex items-center gap-1"><Star size={14} /> {t('Reviews')} ({gig.reviews.length})</h4>
                          <div className="space-y-2">
                            {gig.reviews.map(r => (
                              <div key={r.id} className="bg-white p-3 rounded-xl">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-sm">{r.reviewer_name}</span>
                                  <div className="flex">{renderStars(r.rating)}</div>
                                </div>
                                <p className="text-sm text-gray-600">{r.comment}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-wrap">
                        {gig.status === 'completed' && (gig.creator_name === user?.username || gig.taker_name === user?.username) && (
                          <button onClick={() => setShowReview(gig.id)} className="btn-ghost text-sm flex items-center gap-1">
                            <Star size={14} /> {t('Leave Review')}
                          </button>
                        )}
                        {(gig.creator_name === user?.username || gig.taker_name === user?.username) && gig.status === 'in_progress' && (
                          <button onClick={() => setShowDispute(gig.id)} className="btn-ghost text-sm text-red-500 flex items-center gap-1">
                            <Flag size={14} /> {t('File Dispute')}
                          </button>
                        )}
                      </div>

                      {/* Review Form */}
                      <AnimatePresence>
                        {showReview === gig.id && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-4 rounded-xl space-y-3">
                            <div className="flex items-center gap-1">
                              {[1,2,3,4,5].map(i => (
                                <button key={i} onClick={() => setReviewRating(i)}>
                                  <Star size={24} className={i <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                                </button>
                              ))}
                            </div>
                            <textarea className="input-field" placeholder={t('Write your review...')} value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={2} />
                            <div className="flex gap-2">
                              <button onClick={() => submitReview(gig.id)} className="btn-primary text-sm">{t('Submit')}</button>
                              <button onClick={() => setShowReview(null)} className="btn-ghost text-sm">{t('Cancel')}</button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Dispute Form */}
                      <AnimatePresence>
                        {showDispute === gig.id && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 p-4 rounded-xl space-y-3">
                            <textarea className="input-field" placeholder={t('Describe the issue...')} value={disputeReason} onChange={e => setDisputeReason(e.target.value)} rows={2} />
                            <div className="flex gap-2">
                              <button onClick={() => fileDispute(gig.id)} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm">{t('File Dispute')}</button>
                              <button onClick={() => setShowDispute(null)} className="btn-ghost text-sm">{t('Cancel')}</button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Chat Modal */}
      {chatRoom && <WebRTCPrivateChat roomId={chatRoom} onClose={() => setChatRoom(null)} />}
    </div>
  );
}