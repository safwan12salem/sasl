import React from 'react';
import { Shield, AlertTriangle, Flag, Mail, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function SupportPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const links = [
    { icon: <Flag size={20} />, title: t('report_content_or_user'), desc: t('report_inappropriate'), action: () => navigate('/report') },
    { icon: <AlertTriangle size={20} />, title: t('appeal_decision'), desc: t('appeal_description'), action: () => navigate('/appeal') },
    { icon: <Shield size={20} />, title: t('terms_of_service'), desc: t('read_terms'), action: () => navigate('/terms') },
    { icon: <Shield size={20} />, title: t('privacy_policy'), desc: t('how_we_handle_data'), action: () => navigate('/privacy') },
    { icon: <Mail size={20} />, title: t('contact_us'), desc: t('email_us_at'), action: () => window.location.href = 'mailto:sasl.app.contact@gmail.com' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 max-w-2xl mx-auto">
      <button onClick={() => window.history.back()} className="text-sm text-green-600 hover:underline mb-4 inline-block">← {t('back_to_sasl')}</button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">{t('help_support')}</h1>
      <div className="space-y-3">
        {links.map((link, i) => (
          <button key={i} onClick={link.action} className="w-full flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition text-left">
            <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600">{link.icon}</div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">{link.title}</p>
              <p className="text-sm text-gray-500">{link.desc}</p>
            </div>
            <ExternalLink size={16} className="text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
}
