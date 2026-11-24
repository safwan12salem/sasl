import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export default function VerifyEmail() {
  const { verifyEmail, resendCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const email = (location.state as any)?.email || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return toast.error('Enter 6-digit code');
    setLoading(true);
    try {
      await verifyEmail(email, code);
      toast.success('Email verified!');
      const onboarded = localStorage.getItem('sasl_onboarded');
      navigate(onboarded ? '/' : '/onboarding', { replace: true });
    } catch (err: any) {
      const errMsg = err.response?.data?.error;
      if (errMsg === 'code_expired') toast.error('Code expired. Resend.');
      else toast.error('Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendCode(email);
      toast.success('New code sent!');
    } catch {
      toast.error('Could not resend');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4">
      <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-2">Verify your email</h1>
        <p className="text-gray-400 mb-6">We sent a 6-digit code to {email}</p>
        <form onSubmit={handleVerify}>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full text-center text-3xl tracking-widest bg-gray-800 text-white rounded-xl py-4 mb-4"
          />
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-3 bg-green-500 text-white rounded-xl font-bold disabled:opacity-50 mb-3"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>
        <button
          onClick={handleResend}
          disabled={resending}
          className="w-full py-2 text-sm text-gray-400 hover:text-white"
        >
          {resending ? 'Sending...' : 'Resend code'}
        </button>
      </div>
    </div>
  );
}