import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Award, TrendingUp, Star, Users, Loader2, Zap, Flame, 
  Target, Trophy, Crown, Rocket, Heart, MessageCircle, Video,
  Briefcase, BookOpen, ShoppingCart, Sparkles, CheckCircle2, Clock,
  Radio, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';

interface SkillXP {
  social: number;
  streaming: number;
  marketplace: number;
  tutoring: number;
  gigs: number;
  snap: number;
  liveAudio: number;
  reels: number;
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  earned: boolean;
  progress: number;
  target: number;
}

export default function ProgressHub() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [xpToNext, setXpToNext] = useState(100);
  const [skillXP, setSkillXP] = useState<SkillXP>({ social: 0, streaming: 0, marketplace: 0, tutoring: 0, gigs: 0, snap: 0, liveAudio: 0, reels: 0 });
  const [badges, setBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);

  const calculateXP = async () => {
    try {
      // Social
      const profile = await api.get('/users/profile/');
      const postsRes = await api.get(`/content/posts/?author=${profile.data.username}`);
      const posts = postsRes.data.results || [];
      const totalLikes = posts.reduce((sum: number, p: any) => sum + (p.likes_count || 0), 0);
      const totalComments = posts.reduce((sum: number, p: any) => sum + (p.comments_count || 0), 0);
      const socialXP = totalLikes * 10 + totalComments * 5 + posts.length * 50;

      // Streaming
      let streamingXP = 0;
      try {
        const streamsRes = await api.get('/streaming/streams/?streamer=' + profile.data.username);
        const streams = streamsRes.data.results || [];
        const totalDonations = streams.reduce((sum: number, s: any) => sum + (s.total_donations || 0), 0);
        const totalViewers = streams.reduce((sum: number, s: any) => sum + (s.max_viewers || 0), 0);
        streamingXP = totalDonations * 20 + totalViewers * 2 + streams.length * 100;
      } catch {}

      // Marketplace
      let marketplaceXP = 0;
      try {
        if (user?.is_seller) {
          const productsRes = await api.get('/marketplace/products/?seller=me');
          const products = productsRes.data.results || [];
          marketplaceXP = products.length * 75;
        }
      } catch {}

      // Tutoring
      let tutoringXP = 0;
      try {
        if (user?.is_teacher) {
          const sessionsRes = await api.get('/tutoring/sessions/?tutor=me');
          const sessions = sessionsRes.data.results || [];
          tutoringXP = sessions.length * 80;
        }
      } catch {}

      // Gigs
      let gigsXP = 0;
      try {
        const gigsRes = await api.get('/gigs/gigs/?creator=me');
        const gigs = gigsRes.data.results || [];
        gigsXP = gigs.length * 60;
      } catch {}
            // Snap XP
      let snapXP = 0;
      try {
        const snapsRes = await api.get('/snaps/snaps/inbox/');
        const snaps = snapsRes.data || [];
        snapXP = snaps.length * 30;
      } catch {}

      // LiveAudio XP
      let liveAudioXP = 0;
      try {
        const roomsRes = await api.get('/liveaudio/rooms/my_rooms/');
        const rooms = roomsRes.data || [];
        liveAudioXP = rooms.length * 40;
      } catch {}

      // Reels XP
      let reelsXP = 0;
      try {
        const reelsRes = await api.get('/content/reels/');
        const reels = reelsRes.data.results || reelsRes.data || [];
        reelsXP = reels.length * 70;
      } catch {}

      const totalXP = socialXP + streamingXP + marketplaceXP + tutoringXP + gigsXP+ snapXP + liveAudioXP + reelsXP;;
      const calculatedLevel = Math.floor(totalXP / 100) + 1;
      const nextThreshold = calculatedLevel * 100;

      setXp(totalXP);
      setLevel(calculatedLevel);
      setXpToNext(nextThreshold);
      setSkillXP({ social: socialXP, streaming: streamingXP, marketplace: marketplaceXP, tutoring: tutoringXP, gigs: gigsXP, snap: snapXP, liveAudio: liveAudioXP, reels: reelsXP  });

      // Build badges with progress
      const badgeList: Badge[] = [
        { id: 'first_post', name: t('First Post'), icon: '📝', earned: posts.length > 0, progress: posts.length, target: 1 },
        { id: '10_posts', name: t('Content Creator'), icon: '✍️', earned: posts.length >= 10, progress: Math.min(posts.length, 10), target: 10 },
        { id: '100_likes', name: t('Loved'), icon: '❤️', earned: totalLikes >= 100, progress: Math.min(totalLikes, 100), target: 100 },
        { id: 'streamer', name: t('Live Streamer'), icon: '🎥', earned: user?.is_creator || false, progress: user?.is_creator ? 1 : 0, target: 1 },
        { id: 'seller', name: t('Seller'), icon: '🛒', earned: user?.is_seller || false, progress: user?.is_seller ? 1 : 0, target: 1 },
        { id: 'teacher', name: t('Teacher'), icon: '📚', earned: user?.is_teacher || false, progress: user?.is_teacher ? 1 : 0, target: 1 },
        { id: '100xp', name: t('Rising Star'), icon: '⭐', earned: totalXP >= 100, progress: Math.min(totalXP, 100), target: 100 },
        { id: '500xp', name: t('Pro'), icon: '💎', earned: totalXP >= 500, progress: Math.min(totalXP, 500), target: 500 },
        { id: '1000xp', name: t('Elite'), icon: '👑', earned: totalXP >= 1000, progress: Math.min(totalXP, 1000), target: 1000 },
        { id: 'gig_creator', name: t('Gig Creator'), icon: '💼', earned: gigsXP > 0, progress: Math.min(gigsXP / 60, 1), target: 1 },
        { id: 'donor', name: t('Donor'), icon: '🎁', earned: streamingXP > 0, progress: Math.min(streamingXP / 20, 1), target: 1 },
        { id: 'commenter', name: t('Engager'), icon: '💬', earned: totalComments >= 10, progress: Math.min(totalComments, 10), target: 10 },
      ];
      setBadges(badgeList);

      setLoading(false);
    } catch (err) {
      console.error('Failed to load progress:', err);
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get('/users/leaderboard/');
      setLeaderboard(res.data || []);
    } catch {
      setLeaderboard([
        { username: user?.username || 'You', xp: Math.floor(xp), level },
        { username: 'SaslKing', xp: 2450, level: 25 },
        { username: 'MegaStreamer', xp: 1830, level: 19 },
        { username: 'TopSeller', xp: 1200, level: 13 },
        { username: 'EduGuru', xp: 980, level: 10 },
      ]);
    }
  };

  useEffect(() => {
    calculateXP();
    fetchLeaderboard();
  }, []);

  const fireConfetti = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  const xpPercent = ((xp % 100) / 100) * 100;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-purple-500" size={48} />
      </div>
    );
  }

  const skills = [
    { name: t('Social'), icon: <Heart size={20} className="text-pink-500" />, xp: skillXP.social, color: 'from-pink-500 to-rose-500' },
    { name: t('Streaming'), icon: <Video size={20} className="text-red-500" />, xp: skillXP.streaming, color: 'from-red-500 to-orange-500' },
    { name: t('Marketplace'), icon: <ShoppingCart size={20} className="text-green-500" />, xp: skillXP.marketplace, color: 'from-green-500 to-emerald-500' },
    { name: t('Tutoring'), icon: <BookOpen size={20} className="text-blue-500" />, xp: skillXP.tutoring, color: 'from-blue-500 to-indigo-500' },
    { name: t('Gigs'), icon: <Briefcase size={20} className="text-purple-500" />, xp: skillXP.gigs, color: 'from-purple-500 to-violet-500' },
    { name: t('Snap'), icon: <Zap size={20} className="text-yellow-500" />, xp: skillXP.snap, color: 'from-yellow-500 to-amber-500' },
    { name: t('Live Audio'), icon: <Radio size={20} className="text-cyan-500" />, xp: skillXP.liveAudio, color: 'from-cyan-500 to-teal-500' },
    { name: t('Reels'), icon: <Play size={20} className="text-orange-500" />, xp: skillXP.reels, color: 'from-orange-500 to-red-500' },
  ];

  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Level Up Celebration */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowLevelUp(false)}>
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="text-center" onClick={e => e.stopPropagation()}>
              <motion.div animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}
                className="text-8xl mb-4">🏆</motion.div>
              <h2 className="text-4xl font-bold text-white mb-2">LEVEL {newLevel}!</h2>
              <p className="text-gray-300">You're unstoppable! Keep going!</p>
              <button onClick={() => { setShowLevelUp(false); fireConfetti(); }} className="mt-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-full font-bold text-lg hover:shadow-xl hover:shadow-purple-500/30 transition">
                🎉 Celebrate!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main XP Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-3xl p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-12 -mb-12" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Trophy size={32} className="text-yellow-300" />
              </div>
              <div>
                <p className="text-sm opacity-80">{t('Level')}</p>
                <p className="text-4xl font-bold">{level}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">{t('Total XP')}</p>
              <p className="text-3xl font-bold">{xp.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white/20 rounded-full h-4 overflow-hidden mb-2">
            <motion.div initial={{ width: 0 }} animate={{ width: `${xpPercent}%` }} transition={{ duration: 1.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-yellow-300 to-green-400 rounded-full" />
          </div>
          <div className="flex justify-between text-xs opacity-80">
            <span>{xp % 100} XP</span>
            <span>{xpToNext} XP to Level {level + 1}</span>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Star size={24} className="text-yellow-500" />, label: t('Badges Earned'), value: `${earnedCount}/${badges.length}`, bg: 'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20' },
          { icon: <Zap size={24} className="text-purple-500" />, label: t('Total XP'), value: xp.toLocaleString(), bg: 'from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20' },
          { icon: <Flame size={24} className="text-orange-500" />, label: t('Skills Active'), value: skills.filter(s => s.xp > 0).length, bg: 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20' },
          { icon: <TrendingUp size={24} className="text-green-500" />, label: t('Leaderboard Rank'), value: `#${leaderboard.findIndex(e => e.username === user?.username) + 1 || 1}`, bg: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
            className={`bg-gradient-to-br ${stat.bg} rounded-2xl p-4 border border-white/50 shadow-sm hover:shadow-md transition`}>
            <div className="flex items-center gap-3">
              {stat.icon}
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Skill XP Bars */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Rocket size={20} className="text-purple-500" /> {t('Skill Breakdown')}
        </h3>
        <div className="space-y-4">
          {skills.map((skill, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {skill.icon}
                  <span className="text-sm font-semibold">{skill.name}</span>
                </div>
                <span className="text-xs font-bold text-gray-500">{skill.xp} XP</span>
              </div>
              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((skill.xp / 500) * 100, 100)}%` }} transition={{ duration: 1, delay: i * 0.15 }}
                  className={`h-full bg-gradient-to-r ${skill.color} rounded-full`} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Badges Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Award size={20} className="text-yellow-500" /> {t('Achievements')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {badges.map((badge, i) => (
            <motion.div key={badge.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
              className={`rounded-xl p-4 text-center border-2 transition ${badge.earned ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-200 dark:border-gray-700 opacity-50'}`}>
              <div className="text-3xl mb-2">{badge.icon}</div>
              <p className="text-xs font-semibold">{badge.name}</p>
              {badge.earned ? (
                <CheckCircle2 size={16} className="mx-auto mt-1 text-green-500" />
              ) : (
                <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${(badge.progress / badge.target) * 100}%` }} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Crown size={20} className="text-purple-500" /> {t('Leaderboard')}
        </h3>
        <div className="space-y-2">
          {leaderboard.map((entry, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              className={`flex items-center gap-3 p-3 rounded-xl ${entry.username === user?.username ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700' : ''}`}>
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {i + 1}
              </span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                {entry.username?.[0]?.toUpperCase() || '?'}
              </div>
              <span className="flex-1 font-semibold text-sm truncate">{entry.username}</span>
              <span className="text-xs font-bold text-purple-500 flex items-center gap-1">
                <Zap size={12} /> {entry.xp?.toLocaleString() || 0} XP
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}