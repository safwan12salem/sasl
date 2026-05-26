import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../services/api';
import toast from 'react-hot-toast';
import { DollarSign, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';



const stripePromise = loadStripe('pk_test_your_publishable_key');

function TopUpForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);

    try {
      // Create payment intent
      const { data } = await api.post('/monetization/stripe/create_topup_intent/', { amount });
      
      // Confirm payment
      const result = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: { card: elements.getElement(CardElement)! },
      });

      if (result.error) {
        toast.error(result.error.message || t('Payment failed'));
      } else if (result.paymentIntent?.status === 'succeeded') {
        // Confirm on backend
        await api.post('/monetization/stripe/confirm_topup/', {
          payment_intent_id: result.paymentIntent.id
        });
        toast.success(t(`$${amount} added to wallet!`));
      }
    } catch (err: any) {
      toast.error(t('Payment failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass p-6 rounded-2xl max-w-md mx-auto">
      <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
        <DollarSign /> {t('Top Up Wallet')}
      </h3>
      <div className="flex gap-2 mb-4">
        {[5, 10, 25, 50].map(val => (
          <button
            key={val}
            onClick={() => setAmount(val)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              amount === val ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            ${val}
          </button>
        ))}
      </div>
      <div className="mb-4 p-3 border rounded-xl">
        <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
      </div>
      <button
        onClick={handleSubmit}
        disabled={!stripe || loading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="animate-spin" size={16} /> : <DollarSign size={16} />}
        {t('Pay')} ${amount}
      </button>
    </div>
  );
}

export default function StripeTopUp() {
  return (
    <Elements stripe={stripePromise}>
      <TopUpForm />
    </Elements>
  );
}