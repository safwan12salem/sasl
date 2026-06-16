import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../services/api';
import toast from 'react-hot-toast';
import { DollarSign, Loader2, X } from 'lucide-react';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

function PaymentForm({ amount, onSuccess, onClose, type = 'topup' }: { 
  amount: number; onSuccess: () => void; onClose: () => void; type?: string 
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);

    try {
      if (type === 'topup') {
        const { data } = await api.post('/payments/create_intent/', { amount });
        const result = await stripe.confirmCardPayment(data.client_secret || data.payment_intent_id, {
          payment_method: { 
            card: elements.getElement(CardElement)!,
            billing_details: { name, email }
          },
        });
        if (result.error) toast.error(result.error.message || 'Payment failed');
        else if (result.paymentIntent?.status === 'succeeded') {
          await api.post('/payments/confirm_topup/', { payment_intent_id: result.paymentIntent.id, amount });
          toast.success(`$${amount} added!`);
          onSuccess();
        }
      } else {
        // For purchases/services
        const { data } = await api.post('/payments/create_checkout/', { amount, type });
        window.location.href = data.url;
      }
    } catch { toast.error('Payment failed'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-4">
        <p className="text-2xl font-bold">${amount}</p>
        <p className="text-sm text-gray-500">{type === 'topup' ? 'Wallet Top-Up' : 'Payment'}</p>
      </div>
      <input className="input-field" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required />
      <input className="input-field" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
      <div className="p-3 border rounded-xl bg-white">
        <CardElement options={{ 
          style: { base: { fontSize: '16px', color: '#424770', '::placeholder': { color: '#aab7c4' } } },
          hidePostalCode: true
        }} />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={!stripe || loading} 
          className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <DollarSign size={18} />}
          Pay ${amount}
        </button>
        <button type="button" onClick={onClose} className="btn-ghost">
          <X size={20} />
        </button>
      </div>
    </form>
  );
}

export default function PaymentModal({ amount, onSuccess, onClose, type = 'topup' }: {
  amount: number; onSuccess: () => void; onClose: () => void; type?: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <Elements stripe={stripePromise}>
          <PaymentForm amount={amount} onSuccess={onSuccess} onClose={onClose} type={type} />
        </Elements>
      </div>
    </div>
  );
}