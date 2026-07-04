import React, { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { AlertTriangle, Flag, UserX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ReportPage() {
  const { t } = useTranslation();
  const [type, setType] = useState<'content' | 'user'>('content');
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitReport = async () => {
    if (!targetId.trim()) return toast.error(t('enter_post_id'));
    if (!reason) return toast.error(t('select_reason'));
    setSubmitting(true);
    try {
      if (type === 'content') {
        await api.post(`/content/posts/${targetId}/report/`, { reason });
      } else {
        await api.post('/users/report/', { username: targetId, reason });
      }
      toast.success(t('report_submitted'));
      setTargetId(''); setReason('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('report_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const reasons = [
    { value: 'harassment', label: t('harassment') },
    { value: 'spam', label: t('spam') },
    { value: 'hate_speech', label: t('hate_speech') },
    { value: 'inappropriate', label: t('inappropriate_content') },
    { value: 'fake', label: t('fake_account') },
    { value: 'intellectual', label: t('intellectual_property') },
    { value: 'other', label: t('other_violation') },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 max-w-2xl mx-auto">
      <button onClick={() => window.history.back()} className="text-sm text-orange-600 hover:underline mb-4 inline-block">← {t('back')}</button>
      
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-900/30">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('report_problem')}</h1>
          <p className="text-sm text-gray-500">{t('report_review_24h')}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex gap-3">
          <button onClick={() => setType('content')} className={`flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${type === 'content' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
            <Flag size={16} /> {t('report_content')}
          </button>
          <button onClick={() => setType('user')} className={`flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${type === 'user' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
            <UserX size={16} /> {t('report_user')}
          </button>
        </div>
        
        <div>
          <label className="block text-sm font-semibold mb-1">{type === 'content' ? t('post_content_id') : t('username')}</label>
          <input value={targetId} onChange={e => setTargetId(e.target.value)} placeholder={type === 'content' ? t('enter_post_id') : t('enter_username')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:border-red-500" />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">{t('reason')}</label>
          <div className="space-y-1.5">
            {reasons.map(r => (
              <button key={r.value} onClick={() => setReason(r.value)} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition ${reason === r.value ? 'bg-red-100 dark:bg-red-900/30 text-red-700 font-semibold' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={submitReport} disabled={submitting} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition disabled:opacity-50">
          {submitting ? t('submitting') : t('submit_report')}
        </button>
      </div>
    </div>
  );
}
