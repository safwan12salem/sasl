import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Eye, X, Loader2, ExternalLink } from 'lucide-react';

interface Ad {
  id: string;
  title: string;
  content: string;
  image?: string;
  link?: string;
}

const AdBanner: React.FC = () => {
  const { token } = useAuth();
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [rewarded, setRewarded] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get('/monetization/ads/serve_ad/')
      .then(res => {
        if (res.data?.ad_available && res.data?.ad) {
          console.log('📢 AD:', res.data.ad.link); // Debug link
          setAd(res.data.ad);
        } else {
          setAd(null);
        }
      })
      .catch(() => setAd(null))
      .finally(() => setLoading(false));
  }, [token]);

       const [canEarn, setCanEarn] = useState(false);

  const handleEngage = () => {
    setEngaged(true);
    setTimeout(() => setCanEarn(true), 20000);
    if (ad?.link) {
      let url = ad.link;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  
  const claimReward = async () => {
    if (!ad || rewarded || !engaged) return;
    try {
      await api.post('/monetization/ads/reward_view/', { campaign_id: ad.id });
      setRewarded(true);
      toast.success('+$0.001 earned!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Reward failed');
    }
  };

  if (loading) {
    return (
      <div className="h-16 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={20} />
      </div>
    );
  }

  if (!ad || collapsed) return null;

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-3 mb-4 relative shadow-sm hover:shadow-md transition-shadow">
      {/* Close button */}
      <button 
        onClick={() => setCollapsed(true)} 
        className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 p-1"
        aria-label="Close ad"
      >
        <X size={16} />
      </button>

      <div className="flex items-center gap-3">
        {/* Ad image */}
        {ad.image && (
          <img 
            src={ad.image} 
            alt={ad.title || 'Advertisement'} 
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          />
        )}

        {/* Ad content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{ad.title}</p>
          <p className="text-xs text-gray-500 truncate">{ad.content}</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Learn More button */}
          <button
            onClick={handleEngage}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors"
          >
            <ExternalLink size={12} />
            Learn More
          </button>

                  {/* Earn reward button */}
          <button
            onClick={claimReward}
            disabled={!canEarn || rewarded}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              rewarded 
                ? 'bg-gray-200 text-gray-500 cursor-default' 
                : canEarn 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'bg-gray-300 text-gray-400 cursor-not-allowed'
            }`}
            title={!canEarn ? 'Wait 20 seconds after viewing' : rewarded ? 'Already rewarded' : 'Claim your reward'}
          >
            <Eye size={12} />
            {rewarded ? '✓ Rewarded' : canEarn ? 'Earn $0.001' : 'Wait 20s'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdBanner;