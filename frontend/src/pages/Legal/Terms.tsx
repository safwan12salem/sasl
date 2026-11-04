import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 mb-6">
          <ArrowLeft size={18} /> Back to Sasl
        </Link>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-10 shadow-lg">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white">Terms of Service</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Last Updated: November 4, 2026</p>

          <section className="space-y-6 text-gray-700 dark:text-gray-300">
            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">1. Acceptance of Terms</h2>
              <p>By downloading, accessing, or using the Sasl application ("App," "Service," "we," "us," or "our"), you agree to be bound by these Terms of Service. If you do not agree, do not use the App.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">2. Description of Service</h2>
              <p>Sasl is an offline-first social layer that utilizes Bluetooth Low Energy (BLE) mesh networking to enable peer-to-peer communication and transactions. The Service includes social feeds, messaging, marketplaces, and a digital wallet.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">3. Eligibility and Account Registration</h2>
              <p>You must be at least 13 years of age (or the minimum age in your jurisdiction) to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">4. User Conduct and Content</h2>
              <p className="mb-2">You agree not to use the Service to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Post or transmit any content that is unlawful, harassing, defamatory, obscene, or infringes on any third party's intellectual property.</li>
                <li>Engage in fraud, scams, or deceptive practices within the Marketplace or Gigs features.</li>
                <li>Attempt to reverse engineer, decompile, or hack the App or its mesh networking protocols.</li>
                <li>Use the App while driving or in any situation requiring full attention (see Device Safety Disclaimer).</li>
              </ul>
              <p className="mt-2">You retain ownership of content you post. By posting, you grant Sasl a non-exclusive, worldwide, royalty-free license to host, display, and distribute your content within the App and its mesh network. We reserve the right to remove content that violates these Terms.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">5. Marketplace, Gigs, and Escrow</h2>
              <p className="mb-2">Sasl facilitates transactions between users. <strong>We are not a party to any transaction between users.</strong> You acknowledge that:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>All payments are held in an in-app escrow system until the buyer confirms delivery or the seller confirms service completion.</li>
                <li>Sasl charges a platform fee (currently 8-10%, subject to change) on completed transactions.</li>
                <li>Disputes must be resolved between users. Sasl may, at its sole discretion, intervene to release or refund escrow funds, but is not obligated to do so.</li>
                <li>You are solely responsible for complying with local tax laws regarding your earnings.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">6. Wallet and Withdrawals</h2>
              <p>Your Sasl wallet represents a balance of funds owed to you by the platform. Withdrawal requests are processed manually or via third-party payment processors (when available). We reserve the right to freeze wallets and withhold funds if we detect fraudulent activity, a violation of these Terms, or a legal requirement to do so.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">7. WaveMesh and Offline Communications</h2>
              <p className="mb-2">You acknowledge that:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>WaveMesh relies on Bluetooth Low Energy. Message delivery is not guaranteed and depends on physical proximity of users.</li>
                <li>Messages sent via the Echo Relay are encrypted end-to-end. Sasl cannot read your relayed messages. However, <strong>metadata</strong> (sender, recipient, timestamp) may be visible to intermediate relay nodes.</li>
                <li>You are responsible for the security of your device and the physical safety of using the App in your environment.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">8. Limitation of Liability</h2>
              <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, SASL SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Your use of or inability to use the Service.</li>
                <li>Any conduct or content of any third party on the Service.</li>
                <li>Any unauthorized access, use, or alteration of your transmissions or content.</li>
                <li>The physical safety risks of using Bluetooth mesh networking.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">9. Indemnification</h2>
              <p>You agree to defend, indemnify, and hold harmless Sasl, its officers, directors, employees, and agents, from and against any claims, liabilities, damages, losses, and expenses, including reasonable legal fees, arising out of or in any way connected with your access to or use of the Service or your violation of these Terms.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">10. Governing Law</h2>
              <p>These Terms shall be governed by the laws of Libya, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of Libya.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">11. Changes to Terms</h2>
              <p>We may update these Terms from time to time. Continued use of the App constitutes acceptance of the new Terms.</p>
            </div>
          </section>

          <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 text-sm">
            <Link to="/legal/privacy" className="text-green-600 hover:underline">Privacy Policy</Link>
            <Link to="/legal/safety" className="text-green-600 hover:underline">Device Safety</Link>
            <Link to="/legal/guidelines" className="text-green-600 hover:underline">Community Guidelines</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;