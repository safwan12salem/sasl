import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Award, TrendingUp, Star, Users, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import DailyChallenge from './DailyChallenge';

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
          { name: 'First Post', icon: '📝', earned: posts.length > 0 },
          { name: '10 Likes', icon: '❤️', earned: totalLikes >= 10 },
          { name: 'Seller', icon: '🛒', earned: user?.is_seller || false },
          { name: 'Streamer', icon: '🎥', earned: user?.is_creator || false },
          { name: 'Teacher', icon: '📚', earned: user?.is_teacher || false },
          { name: '100 XP', icon: '⭐', earned: xp >= 100 },
        ];
        setBadges(earnedBadges);

        // Leaderboard mock
        setLeaderboard([
          { username: 'crypto_queen', xp: 4500 },
          { username: 'mesh_ninja', xp: 3200 },
          { username: user?.username || 'You', xp },
          { username: 'offline_king', xp: 2800 },
        ].sort((a,b) => b.xp - a.xp).slice(0,10));
      } catch (err) {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  const levelProgress = (stats.xp % 100) / 100 * 100;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold gradient-text mb-6 flex items-center gap-2">
        <TrendingUp /> Progress Hub
      </h2>
       <DailyChallenge />
      {/* Stats Card */}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="glass p-6 rounded-2xl mb-6">
        <div className="text-center">
          <p className="text-gray-500">Level {stats.level}</p>
          <div className="w-full bg-gray-200 h-4 rounded-full mt-2">
            <div className="bg-gradient-to-r from-green-400 to-green-600 h-4 rounded-full" style={{width:`${levelProgress}%`}} />
          </div>
          <p className="text-sm mt-1">{stats.xp} XP</p>
        </div>
        <div className="flex justify-around mt-4 text-sm">
          <span>📝 {stats.posts} Posts</span>
          <span>❤️ {stats.likes} Likes</span>
          <span>👥 {user?.followers_count || 0} Followers</span>
        </div>
      </motion.div>

      {/* Badges */}
      <h3 className="font-bold text-xl mb-3 flex items-center gap-2"><Award /> Badges</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {badges.map((b, i) => (
          <motion.div key={i} initial={{ scale:0 }} animate={{ scale:1 }} transition={{ delay:i*0.1 }}
            className={`glass p-3 rounded-xl text-center ${b.earned ? 'opacity-100' : 'opacity-40 grayscale'}`}>
            <span className="text-2xl">{b.icon}</span>
            <p className="text-xs mt-1">{b.name}</p>
          </motion.div>
        ))}
      </div>

      {/* Leaderboard */}
      <h3 className="font-bold text-xl mb-3 flex items-center gap-2"><Users /> Leaderboard</h3>
      <div className="glass rounded-2xl overflow-hidden">
        {leaderboard.map((entry, i) => (
          <div key={i} className={`flex justify-between px-4 py-2 ${entry.username === user?.username ? 'bg-green-50' : ''}`}>
            <span className="font-semibold">{entry.username}</span>
            <span className="text-green-600 font-bold">{entry.xp} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}