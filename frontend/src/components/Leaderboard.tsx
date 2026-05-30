/**
 * Sasl - Leaderboard
 * Popularity (always public) + Earnings (opt-in only)
 */
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, TrendingUp, DollarSign, Users, Shield, Crown, Medal, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function Leaderboard() {
  const { user } = useAuth();
  const [popularity, setPopularity] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'popularity' | 'earnings'>('popularity');
  const { t } = useTranslation();

  useEffect(() => {
    api.get('/users/leaderboard/popularity/').then(res => setPopularity(res.data));
    api.get('/users/leaderboard/earnings/').then(res => setEarnings(res.data));
  }, []);

  const getRankBadge = (idx: number) => {
    if (idx === 0) return <Crown size={20} className="text-yellow-400" />;
    if (idx === 1) return <Medal size={20} className="text-gray-300" />;
    if (idx === 2) return <Medal size={20} className="text-orange-400" />;
    return <span className="text-gray-400 font-bold">{idx + 1}</span>;
  };

  const getRankBg = (idx: number) => {
    if (idx === 0) return 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-200';
    if (idx === 1) return 'bg-gradient-to-br from-gray-300 to-gray-400 text-white';
    if (idx === 2) return 'bg-gradient-to-br from-orange-400 to-orange-500 text-white';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-3xl font-bold gradient-text mb-2 flex items-center gap-2">
          <Trophy className="text-yellow-500" /> {t('leaderboard')}
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          {activeTab === 'popularity' ? t('public_ranking_based_on_followers') : t('only_users_who_chose_to_share_their_earnings_appear_here')}
        </p>
      </motion.div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-full">
        <button
          onClick={() => setActiveTab('popularity')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
            activeTab === 'popularity' 
              ? 'bg-white shadow text-green-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={16} /> {t('popularity')}
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
            activeTab === 'earnings' 
              ? 'bg-white shadow text-green-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <DollarSign size={16} /> {t('earnings')}
        </button>
      </div>

      {/* Popularity Leaderboard */}
      {activeTab === 'popularity' && (
        <div className="space-y-2">
          {popularity.map((entry, idx) => (
            <motion.div
              key={entry.username}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              whileHover={{ scale: 1.01, y: -1 }}
              className={`glass-card p-4 flex items-center gap-4 ${
                entry.username === user?.username ? 'ring-2 ring-green-400 shadow-sasl' : ''
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${getRankBg(idx)}`}>
                {getRankBadge(idx)}
              </div>
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                  {entry.username[0]?.toUpperCase()}
                </div>
                {entry.is_verified && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5">
                    <Star size={10} className="text-white fill-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {entry.display_name || entry.username}
                  {entry.is_verified && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{t('verified')}</span>
                  )}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                  <span className="flex items-center gap-1"><Users size={12} /> {entry.followers_count} {t('followers')}</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                    {t('level')} {entry.level}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-gray-900 dark:text-white">#{idx + 1}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Earnings Leaderboard */}
      {activeTab === 'earnings' && (
        <div className="space-y-2">
          {earnings.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="glass-card p-12 rounded-2xl text-center"
            >
              <Shield size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">{t('no_one_has_chosen_to_share_their_earnings_yet')}</p>
              <p className="text-sm text-gray-400 mt-1">{t('enable_show_earnings_in_your_profile_to_appear_here')}</p>
            </motion.div>
          ) : (
            earnings.map((entry, idx) => (
              <motion.div
                key={entry.username}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                whileHover={{ scale: 1.01, y: -1 }}
                className={`glass-card p-4 flex items-center gap-4 ${
                  entry.username === user?.username ? 'ring-2 ring-green-400 shadow-sasl' : ''
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${getRankBg(idx)}`}>
                  {getRankBadge(idx)}
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                  {entry.username[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">{entry.display_name || entry.username}</p>
                </div>
                <p className="font-bold text-green-600 text-lg">${Number(entry.total_earned).toFixed(2)}</p>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}