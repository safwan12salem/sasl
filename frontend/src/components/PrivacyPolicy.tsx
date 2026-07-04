import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4 transition">
        <ArrowLeft size={18} /> {t('back')}
      </button>
      <h1 className="text-3xl font-bold mb-6">{t('privacy_policy')}</h1>
      <p className="text-sm text-gray-500 mb-8">{t('last_updated')}: July 2, 2026</p>
      
      <div className="space-y-6 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. {t('information_we_collect')}</h2>
          <p>{t('collect_text')}</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">2. {t('how_use_info')}</h2>
          <p>{t('use_info_text')}</p>
        </section>
        
        <section>
                    <h2 className="text-xl font-semibold mb-2">3. {t('wavemesh_privacy')}</h2>
          <p>{t('mesh_privacy_text')}</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">4. {t('data_storage_security')}</h2>
          <p>{t('storage_security_text')}</p>
        </section>
        
        <section>
                    <h2 className="text-xl font-semibold mb-2">5. {t('your_rights')}</h2>
          <p>{t('your_rights_text')}</p>
        </section>
        
        <section>
                    <h2 className="text-xl font-semibold mb-2">6. {t('cookies')}</h2>
          <p>{t('cookies_text')}</p>
        </section>
        
        <section>
                    <h2 className="text-xl font-semibold mb-2">7. {t('contact')}</h2>
          <p>{t('privacy_contact')}: sasl.app.contact@gmail.com</p>
        </section>
      </div>
    </div>
  );
}
