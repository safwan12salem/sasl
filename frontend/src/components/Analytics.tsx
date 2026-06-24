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
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Loader2 className="text-green-500" size={48} />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <AlertCircle className="text-red-400 mb-4" size={64} />
        </motion.div>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">{error}</p>
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
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-500 to-teal-500 bg-clip-text text-transparent flex items-center gap-2">
            <TrendingUp size={32} className="text-blue-500" /> {t('analytics_dashboard')}
          </h2>
          <p className="text-gray-500 mt-1">{t('Deep insights into your growth')}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Pills */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
            {[
              { key: '7d' as const, label: '7D' },
              { key: '30d' as const, label: '30D' },
              { key: '90d' as const, label: '90D' },
            ].map(range => (
              <motion.button
                key={range.key}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDateRange(range.key)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  dateRange === range.key 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25' 
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {range.label}
              </motion.button>
            ))}
          </div>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={exportCSV} 
            className="btn-ghost flex items-center gap-1 text-sm font-medium"
          >
            <Download size={16} /> {t('export')}
          </motion.button>
        </div>
      </motion.div>

      {/* KPI Cards — Animated Glass Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: t('Total Users'), value: totalUsers.toLocaleString(), icon: <Users size={28} />, color: 'from-blue-500 to-cyan-500', bgGlow: 'bg-blue-400', textColor: 'text-blue-500', trend: '+12%' },
          { label: t('Revenue'), value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: <DollarSign size={28} />, color: 'from-green-500 to-emerald-500', bgGlow: 'bg-green-400', textColor: 'text-green-500', trend: '+8%' },
          { label: t('Total Likes'), value: safeEngagement.totalLikes.toLocaleString(), icon: <Heart size={28} />, color: 'from-red-500 to-pink-500', bgGlow: 'bg-red-400', textColor: 'text-red-500', trend: '+24%' },
          { label: t('Total Posts'), value: safeEngagement.totalPosts.toLocaleString(), icon: <Eye size={28} />, color: 'from-purple-500 to-violet-500', bgGlow: 'bg-purple-400', textColor: 'text-purple-500', trend: '+5%' },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, type: 'spring' }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="relative overflow-hidden bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 group"
          >
            {/* Background glow on hover */}
            <div className={`absolute -top-6 -right-6 w-20 h-20 ${kpi.bgGlow} rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity`} />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${kpi.color} bg-opacity-10`}>
                  <span className={kpi.textColor}>{kpi.icon}</span>
                </div>
                <span className="text-xs font-bold text-green-500 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                  {kpi.trend}
                </span>
              </div>
              <p className="text-3xl font-black text-gray-900 dark:text-white">{kpi.value}</p>
              <p className="text-sm text-gray-500 mt-1">{kpi.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart — Glass Card with animated bars */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 mb-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30">
              <DollarSign size={18} className="text-green-600" />
            </div>
            {t('revenue_trend')}
          </h3>
          <span className="text-sm text-gray-400">{t('Total')}: <span className="font-bold text-green-600">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
        </div>
        
        {/* Chart */}
      <div className="flex items-end gap-1.5 h-48 px-2 overflow-x-auto">
          {safeRevenue.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              {t('no_revenue_data_yet')}
            </div>
          ) : (
            safeRevenue.slice(-30).map((item, i) => (
              <motion.div 
                key={i} 
                initial={{ height: 0 }}
                animate={{ height: `${(item.amount / maxRevenue) * 100}%` }}
                transition={{ delay: 0.5 + i * 0.02, duration: 0.8, ease: 'easeOut' }}
                className="flex-1 flex flex-col items-center gap-1 group cursor-pointer min-w-[8px]"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="w-full bg-gradient-to-t from-green-400 via-green-500 to-emerald-400 rounded-t-lg relative shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-shadow"
                  style={{ height: `${(item.amount / maxRevenue) * 100}%`, minHeight: '4px' }}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    ${item.amount.toFixed(2)}
                  </div>
                </motion.div>
                {safeRevenue.length <= 15 && (
                  <span className="text-[9px] text-gray-400 rotate-45 origin-left whitespace-nowrap mt-1">
                    {item.date.slice(5)}
                  </span>
                )}
              </motion.div>
            ))
          )}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-3 h-3 rounded bg-green-400" /> {t('Revenue')}
          </div>
          <div className="text-xs text-gray-400">
            {dateRange === '7d' ? t('Last 7 days') : dateRange === '30d' ? t('Last 30 days') : t('Last 90 days')}
          </div>
        </div>
      </motion.div>

      {/* Engagement & Top Posts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Posts */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ y: -3 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700"
        >
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
              <Heart size={18} className="text-red-500" />
            </div>
            {t('top_posts')}
          </h3>
          <div className="space-y-3">
            {safeTopPosts.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">{t('no_posts_data_yet')}</p>
            ) : (
              safeTopPosts.map((post, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                  whileHover={{ x: 4 }}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                      i === 0 ? 'bg-yellow-100 text-yellow-700' :
                      i === 1 ? 'bg-gray-100 text-gray-600' :
                      i === 2 ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-50 text-gray-400'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                      {(post.text || '').slice(0, 60)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 ml-4">
                    <span className="flex items-center gap-1 group-hover:text-red-500 transition">
                      <Heart size={12} /> {post.like_count || post.likes_count || 0}
                    </span>
                    <span className="flex items-center gap-1 group-hover:text-blue-500 transition">
                      <MessageCircle size={12} /> {post.comments_count || 0}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* User Growth */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ y: -3 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700"
        >
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Users size={18} className="text-blue-500" />
            </div>
            {t('user_growth')}
          </h3>
          <div className="space-y-2">
            {safeGrowth.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">{t('no_growth_data_yet')}</p>
            ) : (
              safeGrowth.slice(-12).reverse().map((item, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                  whileHover={{ x: -4 }}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.date}</span>
                  <span className="flex items-center gap-1 font-bold text-green-600">
                    <TrendingUp size={14} /> +{item.count}
                  </span>
                </motion.div>
              ))
            )}
          </div>
          
          {/* Total Users Summary */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{t('Total Users')}</span>
              <span className="text-2xl font-black bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                {totalUsers.toLocaleString()}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}