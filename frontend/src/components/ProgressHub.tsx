import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Award, TrendingUp, Star, Users, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import DailyChallenge from './DailyChallenge';
import { useTranslation } from 'react-i18next';
interface Badge {
  name: string;
  icon: string;
  earned: boolean;
}

interface LeaderboardEntry {
  username: string;
  xp: number;
}

export default function ProgressHub() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ xp: 0, level: 1, posts: 0, likes: 0 });
  const [badges, setBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulate fetching XP data – in real app, aggregate from backend
        const profile = await api.get('/users/profile/');
        const postsRes = await api.get('/content/posts/?author=' + profile.data.username);
        const posts = postsRes.data.results || [];
        const totalLikes = posts.reduce((sum: number, p: any) => sum + p.likes_count, 0);
        const xp = totalLikes * 10 + posts.length * 50;
        const level = Math.floor(xp / 100) + 1;
        setStats({ xp, level, posts: posts.length, likes: totalLikes });

        // Badges
        const earnedBadges: Badge[] = [
          { name: t('First Post'), icon: '📝', earned: posts.length > 0 },
          { name: t('10 Likes'), icon: '❤️', earned: totalLikes >= 10 },
          { name: t('Seller'), icon: '🛒', earned: user?.is_seller || false },
          { name: t('Streamer'), icon: '🎥', earned: user?.is_creator || false },
          { name: t('Teacher'), icon: '📚', earned: user?.is_teacher || false },
          { name: t('100 XP'), icon: '⭐', earned: xp >= 100 },
        ];
        setBadges(earnedBadges);

        // Leaderboard mock
                // Real usernames from followers + current user
        const followersRes = await api.get('/users/profile/').catch(() => ({ data: {} }));
        const followerNames = (followersRes.data?.followers || []).slice(0, 5).map((f: any) => ({
          username: f.username || f,
          xp: Math.floor(Math.random() * 3000) + 500
        }));
        
        const leaderboardData = [
          { username: user?.username || 'You', xp },
          ...followerNames,
          { username: 'sasl_pioneer', xp: 4500 },
          { username: 'wave_runner', xp: 3200 },
          { username: 'mesh_explorer', xp: 2800 },
        ].sort((a, b) => b.xp - a.xp).slice(0, 10);
        
        // Clean underscores from usernames
        const cleaned = leaderboardData.map(entry => ({
          ...entry,
          username: entry.username.replace(/_/g, ' ')
        }));
        
        setLeaderboard(cleaned);
      } catch (err) {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  
    if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin text-green-500" size={48} />
    </div>
  );

  const levelProgress = (stats.xp % 100) / 100 * 100;
  const isCurrentUser = (username: string) => username === user?.username;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent flex items-center gap-2">
          <TrendingUp size={32} className="text-green-500" /> {t('Progress Hub')}
        </h2>
        <p className="text-gray-500 mt-1">{t('Track your journey and earn rewards')}</p>
      </motion.div>

      <DailyChallenge />

      {/* Level Card — Hero Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900 p-8 mb-8 text-white shadow-2xl shadow-green-500/20"
      >
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-400 rounded-full blur-3xl opacity-20" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-300 rounded-full blur-3xl opacity-10" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-green-300 text-sm font-medium uppercase tracking-wider">{t('Level')} {stats.level}</p>
              <h3 className="text-4xl font-black mt-1">{stats.xp.toLocaleString()} <span className="text-xl font-normal text-green-300">XP</span></h3>
            </div>
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="w-20 h-20 rounded-full border-4 border-green-400/30 border-t-green-400 flex items-center justify-center"
            >
              <Star size={32} className="text-yellow-400" fill="currentColor" />
            </motion.div>
          </div>
          
          {/* XP Progress Bar */}
          <div className="relative">
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 rounded-full shadow-lg shadow-green-400/50"
              />
            </div>
            <p className="text-right text-green-300 text-xs mt-1">{Math.round(levelProgress)}% {t('to next level')}</p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
            {[
              { icon: '📝', label: t('Posts'), value: stats.posts },
              { icon: '❤️', label: t('Likes'), value: stats.likes },
              { icon: '👥', label: t('Followers'), value: user?.followers_count || 0 },
            ].map((stat, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.3 + i * 0.1 }}
                className="text-center"
              >
                <span className="text-2xl">{stat.icon}</span>
                <p className="text-2xl font-black">{stat.value.toLocaleString()}</p>
                <p className="text-green-300 text-xs">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Badges — Glass Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
          <Award size={22} className="text-yellow-500" /> {t('Badges')}
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {badges.map((b, i) => (
            <motion.div 
              key={i} 
              initial={{ scale: 0, rotate: -10 }} 
              animate={{ scale: 1, rotate: 0 }} 
              transition={{ delay: 0.3 + i * 0.08, type: 'spring' }}
              whileHover={{ y: -4, scale: 1.05 }}
              className={`relative p-4 rounded-2xl text-center transition-all ${
                b.earned 
                  ? 'bg-white dark:bg-gray-800 shadow-lg border border-green-100 dark:border-green-900/30' 
                  : 'bg-gray-50 dark:bg-gray-900 opacity-40 grayscale'
              }`}
            >
              <motion.span 
                animate={b.earned ? { scale: [1, 1.2, 1] } : {}} 
                transition={{ duration: 2, repeat: Infinity }}
                className="text-3xl block mb-1"
              >
                {b.icon}
              </motion.span>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{b.name}</p>
              {b.earned && (
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                >
                  <span className="text-white text-[10px]">✓</span>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Leaderboard — Viral Ranking */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.3 }}
      >
        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
          <Users size={22} className="text-purple-500" /> {t('Leaderboard')}
        </h3>
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
          {leaderboard.map((entry, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: 0.4 + i * 0.05 }}
              whileHover={{ scale: 1.01 }}
              className={`flex items-center justify-between px-5 py-4 transition ${
                isCurrentUser(entry.username) 
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-l-4 border-green-500' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 border-transparent'
              } ${i < leaderboard.length - 1 ? 'border-b border-gray-100 dark:border-gray-700/50' : ''}`}
            >
              <div className="flex items-center gap-4">
                {/* Rank Badge */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${
                  i === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-400/30' :
                  i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-lg shadow-gray-400/20' :
                  i === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white shadow-lg shadow-amber-600/20' :
                  'bg-gray-100 dark:bg-gray-700 text-gray-500'
                }`}>
                  {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                </div>
                
                {/* Avatar & Name */}
                <div>
                  <p className={`font-bold ${isCurrentUser(entry.username) ? 'text-green-600' : 'text-gray-800 dark:text-gray-200'}`}>
                    @{entry.username}
                    {isCurrentUser(entry.username) && (
                      <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">{t('You')}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">{t('Rank')} #{i + 1}</p>
                </div>
              </div>
              
              {/* XP Score */}
              <div className="text-right">
                <p className="text-lg font-black text-green-600">{entry.xp.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{t('XP')}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}