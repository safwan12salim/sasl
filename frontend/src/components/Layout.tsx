import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { useMesh } from '../hooks/useMesh';
import Logo from './Logo';
import {
  Home, ShoppingBag, Radio, GraduationCap, Wallet, User,
  LogOut, Wifi, WifiOff, Video, Camera, MessageCircle,
  Star, Briefcase, TrendingUp, Sparkles, Brain, DollarSign,
  Moon, Sun, Mic, Users
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import PageTransition from './PageTransition';
import OnlineUsers from './OnlineUsers';
import { useTheme } from '../contexts/ThemeContext';
import ReferralModal from './ReferralModal';
import { motion } from 'framer-motion';


export default function Layout() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { isOnline, toggleOnlineMode } = useMesh();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [showReferral, setShowReferral] = useState(false);
  
  const navItems = [
    { to: '/', icon: Home, label: t('feed') },
    { to: '/gigs', icon: Briefcase, label: t('Gig Central') },
    { to: '/marketplace', icon: ShoppingBag, label: t('marketplace') },
    { to: '/group-chat', icon: Users, label: t('Group Chat') },
    { to: '/tutoring', icon: GraduationCap, label: t('tutoring') },
    { to: '/streaming', icon: Radio, label: t('streaming') },
    { to: '/reels', icon: Video, label: t('Reels') },
    { to: '/snap', icon: Camera, label: t('Snap') },
    { to: '/ar-filters', icon: Camera, label: t('AR Filters') },
    { to: '/analytics', icon: TrendingUp, label: t('Analytics') },
    { to: '/live-audio', icon: Mic, label: t('Live Audio') },
    { to: '/meshchat', icon: MessageCircle, label: t('meshchat') },
    { to: '/ai-hub', icon: Sparkles, label: t('Sasl AI Hub') },
    { to: '/progress', icon: Star, label: t('Progress') },
    { to: '/wallet', icon: Wallet, label: t('wallet') },
    { to: '/referral', icon: Users, label: t('referrals') },
    { to: '/earnings', icon: DollarSign, label: t('Earnings') },
    { to: '/profile', icon: User, label: t('profile') },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 opacity-30 dark:opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-sasl-green/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-sasl-orange/10 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Sidebar */}
      <aside className="w-72 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white p-4 flex flex-col shadow-2xl z-20 relative border-r border-white/5">
        {/* Sidebar glow effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-sasl-green/10 via-transparent to-sasl-orange/5 pointer-events-none" />
        
        <div className="mb-8 relative z-10">
          <Logo />
        </div>
        
        <nav className="flex-1 space-y-0.5 overflow-y-auto relative z-10">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-sasl-green/30 to-sasl-green/10 shadow-lg shadow-sasl-green/10 font-semibold border border-sasl-green/20'
                    : 'hover:bg-white/5 hover:translate-x-1'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-sasl-green to-sasl-orange rounded-r-full" />
                )}
                <Icon size={18} className={`transition-colors ${isActive ? 'text-sasl-green' : 'text-white/60 group-hover:text-white/90'}`} />
                <span className={`text-sm ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                  {label}
                </span>
                {isActive && (
                  <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-sasl-green animate-glow" />
                )}
              </Link>
            );
          })}
        </nav>
        
        <div className="border-t border-white/10 pt-4 mt-4 relative z-10 space-y-2">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sasl-green to-sasl-orange flex items-center justify-center text-white font-bold text-xs">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-medium text-white/80">{user?.username}</span>
            </div>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={toggleOnlineMode} 
              className={`p-2 rounded-full transition-all duration-300 ${
                isOnline 
                  ? 'bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20' 
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            </motion.button>
          </div>
          
          <OnlineUsers />
          
          <div className="flex items-center gap-1">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme} 
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-white/5 transition text-white/60 hover:text-white/90 text-sm"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
              {isDark ? t('light_mode') : t('dark_mode')}
            </motion.button>
          </div>
          
          <button 
            onClick={() => setShowReferral(true)} 
            className="flex items-center gap-2 w-full py-2.5 px-4 rounded-xl hover:bg-white/5 transition text-white/70 hover:text-white text-sm"
          >
            <Users size={16} /> {t('invite')}
          </button>
          
          <button 
            onClick={logout} 
            className="flex items-center gap-2 w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition text-red-400 hover:text-red-300 text-sm"
          >
            <LogOut size={16} /> {t('logout')}
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col relative bg-transparent">
        {/* Sticky top header */}
        <header className="sticky top-0 z-10 flex justify-between items-center px-6 py-3 glass border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sasl-green animate-pulse" />
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {isOnline ? t('online') : t('offline')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <OnlineUsers />
            <NotificationBell />
            <LanguageSwitcher />
          </div>
        </header>

        {/* Scrollable main */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-mesh-pattern">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
      
      {showReferral && (
        <ReferralModal 
          referralCode={user?.username || 'sasl'} 
          onClose={() => setShowReferral(false)} 
        />
      )}
    </div>
  );
}