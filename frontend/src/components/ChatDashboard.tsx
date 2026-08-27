/**
 * Sasl - Unified Chat Dashboard
 * All chat boards organized by type: Marketplace, Tutoring, Gig, WaveMesh
 */
/* eslint-disable */

import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  MessageCircle, ShoppingBag, GraduationCap, Briefcase, Wifi,
  Loader2, Search, X, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MarketplaceChat from './MarketplaceChat';
import GigChat from './GigChat';
import TutoringChat from './TutoringChat';
import toast from 'react-hot-toast';

interface ChatBoard {
  id: string;
  type: 'marketplace' | 'tutoring' | 'gig' | 'mesh';
  name: string;
  other_user: string;
  other_avatar?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
  context_id?: string;
  context_title?: string;
}

// ============================================================
// DiscoverUsers Component (MUST be before ChatDashboard)
// ============================================================
function DiscoverUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users/suggested/');
        setUsers(res.data?.results || res.data || []);
      } catch {} finally { setLoading(false); }
    };
    fetchUsers();
  }, []);

  const handleFollow = async (username: string) => {
    try {
      await api.post('/users/follow/toggle/', { username });
      toast.success(t('Followed!'));
    } catch {}
  };

  if (loading || users.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="font-bold text-sm mb-3 text-gray-500">{t('Discover People')}</h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {users.slice(0, 10).map((u: any) => (
          <div key={u.username} className="flex-shrink-0 glass p-3 rounded-2xl text-center w-28">
            <div onClick={() => navigate(`/profile/${u.username}`)} className="cursor-pointer">
              {u.avatar_url ? (
                <img src={u.avatar_url.startsWith('http') ? u.avatar_url : `http://localhost:8000${u.avatar_url}`} 
                  className="w-14 h-14 rounded-full object-cover mx-auto mb-2" alt="" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl mx-auto mb-2">
                  {u.username?.[0]?.toUpperCase()}
                </div>
              )}
              <p className="text-xs font-semibold truncate">@{u.username}</p>
            </div>
            <button onClick={() => handleFollow(u.username)} 
              className="mt-2 text-xs bg-green-500 text-white px-3 py-1 rounded-full hover:bg-green-600 transition">
              {t('Follow')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ChatDashboard Component
// ============================================================
export default function ChatDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [chatBoards, setChatBoards] = useState<ChatBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [activeChat, setActiveChat] = useState<{ roomId: string; name: string } | null>(null);

  const fetchChatBoards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/mesh/chat-boards/');
      const boards: ChatBoard[] = [];
      
      if (res.data.marketplace) {
        res.data.marketplace.forEach((chat: any) => {
          boards.push({
            id: `marketplace-${chat.id}`,
            type: 'marketplace',
            name: chat.other_user,
            other_user: chat.other_user,
            context_id: chat.product_id,
            context_title: chat.product_title,
            last_message: chat.last_message,
            last_message_time: chat.last_message_time,
            unread_count: chat.unread_count,
          });
        });
      }
      
      if (res.data.tutoring) {
        res.data.tutoring.forEach((chat: any) => {
          boards.push({
            id: `tutoring-${chat.id}`,
            type: 'tutoring',
            name: chat.other_user,
            other_user: chat.other_user,
            context_id: chat.session_id,
            context_title: chat.subject,
            last_message: chat.last_message,
            last_message_time: chat.last_message_time,
            unread_count: chat.unread_count,
          });
        });
      }
      
      if (res.data.gigs) {
        res.data.gigs.forEach((chat: any) => {
          boards.push({
            id: `gig-${chat.id}`,
            type: 'gig',
            name: chat.other_user,
            other_user: chat.other_user,
            context_id: chat.gig_id,
            context_title: chat.gig_title,
            last_message: chat.last_message,
            last_message_time: chat.last_message_time,
            unread_count: chat.unread_count,
          });
        });
      }
      
      if (res.data.mesh) {
        res.data.mesh.forEach((chat: any) => {
          boards.push({
            id: `mesh-${chat.id}`,
            type: 'mesh',
            name: chat.other_user || chat.room_name,
            other_user: chat.other_user,
            context_id: chat.room_id,
            last_message: chat.last_message,
            last_message_time: chat.last_message_time,
            unread_count: chat.unread_count,
          });
        });
      }
      
      setChatBoards(boards);
    } catch (err) {
      console.log('Chat boards fetch failed - may be offline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChatBoards();
    const interval = setInterval(fetchChatBoards, 10000);
    return () => clearInterval(interval);
  }, [fetchChatBoards]);

  const filteredBoards = chatBoards.filter(board => {
    const matchesSearch = board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (board.context_title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || board.type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'marketplace': return <ShoppingBag size={16} className="text-green-500" />;
      case 'tutoring': return <GraduationCap size={16} className="text-blue-500" />;
      case 'gig': return <Briefcase size={16} className="text-purple-500" />;
      case 'mesh': return <Wifi size={16} className="text-orange-500" />;
      default: return <MessageCircle size={16} className="text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'marketplace': return t('Marketplace');
      case 'tutoring': return t('Tutoring');
      case 'gig': return t('Gig');
      case 'mesh': return t('WaveMesh');
      default: return type;
    }
  };

  const filters = [
    { key: 'all', label: t('All Chats'), count: chatBoards.length },
    { key: 'marketplace', label: t('Marketplace'), count: chatBoards.filter(b => b.type === 'marketplace').length },
    { key: 'tutoring', label: t('Tutoring'), count: chatBoards.filter(b => b.type === 'tutoring').length },
    { key: 'gig', label: t('Gig'), count: chatBoards.filter(b => b.type === 'gig').length },
    { key: 'mesh', label: t('WaveMesh'), count: chatBoards.filter(b => b.type === 'mesh').length },
  ];

  if (activeChat) {
    if (activeChat.roomId.startsWith('marketplace-')) {
      return <MarketplaceChat roomId={activeChat.roomId.replace('marketplace-', '')} onClose={() => setActiveChat(null)} />;
    }
    if (activeChat.roomId.startsWith('gig-')) {
      return <GigChat roomId={activeChat.roomId.replace('gig-', '')} onClose={() => setActiveChat(null)} />;
    }
    if (activeChat.roomId.startsWith('tutoring-')) {
      return <TutoringChat roomId={activeChat.roomId.replace('tutoring-', '')} onClose={() => setActiveChat(null)} />;
    }
        return null;
  } 
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                <h2 className="text-3xl font-bold flex items-center gap-2">
          <MessageCircle className="text-green-500" /> <span className="text-green-500">Mes</span><span className="text-orange-500">sages</span>
        </h2>
        <p className="text-gray-500 text-sm mt-1">{t('All your conversations in one place')}</p>
      </motion.div>

      {/* Discover Users */}
      <DiscoverUsers />

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input-field pl-10" placeholder={t('Search conversations...')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {filters.map(filter => (
          <button key={filter.key} onClick={() => setActiveFilter(filter.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${activeFilter === filter.key ? 'bg-green-500 text-white shadow-lg shadow-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>
            {filter.key !== 'all' && getTypeIcon(filter.key)}
            {filter.label}
            <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{filter.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-green-500" size={48} /></div>
      ) : filteredBoards.length === 0 ? (
        <div className="glass p-12 rounded-2xl text-center">
          <MessageCircle size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-xl text-gray-500">{t('No conversations yet')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('Start chatting from Marketplace, Tutoring, or Gigs!')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredBoards.map((board, idx) => (
            <motion.div key={board.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
              whileHover={{ scale: 1.01 }}
              onClick={() => {
                if (board.type === 'mesh') {
                  setActiveChat({ roomId: `private_${board.context_id || board.id}`, name: board.other_user });
                } else {
                  setActiveChat({ roomId: `${board.type}-${board.context_id || board.id}`, name: board.other_user });
                }
              }}
              className="glass p-4 rounded-2xl cursor-pointer flex items-center gap-4 hover:shadow-lg transition group">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {board.name[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate">{board.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center gap-1">
                    {getTypeIcon(board.type)}{getTypeLabel(board.type)}
                  </span>
                </div>
                {board.context_title && <p className="text-xs text-gray-500 truncate mt-0.5">Re: {board.context_title}</p>}
                {board.last_message && <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">{board.last_message}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                {board.last_message_time && <p className="text-xs text-gray-400">{new Date(board.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                {board.unread_count && board.unread_count > 0 && <span className="inline-block mt-1 bg-green-500 text-white text-xs min-w-[20px] h-5 rounded-full flex items-center justify-center font-bold px-1">{board.unread_count > 99 ? '99+' : board.unread_count}</span>}
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:text-green-500 transition flex-shrink-0" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}