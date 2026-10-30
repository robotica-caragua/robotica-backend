import argon2 from 'argon2'
import bcrypt from 'bcrypt'

export class PasswordHasher {
  hash(password) {
    return argon2.hash(password, { type: argon2.argon2id })
  }

  async verify(password, hash) {
    // Existing users from develop/joao keep their bcrypt passwords.
    if (/^\$2[aby]\$/.test(hash)) return bcrypt.compare(password, hash)
    if (hash.startsWith('$argon2')) return argon2.verify(hash, password)
    return false
  }
}
