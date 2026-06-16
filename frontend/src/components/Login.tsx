import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Logo from './Logo';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, ArrowRight, Eye, EyeOff, Zap } from 'lucide-react';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  React.useEffect(() => {
    if (user) {
      const onboarded = localStorage.getItem('sasl_onboarded');
      navigate(onboarded ? '/' : '/onboarding', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!email || !password) return toast.error(t('fill_all_fields'));
  setLoading(true);
  try {
    await login(email, password);
    toast.success(t('welcome_back'));
    const onboarded = localStorage.getItem('sasl_onboarded');
    navigate(onboarded ? '/' : '/onboarding', { replace: true });
  } catch (err: any) {
    toast.error(err.message || t('login_error'));
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px]" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-green-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo section */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          >
            <Logo className="justify-center scale-150" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-gray-400 mt-4 text-sm tracking-widest uppercase"
          >
            {t('login_tagline')}
          </motion.p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="relative">
              <motion.div
                animate={{
                  borderColor: focused === 'email' ? 'rgba(74, 222, 128, 0.5)' : 'rgba(255,255,255,0.1)',
                }}
                className="border rounded-2xl overflow-hidden transition-colors"
              >
                <div className="flex items-center">
                  <div className="pl-5">
                    <Mail size={18} className={focused === 'email' ? 'text-green-400' : 'text-gray-500'} />
                  </div>
                  <input
                    type="email"
                    placeholder={t('email')}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    className="w-full px-4 py-4 bg-transparent text-white placeholder-gray-500 outline-none text-base"
                  />
                </div>
              </motion.div>
            </div>

            {/* Password */}
            <div className="relative">
              <motion.div
                animate={{
                  borderColor: focused === 'password' ? 'rgba(74, 222, 128, 0.5)' : 'rgba(255,255,255,0.1)',
                }}
                className="border rounded-2xl overflow-hidden transition-colors"
              >
                <div className="flex items-center">
                  <div className="pl-5">
                    <Lock size={18} className={focused === 'password' ? 'text-green-400' : 'text-gray-500'} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('password')}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    className="w-full px-4 py-4 bg-transparent text-white placeholder-gray-500 outline-none text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pr-5 text-gray-500 hover:text-gray-300 transition"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }}>
                  <Zap size={20} />
                </motion.div>
              ) : (
                <>{t('sign_in')} <ArrowRight size={20} /></>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-gray-500 text-xs uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Register link */}
          <div className="text-center">
            <p className="text-gray-500 text-sm">
              {t('no_account')}{' '}
              <Link to="/register" className="text-green-400 font-semibold hover:text-green-300 transition-colors underline underline-offset-4">
                {t('register_here')}
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-6">
          Secured by WaveMesh™ • End-to-end encrypted
        </p>
      </motion.div>
    </div>
  );
}