/**
 * APOC CRM - Client-Side Encryption Utilities
 * Uses the native Web Crypto API (AES-256-GCM + PBKDF2)
 * Values are NEVER sent to the server unencrypted.
 */

const PBKDF2_ITERATIONS = 120_000
const SALT_LENGTH = 16 // bytes
const IV_LENGTH = 12   // bytes (recommended for AES-GCM)

/**
 * Converts an ArrayBuffer to a Base64 string
 */
function bufToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

/**
 * Converts a Base64 string to an ArrayBuffer
 */
function base64ToBuf(b64) {
  const bin = atob(b64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

/**
 * Derives a strong AES-256 key from a master password using PBKDF2.
 * @param {string} masterPassword
 * @param {ArrayBuffer} salt
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(masterPassword, salt) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypts a plaintext string with a master password.
 * @param {string} plaintext
 * @param {string} masterPassword
 * @returns {Promise<{ encryptedValue: string, iv: string, salt: string }>}
 */
export async function encryptValue(plaintext, masterPassword) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(masterPassword, salt)

  const enc = new TextEncoder()
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  )

  return {
    encryptedValue: bufToBase64(cipherBuffer),
    iv: bufToBase64(iv),
    salt: bufToBase64(salt),
  }
}

/**
 * Decrypts an encrypted value using a master password.
 * @param {string} encryptedValue - Base64 ciphertext
 * @param {string} iv - Base64 initialization vector
 * @param {string} salt - Base64 PBKDF2 salt
 * @param {string} masterPassword
 * @returns {Promise<string>} - Decrypted plaintext
 * @throws If the master password is wrong or data is corrupted
 */
export async function decryptValue(encryptedValue, iv, salt, masterPassword) {
  const saltBuf = base64ToBuf(salt)
  const ivBuf = base64ToBuf(iv)
  const cipherBuf = base64ToBuf(encryptedValue)

  const key = await deriveKey(masterPassword, saltBuf)

  const decryptedBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuf },
    key,
    cipherBuf
  )

  const dec = new TextDecoder()
  return dec.decode(decryptedBuf)
}

/**
 * Quick validation — tries to decrypt a known sentinel value to
 * verify the master password is correct without exposing real data.
 * Returns true if the password works, false otherwise.
 */
export async function validateMasterPassword(encrypted, iv, salt, masterPassword) {
  try {
    await decryptValue(encrypted, iv, salt, masterPassword)
    return true
  } catch {
    return false
  }
}

/**
 * Returns a password strength score (0-4) and label.
 */
export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' }

  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  // Cap at 4
  score = Math.min(score, 4)

  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte']
  const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981']

  return { score, label: labels[score], color: colors[score] }
}
