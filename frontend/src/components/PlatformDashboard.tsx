import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { DollarSign, TrendingUp, CreditCard, Gift, ArrowUpRight, Wallet, Send, RefreshCw, Download, Heart, GraduationCap, Briefcase, Megaphone } from 'lucide-react';

export default function PlatformDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferTarget, setTransferTarget] = useState('');
  const [donateAmount, setDonateAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/monetization/platform/dashboard/');
      setData(res.data);
    } catch { setData(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (!user?.is_superuser) return null;
  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin text-purple-500 text-2xl">⏳</div></div>;
  if (!data) return <div className="text-center py-20 text-gray-500">Unable to load dashboard</div>;

  const handleTransfer = async () => {
    if (!transferAmount || !transferTarget) return toast.error('Enter amount and target username');
    try {
      await api.post('/monetization/platform/transfer/', { amount: parseFloat(transferAmount), target_username: transferTarget });
      toast.success('Transfer initiated!');
      setTransferAmount(''); setTransferTarget('');
      fetchDashboard();
    } catch { toast.error('Transfer failed'); }
  };

  const handleDonate = async () => {
    if (!donateAmount) return toast.error('Enter donation amount');
    try {
      await api.post('/monetization/platform/donate/', { amount: parseFloat(donateAmount) });
      toast.success('Donation processed!');
      setDonateAmount('');
      fetchDashboard();
    } catch { toast.error('Donation failed'); }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount) return toast.error('Enter withdrawal amount');
    try {
      await api.post('/monetization/platform/withdraw/', { amount: parseFloat(withdrawAmount) });
      toast.success('Withdrawal successful!');
      setWithdrawAmount('');
      fetchDashboard();
    } catch { toast.error('Withdrawal failed'); }
  };

  const breakdownItems = [
    { label: 'Marketplace (8%)', value: data.breakdown.marketplace, color: 'bg-purple-500', icon: <CreditCard size={16} /> },
    { label: 'Gigs (8%)', value: data.breakdown.gigs, color: 'bg-blue-500', icon: <Briefcase size={16} /> },
    { label: 'Donations (8%)', value: data.breakdown.donations, color: 'bg-green-500', icon: <Heart size={16} /> },
    { label: 'Ads (60%)', value: data.breakdown.ads, color: 'bg-orange-500', icon: <Megaphone size={16} /> },
    { label: 'Tutoring (10%)', value: data.breakdown.tutoring || 0, color: 'bg-teal-500', icon: <GraduationCap size={16} /> },
    { label: 'Creator Studio (10%)', value: data.breakdown.creator_studio || 0, color: 'bg-pink-500', icon: <ArrowUpRight size={16} /> },
    { label: 'Subscriptions (30%)', value: data.breakdown.subscriptions || 0, color: 'bg-yellow-500', icon: <Gift size={16} /> },
  ];

  const totalBreakdown = breakdownItems.reduce((sum, item) => sum + (item.value || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto">
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-yellow-500/30">
            <Wallet size={30} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Platform Dashboard</h1>
            <p className="text-gray-400 text-sm">Owner-only · All revenue in one place</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Fees', value: `$${Number(data.total_platform_fees || 0).toFixed(2)}`, icon: <DollarSign size={24} />, color: 'from-green-400 to-emerald-600' },
            { label: 'This Month', value: `$${Number(data.monthly_platform_fees || 0).toFixed(2)}`, icon: <TrendingUp size={24} />, color: 'from-blue-400 to-indigo-600' },
            { label: 'All Sources', value: `$${Number(totalBreakdown).toFixed(2)}`, icon: <Wallet size={24} />, color: 'from-purple-400 to-pink-600' },
            { label: 'Your Wallet', value: `$${Number(user?.wallet?.balance || 0).toFixed(2)}`, icon: <ArrowUpRight size={24} />, color: 'from-orange-400 to-red-600' },
          ].map((card, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/10">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>{card.icon}</div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{card.label}</p>
              <p className="text-3xl font-bold text-white mt-1">{card.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <h2 className="text-lg font-bold text-white mb-4">📊 All Revenue Sources</h2>
            <div className="space-y-3">
              {breakdownItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-gray-400 text-xs">{item.icon}</span>
                  <span className="flex-1 text-gray-300 text-sm">{item.label}</span>
                  <span className="text-white font-bold">${Number(item.value || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Download size={18} /> Withdraw to Wallet</h2>
              <div className="flex gap-2">
                <input value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} type="number" placeholder="Amount $" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
                <button onClick={handleWithdraw} className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition">
                  <Download size={16} />
                </button>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Send size={18} /> Transfer to User</h2>
              <div className="flex gap-2">
                <input value={transferAmount} onChange={e => setTransferAmount(e.target.value)} type="number" placeholder="Amount $" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
                <input value={transferTarget} onChange={e => setTransferTarget(e.target.value)} placeholder="Username" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
                <button onClick={handleTransfer} className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition">
                  <Send size={16} />
                </button>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Heart size={18} /> Donate</h2>
              <div className="flex gap-2">
                <input value={donateAmount} onChange={e => setDonateAmount(e.target.value)} type="number" placeholder="Amount $" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
                <button onClick={handleDonate} className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition">
                  <Heart size={16} />
                </button>
              </div>
            </div>

            <button onClick={fetchDashboard} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 text-sm font-semibold hover:bg-white/10 transition flex items-center justify-center gap-2">
              <RefreshCw size={16} /> Refresh Data
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
