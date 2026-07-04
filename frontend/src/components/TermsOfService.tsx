import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
export default function TermsOfService() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4 transition">
        <ArrowLeft size={18} /> {t('back')}
      </button>
      <h1 className="text-3xl font-bold mb-6">{t('terms_service')}</h1>
      <p className="text-sm text-gray-500 mb-8">{t('last_updated')}: July 2, 2026</p>

      <div className="space-y-6 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. {t('acceptance_terms')}</h2>
          <p>{t('acceptance_desc')}</p>
        </section>
        
        <section>
                   <h2 className="text-xl font-semibold mb-2">2. {t('user_accounts')}</h2>
          <p>{t('user_accounts_desc')}</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">3. {t('content_conduct')}</h2>
          <p>{t('content_conduct_desc')}</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">4. {t('monetization_payments')}</h2>
          <p>{t('monetization_payments_desc')}</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">5. {t('privacy')}</h2>
          <p>{t('privacy_desc')}</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">6. {t('limitation_liability')}</h2>
          <p>{t('limitation_liability_desc')}</p>
        </section>
        
        <section>
                   <h2 className="text-xl font-semibold mb-2">6. {t('contact')}</h2>
          <p>{t('terms_contact')}: sasl.app.contact@gmail.com</p>
        </section>
      </div>
    </div>
  );
}
