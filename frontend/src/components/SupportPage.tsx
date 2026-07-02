import React from 'react';
import { Shield, AlertTriangle, Flag, MessageSquare, Mail, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SupportPage() {
  const navigate = useNavigate();

  const links = [
    { icon: <Flag size={20} />, title: 'Report Content or User', desc: 'Report inappropriate content, spam, or harassment', action: () => navigate('/report') },
    { icon: <AlertTriangle size={20} />, title: 'Appeal a Decision', desc: 'If your account was warned or banned', action: () => navigate('/appeal') },
    { icon: <Shield size={20} />, title: 'Terms of Service', desc: 'Read our terms and conditions', action: () => navigate('/terms') },
    { icon: <Shield size={20} />, title: 'Privacy Policy', desc: 'How we handle your data', action: () => navigate('/privacy') },
    { icon: <Mail size={20} />, title: 'Contact Us', desc: 'Email us at sasl.app.contact@gmail.com', action: () => window.location.href = 'mailto:sasl.app.contact@gmail.com' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Help & Support</h1>
              <button onClick={() => window.history.back()} className="text-sm text-green-600 hover:underline mt-2 inline-block">← Back to Sasl</button>
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
