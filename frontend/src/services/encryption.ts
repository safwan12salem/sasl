/**
 * Sasl E2E Encryption Service — Per-Room Keys
 * AES-256-GCM. Each room has its own key.
 * Key is created by room creator and shared via QR.
 */

// In-memory cache per room
const keyCache: Map<string, CryptoKey> = new Map();

function storageKey(roomId: string): string {
  return `sasl_key_${roomId}`;
}

// Generate a random AES-GCM key
async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Export key to base64
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Import key from base64
async function importKey(keyStr: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(keyStr), c => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'raw', raw, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  );
}

// Get (or create) the key for a room
export async function getRoomKey(roomId: string): Promise<CryptoKey> {
  const cached = keyCache.get(roomId);
  if (cached) return cached;

  const stored = localStorage.getItem(storageKey(roomId));
  if (stored) {
    try {
      const key = await importKey(stored);
      keyCache.set(roomId, key);
      return key;
    } catch {}
  }

  // Create fresh key for this room
  const key = await generateKey();
  const exported = await exportKey(key);
  localStorage.setItem(storageKey(roomId), exported);
  keyCache.set(roomId, key);
  return key;
}

// Adopt a peer's key for a room (from QR)
export async function adoptRoomKey(roomId: string, base64Key: string): Promise<void> {
  try {
    const key = await importKey(base64Key);
    localStorage.setItem(storageKey(roomId), base64Key);
    keyCache.set(roomId, key);
  } catch (e) { console.error('adoptRoomKey failed:', e); }
}

// Encrypt for a room
export async function encryptForRoom(plainText: string, roomId: string): Promise<string> {
  const key = await getRoomKey(roomId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return JSON.stringify({
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
    encrypted: true,
  });
}

// Decrypt from a room
export async function decryptFromRoom(payload: string, roomId: string): Promise<string> {
  try {
    const { ciphertext, iv, encrypted } = JSON.parse(payload);
    if (!encrypted) return payload; // plaintext fallback
    const key = await getRoomKey(roomId);
    const ct = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, ct);
    return new TextDecoder().decode(decrypted);
  } catch {
    return payload; // decryption failed — return as-is
  }
}

// Legacy exports (kept for compatibility — will be removed later)
export async function encryptForPeer(plainText: string, _peerPublicKey?: string): Promise<string> {
  return encryptForRoom(plainText, 'default');
}
export async function decryptFromPeer(encryptedPayload: string): Promise<string> {
  return decryptFromRoom(encryptedPayload, 'default');
}