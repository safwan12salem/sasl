import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Target, BarChart3 } from 'lucide-react';

export default function AdvertisePage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-8 rounded-2xl">
        <h1 className="text-4xl font-bold gradient-text mb-4">Advertise on Sasl</h1>
        <p className="text-gray-600 mb-8">Reach thousands of engaged users — starting at just $50</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow text-center">
            <Target size={40} className="mx-auto text-green-500 mb-3" />
            <h3 className="font-bold text-lg">Targeted Reach</h3>
            <p className="text-sm text-gray-500">Target by interest, location, and device</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow text-center">
            <BarChart3 size={40} className="mx-auto text-blue-500 mb-3" />
            <h3 className="font-bold text-lg">Real Analytics</h3>
            <p className="text-sm text-gray-500">Track impressions, clicks, and conversions</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow text-center">
            <DollarSign size={40} className="mx-auto text-yellow-500 mb-3" />
            <h3 className="font-bold text-lg">Affordable CPC</h3>
            <p className="text-sm text-gray-500">Starting at $0.05 per click</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl text-center">
          <h2 className="text-2xl font-bold mb-2">Ready to advertise?</h2>
          <p className="text-gray-600 mb-4">Contact us at <strong>ads@sasl.app</strong></p>
          <p className="text-sm text-gray-500">Or create campaigns directly in the admin panel after account setup</p>
        </div>
      </motion.div>
    </div>
  );
}