import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { ExternalLink, X, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdData {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  link: string;
  cpc: number | string;
}

export default function NativeAd() {
  const { user } = useAuth();
  const [ad, setAd] = useState<AdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rewarded, setRewarded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Safe CPC formatter
  const formatCPC = (cpc: number | string | undefined | null): string => {
    const num = Number(cpc);
    if (isNaN(num)) return '0.0000';
    return num.toFixed(4);
  };

  useEffect(() => {
    if (!user) return;
    api.get('/monetization/ads/serve_ad/')
      .then(res => {
        if (res.data.ad_available && res.data.ad) {
          const adData = { ...res.data.ad };
          setAd(adData);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const claimReward = async () => {
    if (!ad || rewarded) return;
    try {
      await api.post('/monetization/ads/reward_view/', { campaign_id: ad.id });
      setRewarded(true);
      toast.success(`+$${formatCPC(ad.cpc)} earned!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Reward failed');
    }
  };

  if (loading || !ad || dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-4"
    >
      <div className="relative bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border border-blue-100 rounded-2xl p-4 shadow-sm">
        <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wider text-gray-400 font-bold bg-white/80 px-2 py-0.5 rounded-full">
          Sponsored
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 bg-white/80 rounded-full p-1"
        >
          <X size={14} />
        </button>

        <div className="flex items-start gap-3 mt-4">
          {ad.image_url && (
            <img
              src={ad.image_url}
              alt={ad.title}
              className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-gray-800 mb-1">{ad.title}</h4>
            <p className="text-xs text-gray-500 line-clamp-2">{ad.content}</p>

            <div className="flex items-center gap-2 mt-3">
              <a
                href={ad.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={claimReward}
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-blue-700 transition"
              >
                <ExternalLink size={12} /> Learn More
              </a>
              <button
                onClick={claimReward}
                disabled={rewarded}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  rewarded
                    ? 'bg-gray-100 text-gray-400 cursor-default'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                }`}
              >
                {rewarded ? (
                  <>✓ Rewarded</>
                ) : (
                  <><Eye size={12} /> Earn ${formatCPC(ad.cpc)}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}