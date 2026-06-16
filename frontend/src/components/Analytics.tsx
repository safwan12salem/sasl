/**
 * Sasl - Advanced Analytics Dashboard (Fixed)
 */
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  TrendingUp, Users, DollarSign, Eye, Heart, MessageCircle,
  Download, Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';


interface AnalyticsData {
  userGrowth: { date: string; count: number }[];
  revenue: { date: string; amount: number }[];
  engagement: {
    totalLikes: number;
    totalComments: number;
    totalPosts: number;
  };
  topPosts: { id: string; text: string; like_count: number; likes_count: number; comments_count: number }[];
}

export default function Analytics() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const { t } = useTranslation();
  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/analytics/dashboard/?range=${dateRange}`);
      setData(res.data);
    } catch (err) {
      setError('Failed to load analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const exportCSV = () => {
    if (!data) return;
    let csv = 'Date,Revenue,New Users\n';
    const safeRevenue = data.revenue || [];
    const safeGrowth = data.userGrowth || [];
    const maxLen = Math.max(safeRevenue.length, safeGrowth.length);
    for (let i = 0; i < maxLen; i++) {
      const r = safeRevenue[i] || { date: '', amount: 0 };
      const g = safeGrowth[i] || { count: 0 };
      csv += `${r.date},${r.amount},${g.count}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sasl-analytics.csv';
    a.click();
    toast.success('Report downloaded!');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-green-500" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="text-red-500 mb-4" size={64} />
        <p className="text-lg text-gray-600 mb-4">{error}</p>
        <button onClick={fetchAnalytics} className="btn-primary flex items-center gap-2">
          <RefreshCw size={16} /> Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const safeRevenue = data.revenue || [];
  const safeGrowth = data.userGrowth || [];
  const safeEngagement = data.engagement || { totalLikes: 0, totalComments: 0, totalPosts: 0 };
  const safeTopPosts = data.topPosts || [];

  const maxRevenue = Math.max(...safeRevenue.map(d => d.amount), 1);
  const totalUsers = safeGrowth.reduce((sum, d) => sum + d.count, 0);
  const totalRevenue = safeRevenue.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold gradient-text flex items-center gap-2">
          <TrendingUp /> {t('analytics_dashboard')}
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-full p-1">
            {[
              { key: '7d' as const, label: '7 Days' },
              { key: '30d' as const, label: '30 Days' },
              { key: '90d' as const, label: '90 Days' },
            ].map(range => (
              <button
                key={range.key}
                onClick={() => setDateRange(range.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                  dateRange === range.key ? 'bg-green-500 text-white' : 'hover:bg-gray-200'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <button onClick={exportCSV} className="btn-ghost flex items-center gap-1 text-sm">
            <Download size={16} /> {t('export')}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: totalUsers.toLocaleString(), icon: <Users />, color: 'text-blue-500' },
          { label: 'Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: <DollarSign />, color: 'text-green-500' },
          { label: 'Total Likes', value: safeEngagement.totalLikes.toLocaleString(), icon: <Heart />, color: 'text-red-500' },
          { label: 'Total Posts', value: safeEngagement.totalPosts.toLocaleString(), icon: <Eye />, color: 'text-purple-500' },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-5 rounded-2xl"
          >
            <div className={`text-2xl mb-1 ${kpi.color}`}>{kpi.icon}</div>
            <p className="text-2xl font-extrabold">{kpi.value}</p>
            <p className="text-xs text-gray-500">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass p-6 rounded-2xl mb-6"
      >
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <DollarSign size={18} /> {t('revenue_trend')}
        </h3>
        <div className="flex items-end gap-1 h-40">
          {safeRevenue.map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-gradient-to-t from-green-400 to-green-300 rounded-t"
                style={{
                  height: `${(item.amount / maxRevenue) * 100}%`,
                  minHeight: '4px'
                }}
              />
              <span className="text-[10px] text-gray-400 rotate-45 origin-left whitespace-nowrap">
                {item.date.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Engagement & Top Posts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass p-6 rounded-2xl"
        >
          <h3 className="font-bold text-lg mb-4">{t('top_posts')}</h3>
          <div className="space-y-3">
            {safeTopPosts.map((post, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="truncate flex-1">{(post.text || '').slice(0, 50)}...</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><Heart size={12} /> {post.like_count || post.likes_count || 0}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={12} /> {post.comments_count || 0}</span>
                </div>
              </div>
            ))}
            {safeTopPosts.length === 0 && (
              <p className="text-gray-400 text-sm">{t('no_posts_data_yet')}</p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass p-6 rounded-2xl"
        >
          <h3 className="font-bold text-lg mb-4">{t('user_growth')}</h3>
          <div className="space-y-3">
            {safeGrowth.slice(-10).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{item.date}</span>
                <span className="font-semibold">+{item.count} {t('users')}</span>
              </div>
            ))}
            {safeGrowth.length === 0 && (
              <p className="text-gray-400 text-sm">{t('no_growth_data_yet')}</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}