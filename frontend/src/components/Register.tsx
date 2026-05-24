import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Logo from './Logo';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Zap, Shield, Check } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', username: '', password: '', password2: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const passwordStrength = () => {
    const p = form.password;
    if (p.length === 0) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const validate = () => {
    if (!form.email || !form.username || !form.password) return t('fill_all_fields');
    if (form.password !== form.password2) return t('password_mismatch');
    if (form.password.length < 8) return t('password_short');
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const error = validate();
  if (error) { toast.error(error); return; }
  setLoading(true);
  try {
    await register(form.email, form.username, form.password);
    toast.success(t('registration_success'));
    navigate('/onboarding', { replace: true });
  } catch (err: any) {
    toast.error(err.response?.data?.detail || t('registration_error'));
  } finally {
    setLoading(false);
  }
};

  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-green-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-400/30 rounded-full"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{ y: [0, -20, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2 }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}>
            <Logo className="justify-center scale-125" />
          </motion.div>
          <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="text-2xl font-bold mt-4 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            {t('create_account')}
          </motion.h2>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="border border-white/10 rounded-2xl overflow-hidden flex items-center hover:border-white/20 transition">
              <User size={18} className="ml-5 text-gray-500" />
              <input name="username" placeholder={t('username')} onChange={handleChange}
                className="w-full px-4 py-3.5 bg-transparent text-white placeholder-gray-500 outline-none text-base" />
            </div>

            {/* Email */}
            <div className="border border-white/10 rounded-2xl overflow-hidden flex items-center hover:border-white/20 transition">
              <Mail size={18} className="ml-5 text-gray-500" />
              <input name="email" type="email" placeholder={t('email')} onChange={handleChange}
                className="w-full px-4 py-3.5 bg-transparent text-white placeholder-gray-500 outline-none text-base" />
            </div>

            {/* Password */}
            <div className="border border-white/10 rounded-2xl overflow-hidden flex items-center hover:border-white/20 transition">
              <Lock size={18} className="ml-5 text-gray-500" />
              <input name="password" type={showPassword ? 'text' : 'password'} placeholder={t('password')} onChange={handleChange}
                className="w-full px-4 py-3.5 bg-transparent text-white placeholder-gray-500 outline-none text-base" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="pr-5 text-gray-500 hover:text-gray-300">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Strength */}
            {form.password && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(passwordStrength() / 4) * 100}%` }}
                    className={`h-full rounded-full ${strengthColors[passwordStrength()]}`}
                  />
                </div>
                <span className="text-xs text-gray-500">{strengthLabels[passwordStrength()]}</span>
              </div>
            )}

            {/* Confirm Password */}
            <div className="border border-white/10 rounded-2xl overflow-hidden flex items-center hover:border-white/20 transition">
              <Shield size={18} className="ml-5 text-gray-500" />
              <input name="password2" type="password" placeholder={t('confirm_password')} onChange={handleChange}
                className="w-full px-4 py-3.5 bg-transparent text-white placeholder-gray-500 outline-none text-base" />
              {form.password2 && form.password === form.password2 && (
                <Check size={18} className="mr-5 text-green-400" />
              )}
            </div>

            {/* Submit */}
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all disabled:opacity-50 mt-6">
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }}>
                  <Zap size={20} />
                </motion.div>
              ) : (
                <>{t('sign_up')} <ArrowRight size={20} /></>
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              {t('have_account')}{' '}
              <Link to="/login" className="text-purple-400 font-semibold hover:text-purple-300 transition-colors underline underline-offset-4">
                {t('sign_in')}
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}