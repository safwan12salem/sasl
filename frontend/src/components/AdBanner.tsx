import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Eye, X, Loader2 } from 'lucide-react';

interface Ad {
  id: string;
  title: string;
  content: string;
  image?: string;
  link: string;
}

const AdBanner: React.FC = () => {
  const { token } = useAuth();
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [rewarded, setRewarded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api.get('/monetization/ads/serve_ad/')
      .then(res => setAd(res.data.ad_available ? res.data.ad : null))
      .catch(() => {}) // silently fail
      .finally(() => setLoading(false));
  }, [token]);

  const claimReward = async () => {
    if (!ad || rewarded) return;
    try {
      await api.post('/monetization/ads/reward_view/', { campaign_id: ad.id });
      setRewarded(true);
      toast.success('+$0.001 earned!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Reward failed');
    }
  };

  if (loading) return <div className="h-16 flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!ad || collapsed) return null;

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-3 mb-4 relative shadow-sm">
      <button onClick={() => setCollapsed(true)} className="absolute top-1 right-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
      <div className="flex items-center gap-3">
        {ad.image && <img src={ad.image} alt="ad" className="w-12 h-12 rounded object-cover" />}
        <div className="flex-1">
          <p className="font-semibold text-sm">{ad.title}</p>
          <p className="text-xs text-gray-500">{ad.content}</p>
        </div>
        <button onClick={claimReward} disabled={rewarded} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${rewarded ? 'bg-gray-200 text-gray-500' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
          <Eye size={14} /> {rewarded ? 'Rewarded' : 'Earn $0.001'}
        </button>
      </div>
    </div>
  );
};

export default AdBanner;