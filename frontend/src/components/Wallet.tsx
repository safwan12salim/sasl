import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Wallet as WalletIcon, TrendingUp, ArrowDownCircle, Loader2, AlertCircle, DollarSign, Heart, ShoppingCart, Star, Video, BookOpen, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface Transaction { id: string; amount: number; transaction_type: string; description: string; created_at: string; }
interface CategoryTotal { category: string; total: number; count: number; icon: JSX.Element; color: string; }

export default function Wallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<{ balance: number; total_earned: number } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'earnings' | 'spending'>('all');
  const { t } = useTranslation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const walletRes = await api.get('/users/wallet/'); setWallet(walletRes.data);
        const txRes = await api.get('/monetization/transactions/'); setTransactions(txRes.data.results || txRes.data || []);
      } catch { setError(t('Failed to load wallet')); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      await api.post('/monetization/withdraw/', { amount: wallet?.balance });
      toast.success(t('Withdrawal request sent!'));
      const walletRes = await api.get('/users/wallet/'); setWallet(walletRes.data);
    } catch (err: any) { toast.error(err.response?.data?.error || t('Withdrawal failed')); } finally { setWithdrawing(false); }
  };

  const handleTopUp = async () => {
    const amount = prompt(t('Enter amount in USD:'));
    if (!amount) return;
    try { const res = await api.post('/monetization/create-checkout/', { amount }); window.location.href = res.data.url; }
    catch { toast.error(t('Payment failed')); }
  };

  const categoryMap: Record<string, { label: string; icon: JSX.Element; color: string }> = {
    engagement_reward: { label: t('Engagement'), icon: <Heart size={14} />, color: 'text-pink-500' },
    donation: { label: t('Donations'), icon: <DollarSign size={14} />, color: 'text-yellow-500' },
    subscription: { label: t('Subscriptions'), icon: <Star size={14} />, color: 'text-purple-500' },
    purchase: { label: t('Sales'), icon: <ShoppingCart size={14} />, color: 'text-orange-500' },
    ad_reward: { label: t('Ad Rewards'), icon: <Video size={14} />, color: 'text-blue-500' },
    gig_completed: { label: t('Gigs'), icon: <BookOpen size={14} />, color: 'text-green-500' },
  };

  const categoryTotals: CategoryTotal[] = Object.entries(
    transactions.reduce((acc, tx) => { const type = tx.transaction_type; if (!acc[type]) acc[type] = { total: 0, count: 0 }; acc[type].total += tx.amount > 0 ? tx.amount : 0; acc[type].count += 1; return acc; }, {} as Record<string, { total: number; count: number }>)
  ).map(([key, val]) => ({ category: categoryMap[key]?.label || key, total: val.total, count: val.count, icon: categoryMap[key]?.icon || <DollarSign size={14} />, color: categoryMap[key]?.color || 'text-gray-500' }));

  const filteredTransactions = transactions.filter(tx => {
    if (activeTab === 'earnings') return tx.amount > 0;
    if (activeTab === 'spending') return tx.amount < 0;
    return true;
  });

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-green-500" size={40} /></div>;
  if (error) return <div className="p-6 text-center"><AlertCircle className="mx-auto mb-2 text-red-500" size={48} /><p>{error}</p></div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-3xl font-bold gradient-text mb-6 flex items-center gap-2"><WalletIcon /> {t('Wallet')}</h2>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 rounded-2xl mb-6 text-center">
        <p className="text-gray-500 mb-1">{t('Current Balance')}</p>
        <p className="text-5xl font-extrabold text-green-600">${Number(wallet?.balance || 0).toFixed(2)}</p>
        <p className="text-gray-400 mt-1">{t('Total earned')}: <span className="font-semibold">${Number(wallet?.total_earned || 0).toFixed(2)}</span></p>
        <div className="flex gap-2 mt-4">
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleWithdraw} disabled={withdrawing || Number(wallet?.balance || 0) <= 0}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-full font-semibold hover:shadow-lg transition disabled:opacity-50">
            <ArrowDownCircle size={18} /> {withdrawing ? t('Processing...') : t('Withdraw')}
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleTopUp}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-full font-semibold hover:shadow-lg transition">
            <CreditCard size={18} /> {t('Top Up')}
          </motion.button>
        </div>
      </motion.div>

      {categoryTotals.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 rounded-2xl mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp size={18} /> {t('Earnings Breakdown')}</h3>
          <div className="space-y-2">
            {categoryTotals.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className={`flex items-center gap-1 ${cat.color}`}>{cat.icon} {cat.category}</span>
                <span className="font-semibold">${Number(cat.total).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex gap-2 mb-4">
        {['all', 'earnings', 'spending'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${activeTab === tab ? 'bg-green-500 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t(tab.charAt(0).toUpperCase() + tab.slice(1))}
          </button>
        ))}
      </div>

      <h3 className="font-semibold text-xl mb-3">{t('Transaction History')}</h3>
      {filteredTransactions.length === 0 ? (
        <p className="text-gray-500">{t('No transactions yet.')}</p>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((tx, idx) => (
            <motion.div key={tx.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}
              className="glass-card p-3 rounded-xl flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm capitalize">{t(tx.transaction_type.replace(/_/g, ' '))}</p>
                <p className="text-xs text-gray-500">{t(tx.description)}</p>
                <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>{tx.amount >= 0 ? '+' : ''}{Number(tx.amount).toFixed(2)} USD</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}