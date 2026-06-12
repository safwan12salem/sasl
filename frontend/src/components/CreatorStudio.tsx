import React, { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Sparkles, DollarSign, TrendingUp, Video, Image, Send, Loader2, Users, Star, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import PaymentModal from './PaymentModal';
import { useTranslation } from 'react-i18next';

export default function CreatorStudio() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [myContents, setMyContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [tab, setTab] = useState<'campaigns' | 'my-content' | 'profile'>('campaigns');
  const [niche, setNiche] = useState('');
  const [pricePost, setPricePost] = useState('25');
  const [priceVideo, setPriceVideo] = useState('50');
 
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
const [campaignBrand, setCampaignBrand] = useState('');
const [campaignTitle, setCampaignTitle] = useState('');
const [campaignDesc, setCampaignDesc] = useState('');
const [campaignBudget, setCampaignBudget] = useState('');
const [campaignType, setCampaignType] = useState('post');
const [campaignDeadline, setCampaignDeadline] = useState('');




  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [p, c, m] = await Promise.all([
        api.get('/creatorstudio/profiles/my_profile/'),
        api.get('/creatorstudio/campaigns/'),
        api.get('/creatorstudio/campaigns/my_contents/')
      ]);
      setProfile(p.data);
      setCampaigns(c.data.results || c.data || []);
      setMyContents(m.data || []);
      setNiche(p.data.niche || '');
      setPricePost(p.data.price_per_post || '25');
      setPriceVideo(p.data.price_per_video || '50');
    } catch (err) {
      toast.error('Failed to load Creator Studio');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      await api.patch('/creatorstudio/profiles/my_profile/', {
        niche, price_per_post: pricePost, price_per_video: priceVideo
      });
      toast.success('Profile updated!');
      loadData();
    } catch { toast.error('Update failed'); }
  };

  const applyCampaign = async (campaignId: string, budget: string) => {
    try {
      await api.post(`/creatorstudio/campaigns/${campaignId}/apply/`, {});
      toast.success('Applied successfully! 🎉');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to apply');
    }
  };



const createCampaign = async () => {
  try {
    await api.post('/creatorstudio/campaigns/create/', {
      brand_name: campaignBrand,
      title: campaignTitle,
      description: campaignDesc,
      budget: parseFloat(campaignBudget),
      content_type: campaignType,
      deadline: campaignDeadline,
    });
    toast.success('Campaign created!');
    setShowCreateCampaign(false);
    loadData();
  } catch { toast.error('Failed to create campaign'); }
};

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-500" size={48} /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold gradient-text flex items-center gap-2">
          <Sparkles className="text-purple-500" /> Creator Studio
        </h2>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Earned</p>
          <p className="text-2xl font-bold text-green-600">${Number(profile?.total_earned || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6">
        {[
          { key: 'campaigns' as const, label: 'Brand Deals', icon: <DollarSign size={16} /> },
          { key: 'my-content' as const, label: 'My Content', icon: <Image size={16} /> },
          { key: 'profile' as const, label: 'Profile', icon: <Star size={16} /> },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition ${tab === t.key ? 'bg-white dark:bg-gray-700 shadow text-purple-600' : 'text-gray-500'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* CAMPAIGNS TAB */}
      {tab === 'campaigns' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-400">
              <DollarSign size={48} className="mx-auto mb-3 opacity-30" />
              <p>No brand campaigns available yet</p>
            </div>
          ) : (
            campaigns.map(c => (
              <motion.div key={c.id} whileHover={{ y: -3 }} className="glass-card p-5 rounded-2xl border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {c.brand_name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{c.brand_name}</p>
                    <p className="text-xs text-gray-500">{c.content_type}</p>
                  </div>
                </div>
                <h4 className="font-semibold mb-1">{c.title}</h4>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{c.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-green-600">${c.budget}</span>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => applyCampaign(c.id, c.budget)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:shadow-lg transition">
                    Apply Now
                  </motion.button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Deadline: {new Date(c.deadline).toLocaleDateString()}</p>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* MY CONTENT TAB */}
      {tab === 'my-content' && (
        <div className="space-y-3">
          {myContents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Image size={48} className="mx-auto mb-3 opacity-30" />
              <p>No content yet</p>
              <p className="text-sm">Apply to brand campaigns above!</p>
            </div>
          ) : (
            myContents.map((c: any) => (
              <div key={c.id} className="glass-card p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{c.caption || c.campaign_title}</p>
                  <p className="text-xs text-gray-500">{c.content_type} · {c.status}</p>
                </div>
                <span className="text-green-600 font-bold">${c.creator_earnings}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* PROFILE TAB */}
      {tab === 'profile' && (
        <div className="glass-card p-6 rounded-2xl max-w-lg">
          <h3 className="font-bold text-lg mb-4">Creator Profile</h3>
          <div className="space-y-3">
            <input className="input-field" placeholder="Your niche (e.g., Tech, Fashion, Gaming)" value={niche} onChange={e => setNiche(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Price per Post ($)</label>
                <input className="input-field" type="number" value={pricePost} onChange={e => setPricePost(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Price per Video ($)</label>
                <input className="input-field" type="number" value={priceVideo} onChange={e => setPriceVideo(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 p-3 rounded-xl">
                <p className="text-lg font-bold">{profile?.audience_size || 0}</p>
                <p className="text-xs text-gray-500">Audience</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <p className="text-lg font-bold">{profile?.engagement_rate || 0}%</p>
                <p className="text-xs text-gray-500">Engagement</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <p className="text-lg font-bold">{profile?.is_verified ? '✅' : '⏳'}</p>
                <p className="text-xs text-gray-500">Verified</p>
              </div>
            </div>
            <button onClick={updateProfile} className="btn-primary w-full py-3">Save Profile</button>
          </div>
        </div>
      )}

      {showPayment && <PaymentModal amount={paymentAmount} type="creator_studio" onSuccess={() => { setShowPayment(false); loadData(); }} onClose={() => setShowPayment(false)} />}
    </div>
  );
}