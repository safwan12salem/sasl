// securityUtils.js - Utilities for handling sensitive data
import CryptoJS from 'crypto-js';

// Encrypt sensitive data before storing
export const encryptData = (data, secretKey) => {
  try {
    const ciphertext = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      secretKey
    ).toString();
    return ciphertext;
  } catch (error) {
    console.error('Encryption failed:', error);
    return null;
  }
};

// Decrypt stored data
export const decryptData = (ciphertext, secretKey) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};

// Mask sensitive data for display
export const maskData = (data, visibleChars = 4, maskChar = '*') => {
  if (!data) return '';
  if (data.length <= visibleChars) return data;
  
  const visible = data.slice(0, visibleChars);
  const masked = maskChar.repeat(data.length - visibleChars);
  return visible + masked;
};

// Validate API key format
export const validateAPIKey = (key) => {
  const patterns = {
    openai: /^sk-[A-Za-z0-9]{48}$/,
    stripe: /^(sk_live_|pk_live_|sk_test_|pk_test_)[A-Za-z0-9]{24,}$/,
    github: /^ghp_[A-Za-z0-9]{36}$/,
    generic: /^[A-Za-z0-9_-]{32,}$/,
  };
  
  return {
    isValid: patterns.generic.test(key),
    type: Object.keys(patterns).find(k => patterns[k].test(key)) || 'unknown',
  };
};

// Sanitize input to prevent XSS
export const sanitizeInput = (input) => {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// Generate a secure random token
export const generateSecureToken = (length = 32) => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};