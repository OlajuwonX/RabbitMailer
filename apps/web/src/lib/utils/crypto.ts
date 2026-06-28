import 'server-only'
import crypto from 'crypto'

function getKey(): Buffer {
  const key = process.env.SMTP_ENCRYPTION_KEY
  if (!key || key.length !== 64) {
    throw new Error('SMTP_ENCRYPTION_KEY must be a 64-char hex string. Generate with: openssl rand -hex 32')
  }
  return Buffer.from(key, 'hex')
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decrypt(ciphertext: string): string {
  const key = getKey()
  const [ivHex, dataHex] = ciphertext.split(':')
  if (!ivHex || !dataHex) throw new Error('Invalid ciphertext format')
  const iv = Buffer.from(ivHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
