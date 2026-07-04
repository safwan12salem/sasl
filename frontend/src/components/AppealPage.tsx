import React, { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { AlertTriangle, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AppealPage() {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitAppeal = async () => {
    if (!reason.trim()) return toast.error(t('please_explain_appeal'));
    setSubmitting(true);
    try {
      await api.post('/moderation/appeals/', { reason });
      toast.success(t('appeal_submitted_review'));
      setReason('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('appeal_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 max-w-2xl mx-auto">
      <button onClick={() => window.history.back()} className="text-sm text-orange-600 hover:underline mb-4 inline-block">← {t('back')}</button>
      
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-2xl bg-orange-100 dark:bg-orange-900/30">
          <AlertTriangle size={28} className="text-orange-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('appeal_decision')}</h1>
          <p className="text-sm text-gray-500">{t('appeal_description')}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">{t('explain_appeal')}</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder={t('explain_appeal_placeholder')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:border-orange-500" rows={5} />
        </div>

        <button onClick={submitAppeal} disabled={submitting} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
          <MessageSquare size={16} /> {submitting ? t('submitting_appeal') : t('submit_appeal')}
        </button>
      </div>
    </div>
  );
}
