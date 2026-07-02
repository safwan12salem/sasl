import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4 transition">
        <ArrowLeft size={18} /> Back
      </button>
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: July 2, 2026</p>
      
      <div className="space-y-6 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using Sasl, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">2. User Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate information during registration. Sasl reserves the right to suspend or terminate accounts that violate these terms.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">3. Content & Conduct</h2>
          <p>Users are solely responsible for content they post. Prohibited content includes: harassment, hate speech, illegal content, spam, and content that infringes intellectual property rights. Sasl may remove content and warn/ban users at its discretion.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">4. Monetization & Payments</h2>
          <p>Sasl charges platform fees on marketplace transactions (5%), subscriptions (30%), and other services as disclosed. Payouts are processed via Stripe. Users are responsible for any taxes applicable to their earnings.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">5. Privacy</h2>
          <p>Your use of Sasl is also governed by our Privacy Policy. We use end-to-end encryption for WaveMesh communications. See our Privacy Policy for details.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">6. Limitation of Liability</h2>
          <p>Sasl is provided "as is" without warranties. We are not liable for damages arising from use of the service. The WaveMesh offline feature depends on user density and device capabilities.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">7. Contact</h2>
          <p>Questions about these terms? Contact us at: <a href="mailto:sasl.app.contact@gmail.com" className="text-green-600">sasl.app.contact@gmail.com</a></p>
        </section>
      </div>
    </div>
  );
}
