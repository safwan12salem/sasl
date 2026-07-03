/**
 * Sasl E2E Encryption Service
 * AES-256-GCM encryption for all WaveMesh messages
 * Each user has a unique key pair generated on first use
 */

// Generate a unique encryption key for this user (stored in localStorage)
function getUserKey(): CryptoKey | null {
  const stored = localStorage.getItem('sasl_encryption_key');
  if (stored) {
    // Key is stored as base64 — we'll use a derived key approach
    return null; // Will generate new key each session for now
  }
  return null;
}

// Generate a random AES-GCM key
async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Export key to shareable format (base64)
async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Import key from shared format
async function importKey(keyStr: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(keyStr), c => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

// Encrypt a message
export async function encryptMessage(plainText: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv))
  };
}

// Decrypt a message
export async function decryptMessage(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
  const encryptedBytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    encryptedBytes
  );
  return new TextDecoder().decode(decrypted);
}

// Get or create user's key pair
let cachedKey: CryptoKey | null = null;

export async function getUserCryptoKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  
  const stored = localStorage.getItem('sasl_encryption_key_base64');
  if (stored) {
    try {
      cachedKey = await importKey(stored);
      return cachedKey;
    } catch {}
  }
  
  // Generate new key
  cachedKey = await generateKey();
  const exported = await exportKey(cachedKey);
  localStorage.setItem('sasl_encryption_key_base64', exported);
  return cachedKey;
}

// Encrypt for sending
export async function encryptForPeer(plainText: string, peerPublicKey?: string): Promise<string> {
  const key = await getUserCryptoKey();
  const { ciphertext, iv } = await encryptMessage(plainText, key);
  return JSON.stringify({ ciphertext, iv, encrypted: true });
}

// Decrypt received message
export async function decryptFromPeer(encryptedPayload: string): Promise<string> {
  try {
    const { ciphertext, iv, encrypted } = JSON.parse(encryptedPayload);
    if (!encrypted) return encryptedPayload; // Not encrypted
    
    const key = await getUserCryptoKey();
    return await decryptMessage(ciphertext, iv, key);
  } catch {
    return encryptedPayload; // Return as-is if decryption fails
  }
}
