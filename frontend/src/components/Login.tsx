import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Logo from './Logo';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ Redirect when user is available
  React.useEffect(() => {
  if (user) {
    const onboarded = localStorage.getItem('sasl_onboarded');
    setTimeout(() => {
      window.location.href = onboarded ? '/' : '/onboarding';
    }, 100);
  }
}, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!email || !password) return toast.error(t('fill_all_fields'));
  setLoading(true);
  try {
    await login(email, password);
    const onboarded = localStorage.getItem('sasl_onboarded');
    navigate(onboarded ? '/' : '/onboarding', { replace: true });
  } catch (err: any) {
    toast.error(err.message || 'Login failed');
    setLoading(false);
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass p-8 rounded-3xl shadow-2xl backdrop-blur-lg">
          <div className="text-center mb-8">
            <Logo className="justify-center scale-125" />
            <p className="text-gray-400 mt-3 text-sm tracking-wide">{t('login_tagline')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative group">
              <Mail className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-green-400 transition-colors" size={20} />
              <input
                type="email"
                placeholder={t('email')}
                className="w-full pl-12 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/50 transition-all"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-green-400 transition-colors" size={20} />
              <input
                type="password"
                placeholder={t('password')}
                className="w-full pl-12 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/50 transition-all"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:from-green-600 hover:to-green-700 transition-all transform active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                  <LogIn size={18} />
                </motion.div>
              ) : (
                <>{t('login')} <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              {t('no_account')}{' '}
              <Link to="/register" className="text-green-400 font-semibold hover:text-green-300 transition-colors">
                {t('register_here')}
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}