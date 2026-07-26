import React, { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  Sparkles, DollarSign, TrendingUp, Video, Image, Send, Loader2, Users, Star, PlusCircle,
  Zap, Crown, BarChart3, Clock, CheckCircle, XCircle, Target, Award, Gift, Megaphone,
  ChevronUp, ChevronDown, Filter, Calendar, Eye, Heart, MessageCircle, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useMesh } from '../hooks/useMesh';
import { db } from '../services/offlineDB';


export default function CreatorStudio() {
  const { user } = useAuth();
    const { isOnline } = useMesh();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [myContents, setMyContents] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'dashboard' | 'campaigns' | 'my-content' | 'profile' | 'ads'>('dashboard');
      // Restore tab from localStorage
  useEffect(() => {
    const savedTab = localStorage.getItem('creatorstudio_tab');
    if (savedTab) setTab(savedTab as any);
  }, []);
  
  // Save tab to localStorage on change
  useEffect(() => {
    localStorage.setItem('creatorstudio_tab', tab);
  }, [tab]);


  const [niche, setNiche] = useState('');
  const [pricePost, setPricePost] = useState('25');
  const [priceVideo, setPriceVideo] = useState('50');
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campaignBrand, setCampaignBrand] = useState('');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignDesc, setCampaignDesc] = useState('');
  const [campaignBudget, setCampaignBudget] = useState('');
  const [campaignType, setCampaignType] = useState('post');
    const [campaignImage, setCampaignImage] = useState<File | null>(null);
  const [campaignImageUrl, setCampaignImageUrl] = useState('');
  const [campaignDeadline, setCampaignDeadline] = useState('');
  const [sortBy, setSortBy] = useState<'budget' | 'deadline'>('budget');
    const [applyModal, setApplyModal] = useState<string | null>(null); // campaign id
  const [proposalMsg, setProposalMsg] = useState('');
  const [proposalPortfolio, setProposalPortfolio] = useState('');
  // Ad Campaign States
  const [adTitle, setAdTitle] = useState('');
  const [adDesc, setAdDesc] = useState('');
  const [adLink, setAdLink] = useState('');
  const [adBudget, setAdBudget] = useState('');
  const [adCPC, setAdCPC] = useState('0.01');
  const [adImage, setAdImage] = useState<File | null>(null);
  const [adImageUrl, setAdImageUrl] = useState('');
  const [adCampaigns, setAdCampaigns] = useState<any[]>([]);


  useEffect(() => { loadData(); }, []);

  // Sync offline campaigns/ads when coming online
  useEffect(() => {
    if (isOnline) {
      db.offlineActions.where('type').equals('create_campaign').toArray().then(async (items) => {
        for (const item of items) {
          try {
            await api.post('/creatorstudio/campaigns/', item.data);
            await db.offlineActions.delete(item.id!);
          } catch {}
        }
        loadData();
      });
      db.offlineActions.where('type').equals('create_ad').toArray().then(async (items) => {
        for (const item of items) {
          try {
            await api.post('/monetization/ads/create_campaign/', item.data);
            await db.offlineActions.delete(item.id!);
          } catch {}
        }
      });
    }
  }, [isOnline]);


  const loadData = async () => {
    try {
      const [p, c, m, e] = await Promise.all([
        api.get('/creatorstudio/profiles/my_profile/'),
        api.get('/creatorstudio/campaigns/'),
        api.get('/creatorstudio/campaigns/my_contents/'),
        api.get('/creatorstudio/profiles/my_earnings/').catch(() => ({ data: null }))
      ]);
      setProfile(p.data);
      setCampaigns(c.data.results || c.data || []);
      setMyContents(m.data || []);
      setEarnings(e.data);
      setNiche(p.data.niche || '');
      setPricePost(p.data.price_per_post || '25');
      setPriceVideo(p.data.price_per_video || '50');
            // Fetch ad campaigns
      try {
        const adRes = await api.get('/monetization/ads/my_campaigns/');
        setAdCampaigns(adRes.data || []);
      } catch {}
    } catch (err) {
      toast.error(t('Failed to load Creator Studio'));
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      await api.patch('/creatorstudio/profiles/my_profile/', { niche, price_per_post: pricePost, price_per_video: priceVideo });
      toast.success(t('Profile updated!'));
      loadData();
    } catch { toast.error(t('Update failed')); }
  };


  const createAdCampaign = async () => {
        if (!adTitle || !adBudget || !adLink) return toast.error('Title, budget, and link are required');
    if (!isOnline) {
            await db.offlineActions.put({ type: 'create_ad', data: { title: adTitle, content: adDesc, link: adLink, budget: parseFloat(adBudget), cpc: parseFloat(adCPC) || 0.01, image: adImageUrl }, created_at: Date.now() });
      toast.success('Ad saved offline — will publish when online');
      setAdTitle(''); setAdDesc(''); setAdLink(''); setAdBudget(''); setAdImage(null); setAdImageUrl('');
      return;
    }
    try {
      await api.post('/monetization/ads/create_campaign/', {
        title: adTitle,
        content: adDesc,
        link: adLink,
        budget: parseFloat(adBudget),
        cpc: parseFloat(adCPC) || 0.01,
        image: adImageUrl,
      });
      toast.success('🎉 Ad campaign launched! 60% platform fee, 40% goes to viewer rewards.');
      setAdTitle(''); setAdDesc(''); setAdLink(''); setAdBudget(''); setAdImage(null); setAdImageUrl('');
      // Reload ad campaigns
      const adRes = await api.get('/monetization/ads/my_campaigns/');
      setAdCampaigns(adRes.data || []);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to create campaign'); }
  };

    const applyCampaign = async (campaignId: string) => {
    if (!proposalMsg.trim()) return toast.error('Write a proposal message');
    try {
      await api.post(`/creatorstudio/campaigns/${campaignId}/apply/`, {
        caption: proposalMsg,
        portfolio_link: proposalPortfolio,
      });
      toast.success(t('Applied successfully! 🎉'));
      setApplyModal(null);
      setProposalMsg('');
      setProposalPortfolio('');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('Failed to apply'));
    }
  };


  const createCampaign = async () => {
       if (!campaignBrand || !campaignTitle || !campaignBudget) return toast.error(t('Fill all fields'));
    if (!isOnline) {
            await db.offlineActions.put({ type: 'create_campaign', data: { brand_name: campaignBrand, title: campaignTitle, description: campaignDesc, budget: parseFloat(campaignBudget), content_type: campaignType, deadline: campaignDeadline, image: campaignImageUrl || '' }, created_at: Date.now() });
            toast.success('Saved offline — will publish when online');
      setCampaignBrand(''); setCampaignTitle(''); setCampaignDesc('');
      setCampaignBudget(''); setCampaignDeadline(''); setShowCreateCampaign(false);
      return;
    }
    try {
           await api.post('/creatorstudio/campaigns/', {
        brand_name: campaignBrand, title: campaignTitle, description: campaignDesc,
                budget: parseFloat(campaignBudget), content_type: campaignType, deadline: campaignDeadline,
        image: campaignImageUrl || '',
      });
      toast.success(t('Campaign created!'));
      setShowCreateCampaign(false);
      setCampaignBrand(''); setCampaignTitle(''); setCampaignDesc('');
      setCampaignBudget(''); setCampaignDeadline('');
      loadData();
    } catch { toast.error(t('Failed to create campaign')); }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin text-purple-500" size={48} />
    </div>
  );

  const sortedCampaigns = [...campaigns].sort((a, b) => {
    if (sortBy === 'budget') return parseFloat(b.budget) - parseFloat(a.budget);
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const totalEarned = parseFloat(profile?.total_earned || 0);
  const completedDeals = profile?.completed_deals || 0;
  const pendingDeals = myContents.filter((c: any) => c.status === 'pending').length;
  const engagementRate = profile?.engagement_rate || 0;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* ========== HEADER ========== */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
              <Crown className="text-yellow-500" size={32} />
              {t('Creator Studio')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{t('Your creative empire, monetized')}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass-card px-4 py-2 rounded-xl text-center">
              <p className="text-xs text-gray-500">{t('Your Cut')}</p>
              <p className="text-xl font-bold text-green-600">90%</p>
            </div>
            <div className="glass-card px-4 py-2 rounded-xl text-center">
              <p className="text-xs text-gray-500">{t('Platform')}</p>
              <p className="text-xl font-bold text-gray-400">10%</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ========== EARNINGS DASHBOARD CARDS ========== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: <DollarSign size={24} />, label: t('Total Earned'), value: `$${totalEarned.toFixed(2)}`, color: 'from-green-500 to-emerald-500', bg: 'bg-green-50 dark:bg-green-900/20' },
          { icon: <CheckCircle size={24} />, label: t('Completed'), value: completedDeals, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { icon: <Clock size={24} />, label: t('Pending'), value: pendingDeals, color: 'from-orange-500 to-amber-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
          { icon: <TrendingUp size={24} />, label: t('Engagement'), value: `${engagementRate}%`, color: 'from-purple-500 to-pink-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        ].map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className={`${card.bg} rounded-2xl p-4 hover:shadow-lg transition-shadow border border-white/50`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-lg`}>{card.icon}</div>
              <div>
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className="text-xl font-bold">{card.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ========== TABS ========== */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 overflow-x-auto">
        {[
                   { key: 'dashboard' as const, label: t('📊 Dashboard'), icon:<BarChart3 size={16} /> },
          { key: 'campaigns' as const, label: t('💼 Brand Deals'), icon: <DollarSign size={16} /> },
          { key: 'my-content' as const, label: t('📝 My Content'), icon: <Image size={16} /> },
          { key: 'profile' as const, label: t('⭐ Profile'), icon: <Star size={16} /> },
          { key: 'ads' as const, label: t('📢 Advertise'), icon: <Megaphone size={16} /> },    
        ].map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition whitespace-nowrap ${
              tab === tb.key ? 'bg-white dark:bg-gray-700 shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tb.icon} <span className="hidden sm:inline">{tb.label}</span>
          </button>
        ))}
      </div>

      {/* ========== DASHBOARD TAB ========== */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-5 rounded-2xl">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Zap size={18} className="text-yellow-500" /> {t('Recent Earnings')}</h3>
              {earnings?.recent_earnings?.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {earnings.recent_earnings.slice(0, 5).map((e: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="truncate max-w-[200px]">{e.caption || e.campaign_title || 'Content'}</span>
                      <span className="font-bold text-green-600">+${e.creator_earnings}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 py-4 text-center">{t('No earnings yet — apply to campaigns!')}</p>
              )}
            </div>
            <div className="glass-card p-5 rounded-2xl">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Target size={18} className="text-blue-500" /> {t('Top Niches')}</h3>
              <div className="space-y-2">
                {['Gaming', 'Fashion', 'Tech', 'Fitness', 'Food'].map(n => (
                  <div key={n} className="flex items-center justify-between text-sm">
                    <span>{n}</span>
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" style={{ width: `${Math.random() * 60 + 20}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card p-5 rounded-2xl">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Award size={18} className="text-purple-500" /> {t('Creator Level')}</h3>
              <div className="text-center py-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mx-auto flex items-center justify-center text-white text-3xl font-bold mb-2">
                  {completedDeals >= 10 ? '🏆' : completedDeals >= 5 ? '⭐' : '🌱'}
                </div>
                <p className="font-bold text-lg">
                  {completedDeals >= 10 ? t('Pro Creator') : completedDeals >= 5 ? t('Rising Star') : t('New Creator')}
                </p>
                <p className="text-xs text-gray-500 mt-1">{completedDeals}/10 {t('deals to next level')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== CAMPAIGNS TAB ========== */}
      {tab === 'campaigns' && (
        <>
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <button onClick={() => setShowCreateCampaign(!showCreateCampaign)} className="btn-primary text-sm flex items-center gap-1">
              <PlusCircle size={16} /> {t('Create Campaign')}
            </button>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <button onClick={() => setSortBy('budget')} className={`text-xs px-3 py-1 rounded-full ${sortBy === 'budget' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}>
                {t('Highest Paid')}
              </button>
              <button onClick={() => setSortBy('deadline')} className={`text-xs px-3 py-1 rounded-full ${sortBy === 'deadline' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}>
                {t('Closing Soon')}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showCreateCampaign && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
                <div className="glass-card p-5 rounded-2xl space-y-3 border-2 border-purple-200 dark:border-purple-800">
                  <h3 className="font-bold flex items-center gap-2"><Sparkles size={18} className="text-purple-500" /> {t('New Campaign')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input className="input-field text-sm" placeholder={t('Brand Name')} value={campaignBrand} onChange={e => setCampaignBrand(e.target.value)} />
                    <input className="input-field text-sm" placeholder={t('Campaign Title')} value={campaignTitle} onChange={e => setCampaignTitle(e.target.value)} />
                  </div>
                  <textarea className="input-field text-sm" placeholder={t('Description')} value={campaignDesc} onChange={e => setCampaignDesc(e.target.value)} rows={2} />
                                      <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-500 hover:text-gray-700">
                    <Image size={16} />
                    {campaignImage ? campaignImage.name : t('Campaign image (optional)')}
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setCampaignImage(file);
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('upload_preset', 'sasl_upload');
                      try {
                        const res = await fetch('https://api.cloudinary.com/v1_1/dwem1chqc/upload', { method: 'POST', body: formData });
                        const data = await res.json();
                        if (data.secure_url) setCampaignImageUrl(data.secure_url);
                      } catch {}
                    }} />
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <input className="input-field text-sm" type="number" placeholder={t('Budget ($)')} value={campaignBudget} onChange={e => setCampaignBudget(e.target.value)} />
                    <select className="input-field text-sm" value={campaignType} onChange={e => setCampaignType(e.target.value)}>
                      <option value="post">{t('Post')}</option>
                      <option value="video">{t('Video')}</option>
                      <option value="story">{t('Story')}</option>
                    </select>
                    <input className="input-field text-sm" type="date" value={campaignDeadline} onChange={e => setCampaignDeadline(e.target.value)} />
                    <button onClick={createCampaign} className="btn-primary text-sm">{t('Publish')}</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedCampaigns.length === 0 ? (
              <div className="col-span-full text-center py-16 text-gray-400">
                <DollarSign size={64} className="mx-auto mb-4 opacity-20" />
                <p className="text-lg font-semibold">{t('No brand campaigns yet')}</p>
                <p className="text-sm">{t('Be the first to create one!')}</p>
              </div>
            ) : (
              sortedCampaigns.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -4 }} className="glass-card rounded-2xl overflow-hidden border border-purple-100 dark:border-purple-900/30 hover:shadow-xl transition-shadow">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2" />
                                    {c.image && <img src={c.image} alt={c.title} className="w-full h-32 object-cover" />}
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {c.brand_name?.[0]?.toUpperCase() || 'B'}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{c.brand_name}</p>
                        <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-600 px-2 py-0.5 rounded-full">{c.content_type}</span>
                      </div>
                    </div>
                    <h4 className="font-semibold mb-1">{c.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-4">{c.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-2xl font-bold text-green-600">${c.budget}</p>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Calendar size={10} /> {new Date(c.deadline).toLocaleDateString()}
                        </p>
                      </div>
                                         </div>
                    <div className="flex items-center gap-2 mt-3">
                      {c.brand_name !== user?.username && (
                        <motion.button whileTap={{scale: 0.9}} onClick={() => setApplyModal(c.id)}
                          className="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg transition flex items-center gap-1 flex-1">
                          <Send size={14} /> {t('Apply')}
                        </motion.button>
                      )}
                    {(c.brand_user === user?.id || c.brand_name === user?.username) && (
                        <>
                          <button onClick={async (e) => { e.stopPropagation();
                            try {
                              const res = await api.get(`/creatorstudio/campaigns/${c.id}/applicants/`);
                              if (res.data && res.data.length > 0) {
                                setMyContents(res.data);
                                setTab('my-content');
                              }
                              toast.success(`${res.data?.length || 0} applicant(s)`);
                            } catch { toast.error('Failed to load applicants'); }
                          }} className="flex-1 py-2 bg-blue-500 text-white rounded-xl text-xs font-semibold hover:bg-blue-600">
                            👥 Applicants ({c.applicant_count || 0})
                          </button>
                          <button onClick={async (e) => { e.stopPropagation();
                            if (window.confirm('Delete this campaign?')) {
                              try { await api.delete(`/creatorstudio/campaigns/${c.id}/`); toast.success('Deleted'); loadData(); }
                              catch { toast.error('Failed'); }
                            }
                          }} className="px-3 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-200">
                            🗑️
                          </button>
                        </>
                      )}
                    </div>  
                    {/* Progress bar if campaign has applicant count */}
                    {c.applicant_count !== undefined && (
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full" 
                          style={{ width: `${Math.min((c.applicant_count / (c.max_creators || 10)) * 100, 100)}%` }} />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </>
      )}

      {/* ========== MY CONTENT TAB ========== */}
      {tab === 'my-content' && (
        <div className="space-y-3">
          {myContents.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Image size={64} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg font-semibold">{t('No content yet')}</p>
              <p className="text-sm">{t('Apply to brand campaigns to start earning!')}</p>
            </div>
          ) : (
            myContents.map((c: any, i: number) => (
              <motion.div key={c.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    c.status === 'approved' ? 'bg-green-100 text-green-600' :
                    c.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {c.status === 'approved' ? <CheckCircle size={20} /> : c.status === 'pending' ? <Clock size={20} /> : <XCircle size={20} />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{c.caption || c.campaign_title || t('Content')}</p>
                    <p className="text-xs text-gray-500">{c.content_type} · <span className="capitalize">{c.status}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">{t('Earned')}</p>
                    <p className="font-bold text-green-600">${c.creator_earnings || '0.00'}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Eye size={12} /> {c.views || 0}</span>
                    <span className="flex items-center gap-1"><Heart size={12} /> {c.likes || 0}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={12} /> {c.comments || 0}</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* ========== PROFILE TAB ========== */}
      {tab === 'profile' && (
        <div className="max-w-lg mx-auto">
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <div className="text-center mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mx-auto flex items-center justify-center text-white text-4xl font-bold shadow-xl mb-3">
                {user?.username?.[0]?.toUpperCase() || 'C'}
              </div>
              <h3 className="font-bold text-xl">@{user?.username}</h3>
              <p className="text-sm text-gray-500">{niche || t('Set your niche')}</p>
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { value: profile?.audience_size || 0, label: t('Audience') },
                { value: `${engagementRate}%`, label: t('Engagement') },
                { value: profile?.is_verified ? '✅' : '⏳', label: t('Verified') },
              ].map((stat, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-[10px] text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">{t('Niche')}</label>
                <input className="input-field text-sm mt-1" placeholder={t('e.g. Tech, Fashion, Gaming')} value={niche} onChange={e => setNiche(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">{t('Price per Post')}</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input className="input-field text-sm pl-7" type="number" value={pricePost} onChange={e => setPricePost(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">{t('Price per Video')}</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input className="input-field text-sm pl-7" type="number" value={priceVideo} onChange={e => setPriceVideo(e.target.value)} />
                  </div>
                </div>
              </div>
              <button onClick={updateProfile} className="btn-primary w-full py-3 text-sm font-bold">
                {t('Save Profile')}
              </button>
            </div>
          </div>
        </div>
      )}

      

      {/* ========== ADS TAB ========== */}
      {tab === 'ads' && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Create Ad Campaign */}
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Megaphone size={20} className="text-purple-500" /> Create Ad Campaign
            </h3>
            <div className="space-y-3">
              <input className="input-field" placeholder="Ad Title *" value={adTitle} onChange={e => setAdTitle(e.target.value)} />
              <textarea className="input-field" placeholder="Ad Description *" value={adDesc} onChange={e => setAdDesc(e.target.value)} rows={2} />
              <input className="input-field" type="url" placeholder="Target URL (where users go when they click)" value={adLink} onChange={e => setAdLink(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <input className="input-field" type="number" placeholder="Budget ($) *" value={adBudget} onChange={e => setAdBudget(e.target.value)} />
                <input className="input-field" type="number" placeholder="CPC in $" step="0.001" value={adCPC} onChange={e => setAdCPC(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-500 hover:text-gray-700">
                <Image size={16} />
                {adImage ? adImage.name : 'Upload Ad Creative (image or video)'}
                <input type="file" accept="image/*,video/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setAdImage(file);
                  const formData = new FormData();
                  formData.append('file', file);
                  formData.append('upload_preset', 'sasl_upload');
                  try {
                    const res = await fetch('https://api.cloudinary.com/v1_1/dwem1chqc/upload', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.secure_url) setAdImageUrl(data.secure_url);
                  } catch {}
                }} />
              </label>
              <button onClick={createAdCampaign} className="btn-primary w-full py-3">
                🚀 Launch Campaign ({adBudget ? `$${adBudget}` : '$0'})
              </button>
            </div>
          </div>

          {/* Active Campaigns */}
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="font-bold text-lg mb-4">📊 Your Ad Campaigns</h3>
            {adCampaigns.length === 0 ? (
              <p className="text-gray-400 text-sm">No campaigns yet. Create your first ad above.</p>
            ) : (
              <div className="space-y-3">
                {adCampaigns.map((c: any) => (
                  <div key={c.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{c.title}</p>
                        <p className="text-xs text-gray-500">Budget: ${c.budget} · CPC: ${c.cpc} · Spent: ${c.spent || 0}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.active ? 'Active' : 'Ended'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min(((c.spent || 0) / c.budget) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
       {/* Apply Proposal Modal */}
      <AnimatePresence>
        {applyModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setApplyModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-4">📝 Submit Proposal</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Users size={16} className="text-purple-500" />
                  <span>Audience: {profile?.audience_size || 0}</span>
                  <span className="text-gray-400">·</span>
                  <span>Engagement: {engagementRate}%</span>
                </div>
                
                <textarea className="input-field text-sm" placeholder="Why are you the best fit for this campaign? *" 
                  value={proposalMsg} onChange={e => setProposalMsg(e.target.value)} rows={4} />
                
                <input className="input-field text-sm" placeholder="Portfolio link (optional)" 
                  value={proposalPortfolio} onChange={e => setProposalPortfolio(e.target.value)} />
                
                {profile?.past_campaigns > 0 && (
                  <p className="text-xs text-green-600">✅ {profile.past_campaigns} campaigns completed</p>
                )}
              </div>
              
              <div className="flex gap-2 mt-4">
                <button onClick={() => applyCampaign(applyModal)} 
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-semibold">
                  Submit Proposal
                </button>
                <button onClick={() => setApplyModal(null)} 
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-600 rounded-xl font-medium">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

   

 
