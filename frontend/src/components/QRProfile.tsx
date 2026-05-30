import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Share2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function QRProfile({ username }: { username: string }) {
  const profileUrl = `https://sasl.app/profile/${username}`;
  const { t } = useTranslation();

  const downloadQR = () => {
    const canvas = document.getElementById('sasl-qr') as HTMLCanvasElement;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `sasl-${username}.png`;
    a.click();
    toast.success(t('Downloaded!'));
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center p-6">
      <h3 className="font-bold text-xl mb-2 flex items-center justify-center gap-2">
        <Sparkles size={20} className="text-green-500" /> {t('Your QR Profile')}
      </h3>
      <p className="text-sm text-gray-500 mb-4">{t('share_your_profile_instantly')}</p>
      
      <motion.div 
        whileHover={{ scale: 1.02 }}
        className="glass-card p-6 rounded-2xl inline-block shadow-sasl"
      >
        <div className="bg-white p-3 rounded-xl">
          <QRCodeSVG id="sasl-qr" value={profileUrl} size={200} level="H" includeMargin />
        </div>
      </motion.div>
      
      <p className="text-sm text-gray-500 mt-3 font-semibold">@{username}</p>
      
      <div className="flex gap-2 mt-4 justify-center">
        <motion.button whileTap={{ scale: 0.95 }} onClick={downloadQR} className="btn-primary text-sm flex items-center gap-1">
          <Download size={14} /> {t('Save')}
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { navigator.clipboard.writeText(profileUrl); toast.success(t('Link copied!')); }} className="btn-ghost text-sm flex items-center gap-1">
          <Share2 size={14} /> {t('Share')}
        </motion.button>
      </div>
    </motion.div>
  );
}