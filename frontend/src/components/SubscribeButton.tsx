/**
 * Sasl - Social Asynchronous Sharing Layer
 * Subscribe button for creators.
 */
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Props {
  creatorUsername: string;
}

const SubscribeButton: React.FC<Props> = ({ creatorUsername }) => {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [tier, setTier] = useState('basic');
  const [price, setPrice] = useState(5); // default $5

  useEffect(() => {
    if (!user) return;
    // Check if already subscribed
    api.get(`/users/subscriptions/?creator=${creatorUsername}`)
      .then(res => {
        if (res.data.results && res.data.results.length > 0) {
          setSubscribed(true);
          setTier(res.data.results[0].tier);
        }
      })
      .catch(() => {});
  }, [creatorUsername, user]);

  const handleSubscribe = async () => {
    try {
      await api.post('/users/subscriptions/', {
        creator_username: creatorUsername,
        tier: tier,
        amount: price
      });
      setSubscribed(true);
      toast.success(`Subscribed to ${creatorUsername}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Subscription failed');
    }
  };

  const handleCancel = async () => {
    // Find subscription id and delete
    const res = await api.get(`/users/subscriptions/?creator=${creatorUsername}`);
    if (res.data.results.length > 0) {
      const subId = res.data.results[0].id;
      await api.delete(`/users/subscriptions/${subId}/`);
      setSubscribed(false);
      toast('Unsubscribed');
    }
  };

  if (!user || user.username === creatorUsername) return null;

  return (
    <div className="mt-2">
      {subscribed ? (
        <button onClick={handleCancel} className="btn-ghost text-xs py-1 px-3">
          Subscribed (cancel)
        </button>
      ) : (
        <div className="flex gap-2 items-center">
          <select className="border rounded px-2 py-1 text-xs" value={tier} onChange={e => setTier(e.target.value)}>
            <option value="basic">Basic $5</option>
            <option value="pro">Pro $10</option>
            <option value="vip">VIP $20</option>
          </select>
          <button onClick={handleSubscribe} className="btn-primary text-xs py-1 px-3">
            Subscribe
          </button>
        </div>
      )}
    </div>
  );
};

export default SubscribeButton;