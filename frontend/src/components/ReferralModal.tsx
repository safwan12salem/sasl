import React, { useState } from 'react';
import { Copy, Share2, Gift, X } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
interface Props {
  onClose: () => void;
  referralCode: string;
}

export default function ReferralModal({ onClose, referralCode }: Props) {
  const [copied, setCopied] = useState(false);
  const referralLink = `https://sasl.app/join?ref=${referralCode}`;
  const { t } = useTranslation();
  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(t('Link copied!'));
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({
        title: t('Join me on Sasl!'),
        text: t('Join Sasl - the social network that works offline! Use my referral link and we both get $1!'),
        url: referralLink,
      });
    } else {
      copyLink();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-xl flex items-center gap-2">
            <Gift className="text-yellow-500" /> {t('Invite Friends')}
          </h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        
        <p className="text-gray-500 mb-4">
          {t('Share Sasl with friends and you both earn')} <strong>$1.00</strong> {t('when they join!')}
        </p>
        
        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-xl mb-4">
          <p className="text-xs text-gray-500 mb-1">{t('Your referral code')}</p>
          <p className="font-mono font-bold text-lg">{referralCode}</p>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-xl mb-4">
          <p className="text-xs text-gray-500 mb-1">{t('Your referral link')}</p>
          <p className="text-sm truncate">{referralLink}</p>
        </div>
        
        <div className="flex gap-2">
          <button onClick={copyLink} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {copied ? t('Copied!') : <><Copy size={16} /> {t('Copy Link')}</>}
          </button>
          <button onClick={shareLink} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <Share2 size={16} /> {t('Share')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}