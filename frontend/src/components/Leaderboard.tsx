/**
 * Sasl - Leaderboard
 * Popularity (always public) + Earnings (opt-in only)
 */
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, TrendingUp, DollarSign, Users, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Leaderboard() {
  const { user } = useAuth();
  const [popularity, setPopularity] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'popularity' | 'earnings'>('popularity');

  useEffect(() => {
    api.get('/users/leaderboard/popularity/').then(res => setPopularity(res.data));
    api.get('/users/leaderboard/earnings/').then(res => setEarnings(res.data));
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold gradient-text mb-6 flex items-center gap-2">
        <Trophy /> Leaderboard
      </h2>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('popularity')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition ${
            activeTab === 'popularity' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Users size={16} /> Popularity
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition ${
            activeTab === 'earnings' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <DollarSign size={16} /> Earnings
        </button>
      </div>

      {/* Popularity Leaderboard */}
      {activeTab === 'popularity' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
            <Shield size={14} /> Public ranking based on followers
          </p>
          {popularity.map((entry, idx) => (
            <motion.div
              key={entry.username}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={`glass p-4 rounded-xl flex items-center gap-4 ${
                entry.username === user?.username ? 'border-2 border-green-400' : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                idx === 0 ? 'bg-yellow-400 text-white' :
                idx === 1 ? 'bg-gray-300 text-white' :
                idx === 2 ? 'bg-orange-400 text-white' :
                'bg-gray-100 text-gray-600'
              }`}>
                {idx + 1}
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold">
                {entry.username[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{entry.display_name || entry.username}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Users size={12} /> {entry.followers_count} followers
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs">
                    Level {entry.level}
                  </span>
                </div>
              </div>
              {entry.is_verified && (
                <span className="text-blue-500 text-xs font-semibold">✓ Verified</span>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Earnings Leaderboard (Opt-in Only) */}
      {activeTab === 'earnings' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
            <Shield size={14} /> Only users who chose to share their earnings appear here
          </p>
          {earnings.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Shield size={48} className="mx-auto mb-2 opacity-50" />
              <p>No one has chosen to share their earnings yet.</p>
              <p className="text-sm mt-1">Enable "Show Earnings" in your profile to appear here!</p>
            </div>
          ) : (
            earnings.map((entry, idx) => (
              <motion.div
                key={entry.username}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`glass p-4 rounded-xl flex items-center gap-4 ${
                  entry.username === user?.username ? 'border-2 border-green-400' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  idx === 0 ? 'bg-yellow-400 text-white' :
                  idx === 1 ? 'bg-gray-300 text-white' :
                  idx === 2 ? 'bg-orange-400 text-white' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {idx + 1}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold">
                  {entry.username[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{entry.display_name || entry.username}</p>
                </div>
                <p className="font-bold text-green-600">${Number(entry.total_earned).toFixed(2)}</p>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}