import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 mb-6">
          <ArrowLeft size={18} /> Back to Sasl
        </Link>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-10 shadow-lg">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white">Privacy Policy</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Last Updated: November 4, 2026</p>

          <section className="space-y-6 text-gray-700 dark:text-gray-300">
            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">1. Information We Collect</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Account Information:</strong> Username, email, password (hashed), profile avatar.</li>
                <li><strong>Content:</strong> Posts, messages, photos, and videos you upload to the Service.</li>
                <li><strong>Transaction Data:</strong> Records of purchases, sales, wallet balances, and escrow transactions.</li>
                <li><strong>Device Information:</strong> IP address, device type, operating system, and app version.</li>
                <li><strong>Mesh Data:</strong> When using WaveMesh, your device broadcasts a temporary node ID. Message content is end-to-end encrypted; only metadata (routing information) is visible to relay nodes.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>To provide, maintain, and improve the Service.</li>
                <li>To process transactions and maintain your wallet.</li>
                <li>To communicate with you about updates, security alerts, and support.</li>
                <li>To detect and prevent fraud and abuse.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">3. Data Sharing and Disclosure</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>With Other Users:</strong> Your username, avatar, posts, and public profile information are visible to other users.</li>
                <li><strong>With Service Providers:</strong> We use third-party services (e.g., Supabase for database, Render for backend hosting) that may process your data on our behalf.</li>
                <li><strong>For Legal Reasons:</strong> We may disclose information if required by law or in response to valid legal requests.</li>
                <li><strong>We Do Not Sell Your Personal Data.</strong></li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">4. Data Retention and Deletion</h2>
              <p>You may request deletion of your account and personal data at any time through the App settings. We will delete your data within 30 days, except where required for legal or tax purposes.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">5. Your Rights (GDPR/CCPA)</h2>
              <p>If you are in the European Economic Area or California, you have the right to access, correct, or delete your personal data. To exercise these rights, contact us at support@sasl.app.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">6. Data Security</h2>
              <p>We use industry-standard measures to protect your data. WaveMesh messages are end-to-end encrypted. However, no method of transmission over the internet or electronic storage is 100% secure.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">7. International Data Transfers</h2>
              <p>Your data may be transferred to and processed in countries outside your own, including the United States (where our backend is hosted). We rely on Standard Contractual Clauses where applicable.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">8. Children's Privacy</h2>
              <p>The Service is not intended for children under 13. We do not knowingly collect data from children under 13.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">9. Contact Us</h2>
              <p>For privacy-related questions, contact: support@sasl.app</p>
            </div>
          </section>

          <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 text-sm">
            <Link to="/legal/terms" className="text-green-600 hover:underline">Terms of Service</Link>
            <Link to="/legal/safety" className="text-green-600 hover:underline">Device Safety</Link>
            <Link to="/legal/guidelines" className="text-green-600 hover:underline">Community Guidelines</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;