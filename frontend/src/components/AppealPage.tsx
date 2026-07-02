import React, { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { AlertTriangle, MessageSquare } from 'lucide-react';

export default function AppealPage() {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitAppeal = async () => {
    if (!reason.trim()) return toast.error('Please explain your appeal');
    setSubmitting(true);
    try {
      await api.post('/moderation/appeals/', { reason });
      toast.success('Appeal submitted. We will review it within 48 hours.');
      setReason('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to submit appeal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-2xl bg-orange-100 dark:bg-orange-900/30">
          <AlertTriangle size={28} className="text-orange-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Appeal a Decision</h1>
          <p className="text-sm text-gray-500">If your account was warned or banned, you can appeal here</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Explain your appeal</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why you believe the warning/ban should be lifted..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:border-orange-500" rows={5} />
        </div>

        <button onClick={submitAppeal} disabled={submitting} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
          <MessageSquare size={16} /> {submitting ? 'Submitting...' : 'Submit Appeal'}
        </button>
      </div>
    </div>
  );
}
