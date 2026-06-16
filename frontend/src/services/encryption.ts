/**
 * Sasl - End-to-End Encryption Service
 * AES-GCM encryption for all P2P mesh messages
 */

// Generate a shared key for the session
async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Export key to share with peer via WebRTC
async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Import key received from peer
async function importKey(keyStr: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(keyStr), c => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'raw', raw, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  );
}

// Encrypt a message
async function encryptMessage(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, encoded
  );
  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

// Decrypt a message
async function decryptMessage(key: CryptoKey, encryptedData: string): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

export const e2e = { generateKey, exportKey, importKey, encryptMessage, decryptMessage };