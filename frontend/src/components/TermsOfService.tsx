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
      <p className="text-sm text-gray-500 mb-8">{t('last_updated')}: November 4, 2026</p>

      <div className="space-y-6 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
          <p>By downloading, accessing, or using the Sasl application ("App," "Service," "we," "us," or "our"), you agree to be bound by these Terms of Service. If you do not agree, do not use the App.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Description of Service</h2>
          <p>Sasl is an offline-first social layer that utilizes Bluetooth Low Energy (BLE) mesh networking to enable peer-to-peer communication and transactions. The Service includes social feeds, messaging, marketplaces, and a digital wallet.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Eligibility and Account Registration</h2>
          <p>You must be at least 13 years of age (or the minimum age in your jurisdiction) to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. User Conduct and Content</h2>
          <p className="mb-2">You agree not to use the Service to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Post or transmit any content that is unlawful, harassing, defamatory, obscene, or infringes on any third party's intellectual property.</li>
            <li>Engage in fraud, scams, or deceptive practices within the Marketplace or Gigs features.</li>
            <li>Attempt to reverse engineer, decompile, or hack the App or its mesh networking protocols.</li>
            <li>Use the App while driving or in any situation requiring full attention (see Device Safety Disclaimer).</li>
          </ul>
          <p className="mt-2">You retain ownership of content you post. By posting, you grant Sasl a non-exclusive, worldwide, royalty-free license to host, display, and distribute your content within the App and its mesh network. We reserve the right to remove content that violates these Terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Marketplace, Gigs, and Escrow</h2>
          <p className="mb-2">Sasl facilitates transactions between users. <strong>We are not a party to any transaction between users.</strong> You acknowledge that:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>All payments are held in an in-app escrow system until the buyer confirms delivery or the seller confirms service completion.</li>
            <li>Sasl charges a platform fee (currently 8-10%, subject to change) on completed transactions.</li>
            <li>Disputes must be resolved between users. Sasl may, at its sole discretion, intervene to release or refund escrow funds, but is not obligated to do so.</li>
            <li>You are solely responsible for complying with local tax laws regarding your earnings.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Wallet and Withdrawals</h2>
          <p>Your Sasl wallet represents a balance of funds owed to you by the platform. Withdrawal requests are processed manually or via third-party payment processors (when available). We reserve the right to freeze wallets and withhold funds if we detect fraudulent activity, a violation of these Terms, or a legal requirement to do so.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. WaveMesh and Offline Communications</h2>
          <p className="mb-2">You acknowledge that:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>WaveMesh relies on Bluetooth Low Energy. Message delivery is not guaranteed and depends on physical proximity of users.</li>
            <li>Messages sent via the Echo Relay are encrypted end-to-end. Sasl cannot read your relayed messages. However, <strong>metadata</strong> (sender, recipient, timestamp) may be visible to intermediate relay nodes.</li>
            <li>You are responsible for the security of your device and the physical safety of using the App in your environment.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">8. Limitation of Liability</h2>
          <p className="mb-2">TO THE MAXIMUM EXTENT PERMITTED BY LAW, SASL SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your use of or inability to use the Service.</li>
            <li>Any conduct or content of any third party on the Service.</li>
            <li>Any unauthorized access, use, or alteration of your transmissions or content.</li>
            <li>The physical safety risks of using Bluetooth mesh networking.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">9. Indemnification</h2>
          <p>You agree to defend, indemnify, and hold harmless Sasl, its officers, directors, employees, and agents, from and against any claims, liabilities, damages, losses, and expenses, including reasonable legal fees, arising out of or in any way connected with your access to or use of the Service or your violation of these Terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">10. Governing Law</h2>
          <p>These Terms shall be governed by the laws of Libya, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of Libya.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">11. Changes to Terms</h2>
          <p>We may update these Terms from time to time. Continued use of the App constitutes acceptance of the new Terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">12. Contact</h2>
          <p>{t('terms_contact')}: sasl.app.contact@gmail.com</p>
        </section>
      </div>
    </div>
  );
}