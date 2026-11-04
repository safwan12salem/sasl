import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

const Safety: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 mb-6">
          <ArrowLeft size={18} /> Back to Sasl
        </Link>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-10 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="text-amber-500" size={32} />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Device Safety Disclaimer</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Last Updated: November 4, 2026</p>

          <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 mb-8 rounded-r-lg">
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              PLEASE READ THIS DISCLAIMER CAREFULLY BEFORE USING SASL.
            </p>
          </div>

          <section className="space-y-6 text-gray-700 dark:text-gray-300">
            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">1. Bluetooth and Physical Safety</h2>
              <p className="mb-2">Sasl uses Bluetooth Low Energy (BLE) to enable offline communication. You acknowledge that:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Using a mobile device while driving, cycling, or operating heavy machinery is dangerous and may be illegal in your jurisdiction.</li>
                <li><strong>Do not interact with the Sasl App while driving or in any situation requiring your full attention.</strong></li>
                <li>Bluetooth signals may interfere with sensitive medical devices (e.g., pacemakers). Consult your doctor if you have concerns.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">2. Mesh Networking Risks</h2>
              <p className="mb-2">The WaveMesh and Echo Relay features rely on other users' devices to relay messages. You acknowledge that:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Sasl cannot guarantee message delivery.</li>
                <li>Using the App in hazardous environments (e.g., construction sites, industrial areas) is at your own risk.</li>
                <li>You are responsible for your physical safety and the security of your device while using the App.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">3. No Emergency Services</h2>
              <p>Sasl is <strong>NOT</strong> a substitute for emergency services. The App cannot be used to contact police, fire, or medical emergency services. In an emergency, use your phone's standard emergency calling feature.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">4. Battery and Device Performance</h2>
              <p>Continuous Bluetooth scanning and advertising may drain your battery and cause your device to heat up. Monitor your device's temperature and battery level.</p>
            </div>
          </section>

          <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 text-sm">
            <Link to="/terms" className="text-green-600 hover:underline">Terms of Service</Link>
            <Link to="/privacy" className="text-green-600 hover:underline">Privacy Policy</Link>
            <Link to="/legal/guidelines" className="text-green-600 hover:underline">Community Guidelines</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Safety;