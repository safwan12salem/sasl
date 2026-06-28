// SecureForm.jsx - Example registration form with secure inputs
import React, { useState } from 'react';
import SecureInput from './SecureInput';
import { User, Mail, Lock, Phone, CreditCard, Key, ShieldCheck } from 'lucide-react';

const SecureForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    apiKey: '',
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Validation rules
  const validate = () => {
    const newErrors = {};
    
    // Username
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and numbers';
    }
    
    // Confirm Password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    // API Key
    if (formData.apiKey && formData.apiKey.length < 32) {
      newErrors.apiKey = 'API key appears to be invalid (too short)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In production, NEVER log sensitive data
      console.log('Form submitted successfully');
      
      // Clear form
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        apiKey: '',
      });
      
      alert('Registration successful!');
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg mb-4">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create Account
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Your data is encrypted and secure
          </p>
        </div>
        
        {/* Form */}
        <form 
          onSubmit={handleSubmit} 
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4 border border-gray-100 dark:border-gray-700"
        >
          {/* Username */}
          <SecureInput
            name="username"
            label="Username"
            placeholder="Choose a username"
            value={formData.username}
            onChange={handleChange}
            icon={User}
            error={errors.username}
            required
            autoComplete="username"
          />
          
          {/* Email */}
          <SecureInput
            name="email"
            type="email"
            label="Email Address"
            placeholder="your@email.com"
            value={formData.email}
            onChange={handleChange}
            icon={Mail}
            error={errors.email}
            required
            autoComplete="email"
          />
          
          {/* Password with strength meter */}
          <SecureInput
            name="password"
            type="password"
            label="Password"
            placeholder="Create a strong password"
            value={formData.password}
            onChange={handleChange}
            icon={Key}
            error={errors.password}
            required
            showStrengthMeter
            helpText="Min 8 chars, uppercase, lowercase, and numbers"
            autoComplete="new-password"
          />
          
          {/* Confirm Password */}
          <SecureInput
            name="confirmPassword"
            type="password"
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            icon={Lock}
            error={errors.confirmPassword}
            required
            autoComplete="new-password"
          />
          
          {/* API Key (sensitive) */}
          <SecureInput
            name="apiKey"
            type="password"
            label="API Key (Optional)"
            placeholder="Enter your API key"
            value={formData.apiKey}
            onChange={handleChange}
            icon={Key}
            error={errors.apiKey}
            helpText="API keys are encrypted before storage"
            maxLength={64}
            autoComplete="off"
          />
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Securing your data...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
          
          {/* Security Notice */}
          <p className="text-xs text-center text-gray-400 mt-4">
            🔒 Your data is encrypted using AES-256-GCM
          </p>
        </form>
      </div>
    </div>
  );
};

export default SecureForm;