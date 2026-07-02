import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4 transition">
        <ArrowLeft size={18} /> Back
      </button>
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: July 2, 2026</p>
      
      <div className="space-y-6 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
          <p>We collect: username, email, profile information you provide, content you post, transaction data for payments, and device information for WaveMesh connectivity. We do NOT collect your messages content (they are end-to-end encrypted).</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">2. How We Use Information</h2>
          <p>Your information is used to: provide the Sasl service, process payments, improve the platform, send notifications you opt into, and comply with legal obligations. We never sell your personal data.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">3. WaveMesh & Privacy</h2>
          <p>WaveMesh messages are end-to-end encrypted. Relay nodes in the mesh network cannot read your messages — they only forward encrypted data. Your Mesh ID is shared only when you choose to share it for connection purposes.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">4. Data Storage & Security</h2>
          <p>Data is stored on secure servers (Render/Postgres). Media files are stored on Cloudinary. We use industry-standard encryption for data at rest and in transit. You can request data deletion at any time.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">5. Your Rights</h2>
          <p>You have the right to: access your data, correct inaccurate data, delete your account and data, export your data, and opt out of marketing communications. Contact us to exercise these rights.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">6. Cookies</h2>
          <p>Sasl uses essential cookies for authentication and security. We do not use tracking cookies for advertising purposes on the core platform.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">7. Contact</h2>
          <p>Privacy questions? Contact us at: <a href="mailto:sasl.app.contact@gmail.com" className="text-green-600">sasl.app.contact@gmail.com</a></p>
        </section>
      </div>
    </div>
  );
}
