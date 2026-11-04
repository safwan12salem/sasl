import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';

const Guidelines: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 mb-6">
          <ArrowLeft size={18} /> Back to Sasl
        </Link>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-10 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-green-500" size={32} />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Community Guidelines</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Last Updated: November 4, 2026</p>

          <section className="space-y-6 text-gray-700 dark:text-gray-300">
            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">1. Be Respectful</h2>
              <p>Harassment, hate speech, and bullying are not tolerated. Treat others with respect, even when you disagree.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">2. No Illegal Activity</h2>
              <p>Do not use Sasl to facilitate illegal transactions, share illegal content, or engage in any activity that violates local or international law.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">3. Marketplace Integrity</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Do not post fraudulent listings or misrepresent your products/services.</li>
                <li>Honor your commitments. If you agree to a gig or sale, complete it.</li>
                <li>Do not attempt to circumvent the escrow system to avoid platform fees.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">4. WaveMesh Conduct</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Do not use WaveMesh to spam other users or flood the relay network.</li>
                <li>Do not attempt to intercept or decrypt messages that are not addressed to you.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">5. Reporting</h2>
              <p>If you see content or behavior that violates these guidelines, report it via the in-app report button or contact support@sasl.app. We review all reports and may suspend or ban accounts that violate these rules.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">6. Enforcement</h2>
              <p>Violations may result in content removal, temporary suspension, or permanent account termination. We reserve the right to take any action necessary to protect our users and the platform.</p>
            </div>
          </section>

          <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 text-sm">
            <Link to="/terms" className="text-green-600 hover:underline">Terms of Service</Link>
            <Link to="/privacy" className="text-green-600 hover:underline">Privacy Policy</Link>
            <Link to="/legal/safety" className="text-green-600 hover:underline">Device Safety</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guidelines;