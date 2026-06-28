// SecureInput.jsx - Reusable secure input component
import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Shield, AlertCircle } from 'lucide-react';

const SecureInput = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  name,
  label,
  icon: Icon = Lock,
  error,
  helpText,
  required = false,
  disabled = false,
  maxLength,
  pattern,
  autoComplete = 'off',
  className = '',
  inputClassName = '',
  showStrengthMeter = false,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;
  
  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: '' };
    
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    
    const strengths = {
      0: { label: 'Very Weak', color: 'bg-red-500' },
      1: { label: 'Very Weak', color: 'bg-red-500' },
      2: { label: 'Weak', color: 'bg-orange-500' },
      3: { label: 'Fair', color: 'bg-yellow-500' },
      4: { label: 'Good', color: 'bg-blue-500' },
      5: { label: 'Strong', color: 'bg-green-500' },
      6: { label: 'Very Strong', color: 'bg-emerald-500' },
    };
    
    return { score, ...strengths[Math.min(score, 6)] };
  };

  const strength = showStrengthMeter && isPassword ? getPasswordStrength(value) : null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Input Container */}
      <div className="relative">
        {/* Left Icon */}
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon 
              size={18} 
              className={`transition-colors duration-200 ${
                isFocused 
                  ? 'text-blue-500' 
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            />
          </div>
        )}
        
        {/* Input Field */}
        <input
          id={name}
          name={name}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          maxLength={maxLength}
          pattern={pattern}
          autoComplete={autoComplete}
          className={`
            w-full 
            pl-10 
            ${isPassword ? 'pr-12' : 'pr-4'} 
            py-3 
            rounded-xl 
            border-2 
            transition-all 
            duration-200
            outline-none
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error 
              ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900/30' 
              : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30'
            }
            ${inputClassName}
          `}
          {...props}
        />
        
        {/* Password Toggle */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>
        )}
      </div>
      
      {/* Password Strength Meter */}
      {strength && value && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i < strength.score 
                    ? strength.color 
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Password strength: <span className="font-medium">{strength.label}</span>
          </p>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-1.5 text-red-500">
          <AlertCircle size={14} />
          <p className="text-xs">{error}</p>
        </div>
      )}
      
      {/* Help Text */}
      {helpText && !error && (
        <div className="flex items-center gap-1.5 text-gray-400">
          <Shield size={14} />
          <p className="text-xs">{helpText}</p>
        </div>
      )}
    </div>
  );
};

export default SecureInput;