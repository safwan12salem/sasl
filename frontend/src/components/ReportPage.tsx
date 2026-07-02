import React, { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Flag, AlertTriangle, Shield } from 'lucide-react';

export default function ReportPage() {
  const [reportType, setReportType] = useState<'content' | 'user'>('content');
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reasons = [
    'Harassment or bullying',
    'Spam or scam',
    'Hate speech',
    'Inappropriate content',
    'Fake account',
    'Intellectual property violation',
    'Other violation',
  ];

  const submitReport = async () => {
    if (!targetId.trim() || !reason) return toast.error('Please fill all fields');
    setSubmitting(true);
    try {
      if (reportType === 'content') {
        await api.post(`/content/posts/${targetId}/report/`, { reason });
      } else {
        await api.post('/users/report/', { username: targetId, reason });
      }
      toast.success('Report submitted. We will review it within 24 hours.');
      setTargetId(''); setReason('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-900/30">
          <Shield size={28} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Report a Problem</h1>
          <p className="text-sm text-gray-500">We take all reports seriously and review within 24 hours</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setReportType('content')} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${reportType === 'content' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600'}`}>Report Content</button>
          <button onClick={() => setReportType('user')} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${reportType === 'user' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600'}`}>Report User</button>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
            {reportType === 'content' ? 'Post/Content ID' : 'Username'}
          </label>
          <input value={targetId} onChange={e => setTargetId(e.target.value)} placeholder={reportType === 'content' ? 'Enter post ID...' : 'Enter username...'} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:border-red-500" />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Reason</label>
          <div className="space-y-2">
            {reasons.map(r => (
              <button key={r} onClick={() => setReason(r)} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition ${reason === r ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500 text-red-700' : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent text-gray-600'}`}>{r}</button>
            ))}
          </div>
        </div>

        <button onClick={submitReport} disabled={submitting} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
          <Flag size={16} /> {submitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </div>
    </div>
  );
}
