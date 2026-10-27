import { randomBytes } from 'node:crypto'
import { AuthenticationStrategy } from './AuthenticationStrategy.js'
import { AppError } from '../../../core/errors/AppError.js'

export class GoogleAuthenticationStrategy extends AuthenticationStrategy {
  constructor(users, passwords, googleClient, config) {
    super()
    Object.assign(this, { users, passwords, googleClient, config })
  }

  async authenticate({ idToken }) {
    const { GOOGLE_CLIENT_ID: audience, GOOGLE_ALLOWED_DOMAIN: domain } = this.config
    if (!audience || !domain?.trim()) throw new AppError(500, 'Configuração do Google ausente.')
    let payload
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken, audience })
      payload = ticket.getPayload()
    } catch {
      throw new AppError(401, 'Token do Google inválido.')
    }
    if (!payload?.email || !payload.sub || !payload.email_verified) {
      throw new AppError(401, 'Token do Google inválido.')
    }
    const email = payload.email.toLowerCase()
    if (!email.endsWith(`@${domain.trim().toLowerCase()}`)) {
      throw new AppError(403, 'Conta Google não autorizada.')
    }
    const existing = await this.users.findByGoogleId(payload.sub)
    if (existing) return existing
    const byEmail = await this.users.findByEmail(email)
    if (byEmail) return this.users.update(byEmail.id, { googleId: payload.sub, authProvider: 'GOOGLE' })
    return this.users.create({
      name: payload.name || email.split('@')[0], email, googleId: payload.sub,
      password: await this.passwords.hash(randomBytes(32).toString('hex')),
      role: 'TEACHER', authProvider: 'GOOGLE', onboardingStatus: 'PENDING',
    })
  }
}
