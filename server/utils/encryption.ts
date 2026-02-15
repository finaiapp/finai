import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const keyHex = process.env.PLAID_TOKEN_ENCRYPTION_KEY
  if (!keyHex) {
    throw new Error('PLAID_TOKEN_ENCRYPTION_KEY environment variable is not set')
  }
  if (keyHex.length !== 64) {
    throw new Error(`PLAID_TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes), got ${keyHex.length}`)
  }
  return Buffer.from(keyHex, 'hex')
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns a colon-separated string: iv:authTag:ciphertext (all base64-encoded).
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  const authTag = cipher.getAuthTag()

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

/**
 * Decrypt a string produced by encrypt().
 * Expects colon-separated: iv:authTag:ciphertext (all base64-encoded).
 */
export function decrypt(stored: string): string {
  const parts = stored.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format: expected iv:authTag:ciphertext')
  }

  const [ivB64, authTagB64, ciphertext] = parts
  const key = getEncryptionKey()
  const iv = Buffer.from(ivB64!, 'base64')
  const authTag = Buffer.from(authTagB64!, 'base64')

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext!, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
