import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Target, BarChart3, Megaphone, TrendingUp, Users, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdvertisePage() {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const benefits = [
    {
      icon: <Users size={32} />,
      title: 'Targeted Audience',
      description: 'Reach users by interest, location, and device. Get your brand in front of the right people.',
      color: 'from-green-400 to-emerald-500',
      bg: 'bg-green-50',
    },
    {
      icon: <BarChart3 size={32} />,
      title: 'Real-Time Analytics',
      description: 'Track impressions, clicks, conversions, and ROI with our advanced dashboard.',
      color: 'from-blue-400 to-indigo-500',
      bg: 'bg-blue-50',
    },
    {
      icon: <TrendingUp size={32} />,
      title: 'Performance Based',
      description: 'Pay per click starting at $0.01. Set your budget and only pay for results.',
      color: 'from-purple-400 to-pink-500',
      bg: 'bg-purple-50',
    },
  ];

  const pricingPlans = [
    { name: 'Starter', price: '$50', reach: '5,000', features: ['Basic targeting', 'Image ads', '7-day campaign', 'Basic analytics'] },
    { name: 'Growth', price: '$200', reach: '25,000', features: ['Advanced targeting', 'Image + Video ads', '30-day campaign', 'Full analytics', 'Priority support'] },
    { name: 'Enterprise', price: 'Custom', reach: '100,000+', features: ['All features', 'Dedicated manager', 'Custom audience', 'API access', 'White-label reports'] },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">
      {/* Hero */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-8 md:p-12 text-white"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone size={24} className="text-yellow-300" />
            <span className="text-sm font-semibold text-yellow-200 tracking-wide uppercase">Sasl Ads</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Reach Millions.<br />
            <span className="text-yellow-300">Pay for Results.</span>
          </h1>
          <p className="text-lg text-white/80 mb-8 max-w-xl">
            Launch your ad campaign in minutes. Target the right audience, track every click, and only pay when users engage.
          </p>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/creator-studio')}
              className="px-6 py-3 bg-white text-purple-700 rounded-full font-bold text-sm hover:bg-yellow-300 transition-colors shadow-lg flex items-center gap-2"
            >
              Start Advertising <ArrowRight size={18} />
            </button>
            <p className="text-sm text-white/60">Starting at just $50</p>
          </div>
        </div>
      </motion.div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {benefits.map((benefit, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onMouseEnter={() => setHoveredCard(i)}
            onMouseLeave={() => setHoveredCard(null)}
            className={`${benefit.bg} rounded-2xl p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 ${hoveredCard === i ? 'scale-[1.02]' : ''}`}
          >
            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${benefit.color} text-white mb-4 shadow-lg`}>
              {benefit.icon}
            </div>
            <h3 className="font-bold text-lg mb-2">{benefit.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{benefit.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Pricing */}
      <div>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Simple Pricing</h2>
          <p className="text-gray-500">Choose a plan that fits your budget</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingPlans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className={`bg-white rounded-2xl p-6 border ${i === 1 ? 'border-purple-300 ring-2 ring-purple-100 shadow-xl' : 'border-gray-100'} hover:shadow-lg transition-shadow`}
            >
              {i === 1 && (
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 inline-block">
                  Most Popular
                </span>
              )}
              <h3 className="font-bold text-xl mb-1">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold">{plan.price}</span>
                {plan.price !== 'Custom' && <span className="text-gray-500 text-sm"> /campaign</span>}
              </div>
              <p className="text-sm text-gray-500 mb-4">Up to {plan.reach} impressions</p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => navigate('/creator-studio')}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  i === 1 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Get Started
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8 text-center border border-green-100"
      >
        <h2 className="text-2xl font-bold mb-2">Ready to grow your business?</h2>
        <p className="text-gray-600 mb-4">Join thousands of brands already advertising on Sasl</p>
        <div className="flex items-center justify-center gap-3">
          <button 
            onClick={() => navigate('/creator-studio')}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold text-sm hover:shadow-lg transition-shadow flex items-center gap-2"
          >
            Launch Campaign <ArrowRight size={18} />
          </button>
          <span className="text-sm text-gray-500">or contact <strong>ads@sasl.app</strong></span>
        </div>
      </motion.div>
    </div>
  );
};