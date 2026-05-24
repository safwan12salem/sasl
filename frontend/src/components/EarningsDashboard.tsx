/**
 * Sasl - User Earnings Dashboard
 * Shows real-time earnings, projections, and breakdown with privacy controls
 */
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  TrendingUp, DollarSign, Target, BarChart3,
  Star, ShoppingCart, Video, BookOpen, Eye,
  Loader2, AlertCircle, Trophy, Shield, Wallet
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface EarningsData {
  total_earned: number;
  total_spent: number;
  breakdown: Record<string, number>;
  projected_monthly: number;
  rank: number;
  percentile: number;
}

interface PrivacySettings {
  show_earnings: boolean;
  show_rank: boolean;
  show_balance: boolean;
  show_transactions: boolean;
}

const categoryIcons: Record<string, JSX.Element> = {
  donation: <Star className="text-yellow-500" size={18} />,
  subscription: <Star className="text-purple-500" size={18} />,
  purchase: <ShoppingCart className="text-orange-500" size={18} />,
  engagement_reward: <BarChart3 className="text-green-500" size={18} />,
  ad_reward: <Eye className="text-blue-500" size={18} />,
  gig_completed: <BookOpen className="text-pink-500" size={18} />,
};

const categoryLabels: Record<string, string> = {
  donation: 'Donations',
  subscription: 'Subscriptions',
  purchase: 'Sales',
  engagement_reward: 'Engagement',
  ad_reward: 'Ad Rewards',
  gig_completed: 'Gigs',
};

export default function EarningsDashboard() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    show_earnings: false,
    show_rank: false,
    show_balance: false,
    show_transactions: false,
  });

  const { t } = useTranslation();

  useEffect(() => {
    // Fetch earnings data and privacy settings
    Promise.all([
      api.get('/monetization/revenue/my_earnings/'),
      api.get('/users/profile/'),
    ])
      .then(([earnRes, profileRes]) => {
        setEarnings(earnRes.data);
        const p = profileRes.data;
        setPrivacySettings({
          show_earnings: p.show_earnings || false,
          show_rank: p.show_rank || false,
          show_balance: p.show_balance || false,
          show_transactions: p.show_transactions || false,
        });
      })
      .catch(() => setError('Failed to load earnings'))
      .finally(() => setLoading(false));
  }, []);

  const togglePrivacy = async (key: keyof PrivacySettings) => {
    const updated = { ...privacySettings, [key]: !privacySettings[key] };
    setPrivacySettings(updated);
    try {
      await api.patch('/users/profile/', { [key]: updated[key] });
      const label = key.replace('show_', '').replace('_', ' ');
      toast.success(t('privacy_updated', { label, status: updated[key] ? 'visible' : 'hidden' }));
    } catch {
      toast.error(t('privacy_update_failed'));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <AlertCircle className="mx-auto mb-2 text-red-500" size={48} />
        <p>{error}</p>
      </div>
    );
  }

  if (!earnings) return null;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold gradient-text mb-6 flex items-center gap-2">
        <DollarSign /> {t('my_earnings')}
      </h2>

      {/* Privacy Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-4 rounded-2xl mb-6"
      >
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Shield size={18} /> {t('privacy_controls')}
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          {t('privacy_controls_description')}
        </p>
        <div className="space-y-2">
          {([
            { key: 'show_earnings' as keyof PrivacySettings, label: t('show_earnings'), icon: <TrendingUp size={16} /> },
            { key: 'show_rank' as keyof PrivacySettings, label: t('show_rank'), icon: <Trophy size={16} /> },
            { key: 'show_balance' as keyof PrivacySettings, label: t('show_balance'), icon: <Wallet size={16} /> },
          ]).map(({ key, label, icon }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b last:border-b-0">
              <span className="flex items-center gap-2 text-sm">
                {icon}
                {label}
              </span>
              <button
                onClick={() => togglePrivacy(key)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  privacySettings[key] ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    privacySettings[key] ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-4 rounded-2xl text-center"
        >
          <p className="text-gray-500 text-sm"> {t('earned_this_month')}</p>
          <p className="text-3xl font-extrabold text-green-600">
            ${earnings.total_earned.toFixed(2)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-4 rounded-2xl text-center"
        >
          <p className="text-gray-500 text-sm"> {t('projected_monthly')}</p>
          <p className="text-3xl font-extrabold text-blue-600">
            ${earnings.projected_monthly.toFixed(2)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass p-4 rounded-2xl text-center"
        >
          <p className="text-gray-500 text-sm flex items-center justify-center gap-1">
            <Trophy size={14} /> {t('rank')}
          </p>
          <p className="text-3xl font-extrabold text-purple-600">
            #{earnings.rank}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass p-4 rounded-2xl text-center"
        >
          <p className="text-gray-500 text-sm"> {t('percentile')}</p>
          <p className="text-3xl font-extrabold text-orange-600">
            {t('top_percentile', { percentile: earnings.percentile })}
          </p>
        </motion.div>
      </div>

      {/* Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass p-6 rounded-2xl mb-6"
      >
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <BarChart3 size={20} /> {t('earnings_breakdown')}
        </h3>
        <div className="space-y-3">
          {Object.entries(earnings.breakdown).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm">
                {categoryIcons[key] || <DollarSign size={18} />}
                {categoryLabels[key] || key}
              </span>
              <span className="font-semibold text-green-600">
                ${Number(value).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* How to Earn More */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass p-6 rounded-2xl"
      >
        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
          <Target size={20} /> {t('how_to_earn_more')}
        </h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>🎥 <strong> {t('stream_regularly')}</strong>–{t('top_streamers_earn', { amount: '$3,200+' })}</p>
          <p>🛍️ <strong> {t('sell_products')}</strong> – {t('average_seller_makes', { amount: '$1,800' })}</p>
          <p>📚 <strong> {t('tutor_students')}</strong> – {t('teachers_earn', { amount: '$4,500+' })}</p>
          <p>💼 <strong> {t('complete_gigs')}</strong> – {t('gig_workers_average', { amount: '$1,200' })}</p>
          <p>👀 <strong> {t('watch_ads_daily')}</strong> – {t('earn_up_to', { amount: '$15' })} {t('month_passively')}</p>
        </div>
      </motion.div>
    </div>
  );
}