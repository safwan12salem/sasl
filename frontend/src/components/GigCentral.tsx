/**
 * Sasl Gig Central — VIRAL EDITION
 * Modern freelancer marketplace with elegant card UI, milestones, reviews, disputes, portfolio
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Briefcase, PlusCircle, Loader2, UserCheck, CheckCircle, Star,
  AlertCircle, DollarSign, MessageCircle, Calendar, FileText,
  Search, Filter, Clock, Award, Shield, Zap, TrendingUp,
  ChevronDown, ChevronUp, X, Image as ImageIcon, Link, Upload,
  ThumbsUp, Flag, Users, Target, BarChart3, Eye, Send, MapPin, Verified, Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GigChat from './GigChat';
import { useTranslation } from 'react-i18next';
import PaymentModal from './PaymentModal';
import AdBanner from './AdBanner';
import { db } from '../services/offlineDB';
import { cacheFeatureData, loadCachedFeature, getPendingActions, clearOfflineAction, queueOfflineAction } from '../services/offlineDB';

import CountryFilter from './CountryFilter';


interface Gig {
  id: string;
  creator_name: string;
  creator_avatar?: string;
  title: string;
  description: string;
  budget: string;
  status: string;
  category?: string;
  taker_name?: string;
  taker_avatar?: string;
  milestones?: Milestone[];
  reviews?: Review[];
  average_rating?: number;
  likes?: number;
  review_count?: number;
  created_at: string;
  deadline?: string;
  applicants_count?: number;
  proposal_message?: string;
  proposed_budget?: string;
  proposals?: any[];
  views?: number;
}

interface Milestone {
  id: string;
  title: string;
  amount: string;
  completed: boolean;
  completed_at?: string;
}

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface SkillBadge {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'expert';
  endorsements: number;
}

interface Portfolio {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  link?: string;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: JSX.Element; label: string }> = {
  open: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', icon: <Target size={12} />, label: 'Open' },
  in_progress: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', icon: <Clock size={12} />, label: 'In Progress' },
  completed: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', icon: <CheckCircle size={12} />, label: 'Completed' },
  disputed: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800', icon: <Flag size={12} />, label: 'Disputed' },
  cancelled: { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700', icon: <X size={12} />, label: 'Cancelled' },
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  design: 'from-pink-500 to-rose-500',
  development: 'from-blue-500 to-indigo-500',
  writing: 'from-violet-500 to-purple-500',
  marketing: 'from-orange-500 to-red-500',
  video: 'from-teal-500 to-cyan-500',
  music: 'from-yellow-500 to-amber-500',
  business: 'from-emerald-500 to-green-500',
  other: 'from-gray-500 to-slate-500',
};

export default function GigCentral() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'open' | 'in_progress' | 'completed' | 'mine' | 'workers'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedGig, setExpandedGig] = useState<string | null>(null);
  const [chatRoom, setChatRoom] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  const [newTitle, setNewTitle] = useState('');
  
  const [countryFilter, setCountryFilter] = useState('default');
  const [newDesc, setNewDesc] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [newCategory, setNewCategory] = useState('design');
  const [newDeadline, setNewDeadline] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [milestones, setMilestones] = useState<{ title: string; amount: string }[]>([{ title: '', amount: '' }]);

  const [showReview, setShowReview] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const [showDispute, setShowDispute] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');

  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [pfTitle, setPfTitle] = useState('');
  const [pfDesc, setPfDesc] = useState('');
  const [pfLink, setPfLink] = useState('');
  const [pfImage, setPfImage] = useState<File | null>(null);

  const [skillBadges, setSkillBadges] = useState<SkillBadge[]>([]);
  const [showBadges, setShowBadges] = useState(false);

  const [stats, setStats] = useState({ totalGigs: 0, completedGigs: 0, totalEarned: '0', avgRating: 0 });

  const [negotiateGig, setNegotiateGig] = useState<string | null>(null);
  const [proposalMessage, setProposalMessage] = useState('');
  const [proposalBudget, setProposalBudget] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [likedGigs, setLikedGigs] = useState<Set<string>>(new Set());
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  
  const fetchGigs = useCallback(async () => {


        if (!navigator.onLine) {
      const cached = await loadCachedFeature('gigs');
      if (cached) { setGigs(cached); return; }
    }

    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'mine') params.set('status', activeTab);
      if (activeTab === 'mine') params.set('mine', 'true');
      if (searchQuery) params.set('search', searchQuery);
      if (countryFilter !== 'default') params.set('country', countryFilter);
      const res = await api.get(`/gigs/gigs/?${params.toString()}`);
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setGigs(data);
            await cacheFeatureData('gigs', res.data.results || res.data || []);
      const completed = data.filter((g: Gig) => g.status === 'completed');
      setStats({
        totalGigs: data.length,
        completedGigs: completed.length,
        totalEarned: completed.reduce((sum: number, g: Gig) => sum + parseFloat(g.budget || '0'), 0).toFixed(2),
        avgRating: completed.length > 0 ? completed.reduce((sum: number, g: Gig) => sum + (g.average_rating || 0), 0) / completed.length : 0,
      });
    } catch (err) { setError(t('Could not load gigs.')); }
    finally { setLoading(false); }
  }, [activeTab, searchQuery]);

  useEffect(() => { fetchGigs(); }, [fetchGigs]);
  useEffect(() => { if (activeTab === 'workers') fetchWorkers(); }, [activeTab]);


  const fetchPortfolio = async () => { try { const res = await api.get('/gigs/gigs/portfolio/'); setPortfolio(res.data || []); } catch {} };

  const fetchWorkers = async () => {
    try { const res = await api.get('/gigs/gigs/discover_workers/'); setWorkers(res.data || []); } catch {}
  };


      const startNegotiation = async (workerId: string, workerName: string) => {
    try {
           if (!navigator.onLine) {
  await db.offlineActions.put({ type: 'create_gig', data: { title: newTitle, budget: newBudget }, created_at: Date.now() });
  toast.success('📦 Gig saved offline');
  return;
}
      const res = await api.post('/gigs/gigs/', {
        title: `Chat with @${workerName}`,
        description: 'Direct negotiation',
        budget: '0',
        category: 'other',
        status: 'open'
      });
      setChatRoom(res.data.id);
      toast.success(`Chat opened with @${workerName}`);
    } catch { toast.error('Failed to start chat'); }
  };


  const fetchBadges = async () => { try { const res = await api.get('/gigs/gigs/my_badges/'); setSkillBadges(res.data || []); } catch {} };
  useEffect(() => { fetchPortfolio(); fetchBadges(); }, []);

     const createGig = async () => {
    if (!newTitle || !newBudget) return toast.error(t('Title & budget required'));
    setCreating(true);
    try {
      const res = await api.post('/gigs/gigs/', { 
        title: newTitle, 
        description: newDesc, 
        budget: parseFloat(newBudget), 
        category: newCategory, 
        country: countryFilter,
        deadline: newDeadline || null, 
        milestones: milestones.filter(m => m.title && m.amount) 
      });
      setGigs(prev => [res.data, ...prev]);
      setNewTitle('');
      setNewDesc('');
      setNewBudget('');
      setNewCategory('other');
      setNewDeadline('');
      setMilestones([]);
      setShowCreateForm(false);
      toast.success(t('gig_created'));
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.error || t('failed_to_create_gig');
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };
        const requestGig = async (gigId: string) => {
    if (!proposalMessage || proposalMessage.trim().length < 10) {
      return toast.error('Please write a cover letter (min 10 characters)');
    }
    try {
      await api.post(`/gigs/gigs/${gigId}/propose/`, { message: proposalMessage.trim(), proposed_budget: proposalBudget || undefined, skills: skillsInput || '' });
      toast.success(t('Proposal sent! 📨')); setNegotiateGig(null); setProposalMessage(''); setProposalBudget(''); setSkillsInput(''); fetchGigs();
    } catch (err: any) { toast.error(err.response?.data?.error || t('Failed to send proposal')); }
  };
    

  const completeGig = async (id: string) => {
    try { await api.post(`/gigs/gigs/${id}/complete/`); toast.success(t('🎉 Gig completed & payment released!')); fetchGigs(); }
    catch (err: any) { toast.error(err.response?.data?.error || t('Completion failed')); }
  };

  const completeMilestone = async (gigId: string, milestoneId: string) => {
    try { await api.post(`/gigs/gigs/${gigId}/complete_milestone/`, { milestone_id: milestoneId }); toast.success(t('Milestone approved & paid!')); fetchGigs(); }
    catch (err: any) { toast.error(err.response?.data?.error || t('Failed')); }
  };

  const submitReview = async (gigId: string) => {
    try { await api.post(`/gigs/gigs/${gigId}/review/`, { rating: reviewRating, comment: reviewComment }); toast.success(t('Review submitted!')); setShowReview(null); setReviewComment(''); setReviewRating(5); fetchGigs(); }
    catch (err: any) { toast.error(err.response?.data?.error || t('Review failed')); }
  };

  const fileDispute = async (gigId: string) => {
    if (!disputeReason.trim()) return toast.error(t('Please provide a reason'));
    try { await api.post(`/gigs/gigs/${gigId}/dispute/`, { reason: disputeReason }); toast.success(t('Dispute filed. Our team will review within 24 hours.')); setShowDispute(null); setDisputeReason(''); fetchGigs(); }
    catch (err: any) { toast.error(err.response?.data?.error || t('Failed to file dispute')); }
  };

  const addPortfolioItem = async () => {
    if (!pfTitle) return toast.error(t('Title required'));
    const formData = new FormData(); formData.append('title', pfTitle); formData.append('description', pfDesc); formData.append('link', pfLink);
    if (pfImage) formData.append('image', pfImage);
    try { await api.post('/gigs/gigs/add_portfolio/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); toast.success(t('Portfolio item added!')); setShowPortfolioForm(false); setPfTitle(''); setPfDesc(''); setPfLink(''); setPfImage(null); fetchPortfolio(); }
    catch { toast.error(t('Failed to add portfolio item')); }
  };

  const resetForm = () => { setNewTitle(''); setNewDesc(''); setNewBudget(''); setNewDeadline(''); setNewCategory('design'); setMilestones([{ title: '', amount: '' }]); };
  const addMilestone = () => setMilestones(prev => [...prev, { title: '', amount: '' }]);
  const updateMilestone = (index: number, field: 'title' | 'amount', value: string) => { const updated = [...milestones]; updated[index][field] = value; setMilestones(updated); };
  const removeMilestone = (index: number) => setMilestones(prev => prev.filter((_, i) => i !== index));
    const toggleExpand = async (gigId: string) => {
    if (expandedGig !== gigId) {
      try { await api.post(`/gigs/gigs/${gigId}/increment_view/`); } catch {}
    }
    setExpandedGig(expandedGig === gigId ? null : gigId);
  };
  const renderStars = (rating: number) => [...Array(5)].map((_, i) => <Star key={i} size={12} className={i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-gray-600'} />);

  const tabs = [
    { key: 'open' as const, icon: <Target size={15} />, label: t('Open'), count: gigs.filter(g => g.status === 'open').length },
    { key: 'in_progress' as const, icon: <Clock size={15} />, label: t('In Progress'), count: gigs.filter(g => g.status === 'in_progress').length },
    { key: 'completed' as const, icon: <CheckCircle size={15} />, label: t('Completed'), count: gigs.filter(g => g.status === 'completed').length },
    { key: 'mine' as const, icon: <Briefcase size={15} />, label: t('My Gigs'), count: 0 },
        { key: 'workers' as const, icon: <Users size={15} />, label: t('Workers'), count: workers.length },
  ];

  const categories = ['design', 'development', 'writing', 'marketing', 'video', 'music', 'business', 'other'];

  if (loading && gigs.length === 0) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-green-500" size={48} /></div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
           
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
            <Briefcase className="text-green-500" size={28} /> {t('Gig Central')}
          </h2>
          <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
            <Zap size={14} className="text-amber-500" /> {t('Find work, hire talent, earn money')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowBadges(!showBadges)} className="px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-sm font-medium flex items-center gap-1.5 hover:bg-amber-100 transition">
            <Award size={16} /> {t('Badges')} {skillBadges.length > 0 && `(${skillBadges.length})`}
          </button>
          <button onClick={() => setShowPortfolioForm(!showPortfolioForm)} className="px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 text-sm font-medium flex items-center gap-1.5 hover:bg-purple-100 transition">
            <ImageIcon size={16} /> {t('Portfolio')}
          </button>
          <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 transition-all">
            <PlusCircle size={18} /> {showForm ? t('Cancel') : t('Post a Gig')}
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: <Briefcase size={20} />, label: t('Total Gigs'), value: stats.totalGigs, gradient: 'from-blue-500 to-cyan-500' },
          { icon: <CheckCircle size={20} />, label: t('Completed'), value: stats.completedGigs, gradient: 'from-emerald-500 to-green-500' },
          { icon: <DollarSign size={20} />, label: t('Earned'), value: `$${stats.totalEarned}`, gradient: 'from-amber-500 to-yellow-500' },
          { icon: <Star size={20} />, label: t('Avg Rating'), value: stats.avgRating.toFixed(1), gradient: 'from-violet-500 to-purple-500' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="relative overflow-hidden rounded-2xl p-4 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-bl-full`} />
            <div className="relative">
              <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${stat.gradient} text-white mb-2`}>{stat.icon}</div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* BADGES PANEL */}
      <AnimatePresence>
        {showBadges && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Award size={18} className="text-amber-500" /> {t('My Skill Badges')}</h3>
              {skillBadges.length === 0 ? (
                <p className="text-gray-500 text-sm">{t('Complete gigs to earn skill badges!')}</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {skillBadges.map(badge => (
                    <div key={badge.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${badge.level === 'expert' ? 'bg-purple-100 text-purple-600' : badge.level === 'intermediate' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                        <Award size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{badge.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{badge.level} · {badge.endorsements} endorsements</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PORTFOLIO FORM */}
      <AnimatePresence>
        {showPortfolioForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><Upload size={18} /> {t('Add Portfolio Item')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-green-500" placeholder={t('Project title')}  value={pfTitle} onChange={e => setPfTitle(e.target.value)} />
                <input className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-green-500" placeholder={t('Link (optional)')}  value={pfLink} onChange={e => setPfLink(e.target.value)} />
              </div>
              <textarea className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-green-500" placeholder={t('Description...')}  value={pfDesc} onChange={e => setPfDesc(e.target.value)} rows={2} />
              <div className="flex items-center gap-3">
                <label className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 cursor-pointer flex items-center gap-1.5 text-sm hover:bg-gray-200 transition">
                  <ImageIcon size={16} /> {pfImage ? pfImage.name : t('Upload Image')}
                  <input type="file" accept="image/*" className="hidden" onChange={e => setPfImage(e.target.files?.[0] || null)} />
                </label>
                <button onClick={addPortfolioItem} className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold">{t('Add to Portfolio')}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE GIG FORM */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 space-y-4 shadow-xl border-2 border-green-200 dark:border-green-800">
            <h3 className="font-bold text-xl flex items-center gap-2"><FileText size={20} className="text-green-500" /> {t('Create New Gig')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-green-500" placeholder={t('What do you need done?')} value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              <select className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-green-500" value={newCategory} onChange={e => setNewCategory(e.target.value)}>

                {categories.map(cat => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
              </select>
                            <select className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-green-500" value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
                <option value="default">🌍 All Countries</option>
                <option value="US">🇺🇸 United States</option>
                <option value="GB">🇬🇧 United Kingdom</option>
                <option value="DE">🇩🇪 Germany</option>
                <option value="FR">🇫🇷 France</option>
                <option value="ES">🇪🇸 Spain</option>
                <option value="IT">🇮🇹 Italy</option>
                <option value="CA">🇨🇦 Canada</option>
                <option value="AU">🇦🇺 Australia</option>
                <option value="JP">🇯🇵 Japan</option>
                <option value="IN">🇮🇳 India</option>
                <option value="BR">🇧🇷 Brazil</option>
                <option value="MX">🇲🇽 Mexico</option>
                <option value="SA">🇸🇦 Saudi Arabia</option>
                <option value="AE">🇦🇪 UAE</option>
                <option value="TR">🇹🇷 Turkey</option>
                <option value="EG">🇪🇬 Egypt</option>
                <option value="ZA">🇿🇦 South Africa</option>
                <option value="NG">🇳🇬 Nigeria</option>
                <option value="MA">🇲🇦 Morocco</option>
                
              </select>
            </div>
            <textarea className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-green-500" placeholder={t('Describe the work in detail...')}  value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-green-500" type="number" placeholder={t('Total Budget ($)')} value={newBudget} onChange={e => setNewBudget(e.target.value)} />
              <input className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-green-500" type="date" placeholder="Deadline" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} />
            </div>
            <div className="space-y-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold flex items-center gap-1"><Target size={14} /> Milestones</p>
                <button onClick={addMilestone} className="text-xs text-green-600 hover:underline font-semibold">{t('+ Add Milestone')}</button>
              </div>
              {milestones.map((m, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-600 text-sm outline-none" placeholder={t('Milestone title')} value={m.title} onChange={e => updateMilestone(idx, 'title', e.target.value)} />
                  <input className="w-28 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-600 text-sm outline-none" type="number" placeholder={t('Amount')} value={m.amount} onChange={e => updateMilestone(idx, 'amount', e.target.value)} />
                  {milestones.length > 1 && <button onClick={() => removeMilestone(idx)} className="text-red-500 hover:text-red-700 p-1">✕</button>}
                </div>
              ))}
            </div>
            <button onClick={createGig} className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-500/25 hover:shadow-xl transition">
              🚀 {t('Post Gig')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEARCH + TABS */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <CountryFilter value={countryFilter} onChange={setCountryFilter} />
          <input className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-green-500 shadow-sm" placeholder={t('Search gigs...')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1.5 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.key ? 'bg-white dark:bg-gray-700 shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              {tab.icon} {tab.label}
              {tab.count > 0 && <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded-full">{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* GIGS LIST */}
      {error ? (
        <div className="text-center py-16">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={48} />
          <p className="text-lg text-gray-600">{error}</p>
          <button onClick={fetchGigs} className="mt-4 px-6 py-2.5 bg-green-500 text-white rounded-xl font-semibold">{t('Retry')}</button>
        </div>

              ) : activeTab === 'workers' ? (
        <div className="space-y-4">
          <h3 className="font-bold text-lg mb-3">🧑‍💻 Discover Workers ({workers.length})</h3>
          {workers.length === 0 ? (
            <div className="text-center py-16"><Users size={48} className="mx-auto mb-3 text-gray-300" /><p className="text-gray-500">No workers yet</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workers.map((w: any) => (
                <div key={w.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition">
                  <div className="flex items-center gap-3 mb-3">
                    {w.avatar ? <img src={w.avatar} className="w-12 h-12 rounded-full object-cover" alt="same" /> : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg">{w.username[0]?.toUpperCase()}</div>}
                    <div>
                      <p className="font-bold">@{w.username}</p>
                      <p className="text-xs text-gray-500">{w.completed_gigs} gigs completed</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{w.bio}</p>
                                    {w.portfolio_images && w.portfolio_images.length > 0 && (
                    <div className="flex gap-1 mb-2 overflow-x-auto">
                      {w.portfolio_images.filter(Boolean).map((img: string, i: number) => (
                        <img key={i} src={img} className="w-16 h-16 rounded-lg object-cover border border-gray-200 flex-shrink-0" alt="go" />
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {w.skills?.map((s: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-xs font-medium">{s}</span>
                    ))}
                  </div>
                 <div className="flex gap-2">
  <button onClick={() => startNegotiation(w.id, w.username)} 
    className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1">
    <MessageCircle size={14} /> Negotiate
  </button>
  <button onClick={async () => {
    try {
      await api.post('/gigs/gigs/', {
        title: `Hire @${w.username}`,
        description: `Direct hire for ${w.username}`,
        budget: '0',
        category: 'other',
        status: 'pending'
      });
      toast.success('Gig created! Ask worker to submit proposal.');
      setActiveTab('mine');
      fetchGigs();
    } catch { toast.error('Failed'); }
  }}
    className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1">
    <Briefcase size={14} /> Hire
  </button>
</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : gigs.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-xl text-gray-500">{t('No gigs found')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('Be the first to post a gig!')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {gigs.map((gig, idx) => {
            const statusConfig = STATUS_CONFIG[gig.status] || STATUS_CONFIG.open;
            const catGradient = CATEGORY_GRADIENTS[gig.category || 'other'] || CATEGORY_GRADIENTS.other;
            return (
              <motion.div key={gig.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                className={`bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 transition-all ${
                  expandedGig === gig.id ? 'ring-2 ring-green-300 dark:ring-green-700 shadow-lg' : 'hover:shadow-md'
                }`}>
                
                {/* MAIN CARD */}
             <div className="p-5 cursor-pointer" onClick={() => {
  const wasExpanded = expandedGig === gig.id;
  toggleExpand(gig.id);
  if (!wasExpanded) {
    setGigs(prev => prev.map(g => g.id === gig.id ? { ...g, views: (g.views || 0) + 1 } : g));
  }
}}>
                  <div className="flex items-start gap-4">
                    {/* Creator Avatar */}
                    <div className="flex-shrink-0">
                      {gig.creator_avatar ? (
                        <img src={gig.creator_avatar} className="w-12 h-12 rounded-full object-cover ring-2 ring-white dark:ring-gray-700 shadow-sm" alt="" />
                      ) : (
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${catGradient} flex items-center justify-center text-white font-bold text-lg ring-2 ring-white dark:ring-gray-700 shadow-sm`}>
                          {(gig.creator_name || 'U')[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-lg leading-snug">{gig.title}</h3>
                          <p className="text-sm text-gray-500 flex items-center gap-2 flex-wrap mt-0.5">
                            <span>@{gig.creator_name}</span>
                                                                     {/* Show ALL pending proposals */}
                            {gig.proposals && gig.proposals.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-semibold text-gray-500">📋 {gig.proposals.length} Applicant{gig.proposals.length > 1 ? 's' : ''}:</p>
                                {gig.proposals.map((p: any) => (
                                  <div key={p.id} className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="flex items-center gap-1 text-purple-700 font-medium text-sm">
                                        <UserCheck size={14} /> @{p.worker_name}
                                      </span>
                                      <div className="flex gap-1">
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                              await api.post(`/gigs/gigs/${gig.id}/accept_proposal/`, { proposal_id: p.id });
                                              toast.success('Proposal accepted! Funds in escrow.');
                                              fetchGigs();
                                            } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
                                          }}
                                          className="px-2 py-1 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600"
                                        >
                                          Accept
                                        </button>
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                              await api.post(`/gigs/gigs/${gig.id}/decline_proposal/`, { proposal_id: p.id });
                                              toast.success('Proposal declined');
                                              fetchGigs();
                                            } catch { toast.error('Failed'); }
                                          }}
                                          className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-200"
                                        >
                                          Decline
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-sm text-gray-700">{p.message}</p>
                                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                                      <span>💰 ${p.proposed_budget}</span>
                                      {p.skills && <span>🛠 {p.skills}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                            {statusConfig.icon} {statusConfig.label}
                          </span>
                          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                            {expandedGig === gig.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{gig.description}</p>

                      {/* Meta Row */}
                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        <span className="text-green-600 font-bold flex items-center gap-1 text-lg"><DollarSign size={16} />${gig.budget}</span>
                        {gig.category && (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${catGradient} text-white`}>
                            {gig.category}
                          </span>
                        )}
                        {gig.average_rating && (
                          <span className="flex items-center gap-1 text-amber-500 text-sm">{renderStars(gig.average_rating)} <span className="text-xs text-gray-500">({gig.review_count})</span></span>
                        )}
                        {gig.deadline && <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={12} /> {new Date(gig.deadline).toLocaleDateString()}</span>}
                      </div>

                                           {/* Quick Actions */}
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex-wrap">
                        <button onClick={async (e) => { e.stopPropagation();
                          const newLiked = new Set(likedGigs); newLiked.has(gig.id) ? newLiked.delete(gig.id) : newLiked.add(gig.id);
                          setLikedGigs(newLiked); try { await api.post(`/gigs/gigs/${gig.id}/like/`); } catch {}
                        }} className={`flex items-center gap-1 text-xs transition ${likedGigs.has(gig.id) ? 'text-green-500 font-bold' : 'text-gray-500 hover:text-green-500'}`}>
                          <ThumbsUp size={14} className={likedGigs.has(gig.id) ? 'fill-green-500' : ''} /> Like
                        </button>
                        <span className="flex items-center gap-1 text-xs text-gray-400"><Heart size={14} /> {gig.likes || 0}</span>
                        <span className="flex items-center gap-1 text-xs text-gray-400"><Eye size={14} /> {gig.views || 0}</span>
                        <span className="flex items-center gap-1 text-xs text-gray-400"><Users size={14} /> {gig.applicants_count ||0} applicants</span>
                        <span className="flex items-center gap-1 text-xs text-gray-400"><Eye size={14} /> {gig.views || 0}</span>
                       
                        {user && (
                          <button onClick={(e) => { e.stopPropagation(); setChatRoom(gig.id); }} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-medium">
                            <MessageCircle size={14} /> {t('Chat')}
                          </button>
                        )}
                                               {gig.creator_name !== user?.username && gig.status === 'open' && (
                                                    <button onClick={(e) => { e.stopPropagation(); setNegotiateGig(gig.id); }}
                            className="ml-auto px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition flex items-center gap-1">
                            <Send size={14} /> Submit Proposal
                          </button>
                        )}
                                                {gig.creator_name === user?.username && gig.status === 'pending' && gig.taker_name && (
                          <button onClick={async (e) => { e.stopPropagation();
                            try { 
                              await api.post(`/gigs/gigs/${gig.id}/accept_proposal/`); 
                              toast.success(t('Proposal accepted! Funds in escrow.')); 
                              fetchGigs(); 
                            } catch { toast.error(t('Failed to accept')); }
                          }}
                            className="ml-auto px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition flex items-center gap-1">
                            <CheckCircle size={14} /> {t('Accept Proposal')}
                          </button>
                        )}
                        {gig.taker_name === user?.username && gig.status === 'in_progress' && (
                          <button onClick={(e) => { e.stopPropagation(); completeGig(gig.id); }}
                            className="ml-auto px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition flex items-center gap-1">
                            <CheckCircle size={14} /> {t('Complete')}
                          </button>
                        )}
                                                {gig.creator_name === user?.username && gig.status === 'open' && (
                          <button onClick={async (e) => { e.stopPropagation();
                            try { await api.post(`/gigs/gigs/${gig.id}/cancel/`); toast.success(t('Gig cancelled')); fetchGigs(); }
                            catch { toast.error(t('Failed to cancel')); }
                          }}
                            className="ml-auto px-4 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-medium hover:bg-red-200 transition flex items-center gap-1">
                            <X size={14} /> {t('Cancel Gig')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* EXPANDED DETAILS */}
                <AnimatePresence>
                  {expandedGig === gig.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-gray-100 dark:border-gray-700">
                      <div className="p-5 space-y-5 bg-gray-50/50 dark:bg-gray-800/50">
                        {gig.milestones && gig.milestones.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><Target size={16} className="text-green-500" /> {t('Milestones')}</h4>
                            <div className="space-y-2">
                              {gig.milestones.map(m => (
                                <div key={m.id} className="flex items-center justify-between bg-white dark:bg-gray-700 p-3 rounded-xl shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${m.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                      <CheckCircle size={16} />
                                    </div>
                                    <span className="text-sm font-medium">{m.title}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-sm">${m.amount}</span>
                                    {gig.creator_name === user?.username && !m.completed && gig.taker_name && (
                                      <button onClick={() => completeMilestone(gig.id, m.id)} className="text-xs text-green-600 font-semibold hover:underline"> {t('Approve & Pay')}</button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {gig.reviews && gig.reviews.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><Star size={16} className="text-amber-500" /> {t('Reviews')} ({gig.reviews.length})</h4>
                            <div className="space-y-2">
                              {gig.reviews.map(r => (
                                <div key={r.id} className="bg-white dark:bg-gray-700 p-3 rounded-xl shadow-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-sm">{r.reviewer_name}</span>
                                    <div className="flex">{renderStars(r.rating)}</div>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{r.comment}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          {gig.status === 'completed' && (gig.creator_name === user?.username || gig.taker_name === user?.username) && (
                            <button onClick={() => setShowReview(gig.id)} className="px-4 py-2 rounded-xl bg-amber-50 text-amber-600 text-sm font-medium flex items-center gap-1.5 hover:bg-amber-100 transition">
                              <Star size={14} />{t('Leave Review')}
                            </button>
                          )}
                          {(gig.creator_name === user?.username || gig.taker_name === user?.username) && gig.status === 'in_progress' && (
                            <button onClick={() => setShowDispute(gig.id)} className="px-4 py-2 rounded-xl bg-red-50 text-red-500 text-sm font-medium flex items-center gap-1.5 hover:bg-red-100 transition">
                              <Flag size={14} />{t('File Dispute')}
                            </button>
                          )}
                        </div>

                        {showReview === gig.id && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-gray-700 p-4 rounded-xl shadow-sm space-y-3">
                            <div className="flex items-center gap-1">
                              {[1,2,3,4,5].map(i => (
                                <button key={i} onClick={() => setReviewRating(i)}>
                                  <Star size={24} className={i <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
                                </button>
                              ))}
                            </div>
                            <textarea className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 text-sm outline-none" placeholder="Write your review..." value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={2} />
                            <div className="flex gap-2">
                              <button onClick={() => submitReview(gig.id)} className="px-5 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold"> {t('Submit')}</button>
                              <button onClick={() => setShowReview(null)} className="px-5 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl text-sm"> {t('Cancel')}</button>
                            </div>
                          </motion.div>
                        )}

                        {showDispute === gig.id && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl space-y-3">
                            <textarea className="w-full px-4 py-3 rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-700 text-sm outline-none" placeholder="Describe the issue..." value={disputeReason} onChange={e => setDisputeReason(e.target.value)} rows={2} />
                            <div className="flex gap-2">
                              <button onClick={() => fileDispute(gig.id)} className="px-5 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold"> {t('File Dispute')}</button>
                              <button onClick={() => setShowDispute(null)} className="px-5 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl text-sm"> {t('Cancel')}</button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* NEGOTIATION MODAL */}
      <AnimatePresence>
        {negotiateGig && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setNegotiateGig(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Send size={18} className="text-green-500" /> {t('Send Proposal')}</h3>
              <textarea className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none mb-3" placeholder={t("Introduce yourself...")} value={proposalMessage} onChange={e => setProposalMessage(e.target.value)} rows={3} />
              <input className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none mb-4" type="number" placeholder={t('Your proposed budget (optional)')} value={proposalBudget} onChange={e => setProposalBudget(e.target.value)} />
                            <input className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none mb-4" type="text" placeholder={t('Skills (e.g. React, Python, Design)')} value={skillsInput} onChange={e => setSkillsInput(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={() => requestGig(negotiateGig)} className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold">{t('Send Proposal')}</button>
                <button onClick={() => setNegotiateGig(null)} className="px-6 py-3 bg-gray-200 dark:bg-gray-600 rounded-xl font-medium">{t('Cancel')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

            {chatRoom && <GigChat key={chatRoom} roomId={chatRoom} onClose={() => setChatRoom(null)} />}
      {showPayment && <PaymentModal amount={paymentAmount} type="gig" onSuccess={() => { setShowPayment(false); fetchGigs(); toast.success('Payment successful!'); }} onClose={() => setShowPayment(false)} />}
    </div>
  );
}