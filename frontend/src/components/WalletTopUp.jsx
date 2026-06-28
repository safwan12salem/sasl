// WalletTopUp.jsx - Example with secure card input
import React, { useState } from 'react';
import SecureInput from './SecureInput';
import { CreditCard, Calendar, Lock, User } from 'lucide-react';

const WalletTopUp = () => {
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardholderName: '',
    expiryDate: '',
    cvv: '',
  });
  
  const [errors, setErrors] = useState({});
  
  const formatCardNumber = (value) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    // Add spaces every 4 digits
    const groups = digits.match(/.{1,4}/g);
    return groups ? groups.join(' ') : digits;
  };
  
  const formatExpiryDate = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 2) {
      return digits.slice(0, 2) + '/' + digits.slice(2, 4);
    }
    return digits;
  };
  
  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setCardData(prev => ({ ...prev, cardNumber: formatted }));
  };
  
  const handleExpiryChange = (e) => {
    const formatted = formatExpiryDate(e.target.value);
    setCardData(prev => ({ ...prev, expiryDate: formatted }));
  };
  
  return (
    <div className="space-y-4">
      <SecureInput
        name="cardNumber"
        label="Card Number"
        placeholder="1234 5678 9012 3456"
        value={cardData.cardNumber}
        onChange={handleCardNumberChange}
        icon={CreditCard}
        error={errors.cardNumber}
        required
        maxLength={19}
        autoComplete="cc-number"
      />
      
      <SecureInput
        name="cardholderName"
        label="Cardholder Name"
        placeholder="John Doe"
        value={cardData.cardholderName}
        onChange={(e) => setCardData(prev => ({ ...prev, cardholderName: e.target.value }))}
        icon={User}
        error={errors.cardholderName}
        required
        autoComplete="cc-name"
      />
      
      <div className="grid grid-cols-2 gap-4">
        <SecureInput
          name="expiryDate"
          label="Expiry Date"
          placeholder="MM/YY"
          value={cardData.expiryDate}
          onChange={handleExpiryChange}
          icon={Calendar}
          error={errors.expiryDate}
          required
          maxLength={5}
          autoComplete="cc-exp"
        />
        
        <SecureInput
          name="cvv"
          type="password"
          label="CVV"
          placeholder="123"
          value={cardData.cvv}
          onChange={(e) => setCardData(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
          icon={Lock}
          error={errors.cvv}
          required
          maxLength={4}
          autoComplete="cc-csc"
        />
      </div>
    </div>
  );
};

export default WalletTopUp;