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
      <p className="text-sm text-gray-500 mb-8">{t('last_updated')}: November 4, 2026</p>

      <div className="space-y-6 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Account Information:</strong> Username, email, password (hashed), profile avatar.</li>
            <li><strong>Content:</strong> Posts, messages, photos, and videos you upload to the Service.</li>
            <li><strong>Transaction Data:</strong> Records of purchases, sales, wallet balances, and escrow transactions.</li>
            <li><strong>Device Information:</strong> IP address, device type, operating system, and app version.</li>
            <li><strong>Mesh Data:</strong> When using WaveMesh, your device broadcasts a temporary node ID. Message content is end-to-end encrypted; only metadata (routing information) is visible to relay nodes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To provide, maintain, and improve the Service.</li>
            <li>To process transactions and maintain your wallet.</li>
            <li>To communicate with you about updates, security alerts, and support.</li>
            <li>To detect and prevent fraud and abuse.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. WaveMesh Privacy</h2>
          <p>Messages sent via WaveMesh and the Echo Relay are end-to-end encrypted using AES-256-GCM. Sasl cannot read your relayed messages. However, intermediate relay nodes may see metadata (sender, recipient, timestamp) as they forward your encrypted messages. Your device also broadcasts a temporary node ID when scanning for peers; this ID is not linked to your account.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Data Sharing and Disclosure</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>With Other Users:</strong> Your username, avatar, posts, and public profile information are visible to other users.</li>
            <li><strong>With Service Providers:</strong> We use third-party services (e.g., Supabase for database, Render for backend hosting) that may process your data on our behalf.</li>
            <li><strong>For Legal Reasons:</strong> We may disclose information if required by law or in response to valid legal requests.</li>
            <li><strong>We Do Not Sell Your Personal Data.</strong></li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Data Storage and Security</h2>
          <p>We use industry-standard measures to protect your data. WaveMesh messages are end-to-end encrypted. Your data is stored on encrypted PostgreSQL databases (via Supabase) and transmitted over HTTPS/WSS. However, no method of transmission over the internet or electronic storage is 100% secure.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Data Retention and Deletion</h2>
          <p>You may request deletion of your account and personal data at any time through the App settings. We will delete your data within 30 days, except where required for legal or tax purposes.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. Your Rights (GDPR/CCPA)</h2>
          <p>If you are in the European Economic Area or California, you have the right to access, correct, or delete your personal data. To exercise these rights, contact us at sasl.app.contact@gmail.com.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">8. International Data Transfers</h2>
          <p>Your data may be transferred to and processed in countries outside your own, including the United States (where our backend is hosted). We rely on Standard Contractual Clauses where applicable.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">9. Cookies</h2>
          <p>We use minimal cookies and localStorage for authentication (JWT tokens) and user preferences (language, theme). We do not use third-party tracking cookies.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">10. Children's Privacy</h2>
          <p>The Service is not intended for children under 13. We do not knowingly collect data from children under 13.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">11. Contact</h2>
          <p>{t('privacy_contact')}: sasl.app.contact@gmail.com</p>
        </section>
      </div>
    </div>
  );
}