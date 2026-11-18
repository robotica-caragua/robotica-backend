import { User } from './User.js'
import { AppError } from '../../core/errors/AppError.js'

export class AuthService {
  constructor({ users, sessions, passwords, tokens, strategies, schools, groups, mailer, config }) {
    Object.assign(this, { users, sessions, passwords, tokens, strategies, schools, groups, mailer, config })
  }

  async issueSession(record) {
    const user = new User(record)
    const refreshToken = this.tokens.generate()
    const expiresAt = this.tokens.expiresAt()
    const session = await this.sessions.createSession(user.id, this.tokens.hash(refreshToken), expiresAt)
    return { user: user.toPublic(), accessToken: this.tokens.sign(user),
      session: { id: session.id, expiresAt: session.expiresAt }, refreshToken, onboardingAllowed: user.onboardingAllowed }
  }

  async login(provider, credentials) {
    const strategy = this.strategies.get(provider)
    if (!strategy) throw new AppError(400, 'Provedor de autenticação inválido.')
    return this.issueSession(await strategy.authenticate(credentials))
  }

  async register(data) {
    const role = 'TEACHER'
    const completed = Boolean(data.schoolId)
    const user = await this.users.create({ name: data.name, email: data.email, schoolId: data.schoolId, role, password: await this.passwords.hash(data.password),
      authProvider: 'LOCAL', onboardingStatus: completed ? 'COMPLETED' : 'PENDING',
      onboardingCompletedAt: completed ? new Date() : null })
    return this.issueSession(user)
  }

  async refresh(token) {
    if (!token) throw new AppError(400, 'Refresh token não informado.')
    const previousHash = this.tokens.hash(token)
    const current = await this.sessions.findSession(previousHash)
    if (!current) throw new AppError(401, 'Sessão inválida ou expirada.')
    const refreshToken = this.tokens.generate()
    const session = await this.sessions.rotateSession(current.id, previousHash, this.tokens.hash(refreshToken), this.tokens.expiresAt())
    return { accessToken: this.tokens.sign(current.user), session, user: new User(current.user).toPublic(), refreshToken }
  }

  async logout(token) {
    if (token) {
      const session = await this.sessions.findSession(this.tokens.hash(token))
      if (session) await this.sessions.revokeSession(session.id)
    }
  }

  async me(id) {
    const user = await this.users.findById(id)
    if (!user) throw new AppError(404, 'Usuário não encontrado.')
    return new User(user).toPublic()
  }

  async completeOnboarding(id, data) {
    if (data.schoolId && !await this.schools.findById(data.schoolId)) throw new AppError(404, 'Escola não encontrada.')
    if (data.roboticsGroupId && !await this.groups.findById(data.roboticsGroupId)) throw new AppError(404, 'Grupo de robótica não encontrado.')
    const user = await this.users.update(id, { ...data, onboardingStatus: 'COMPLETED', onboardingCompletedAt: new Date() })
    return { user: new User(user).toPublic(), accessToken: this.tokens.sign(user) }
  }

  async forgotPassword(email) {
    const user = await this.users.findByEmail(email)
    if (!user) return
    const token = this.tokens.generate()
    await this.sessions.createReset(user.id, this.tokens.hash(token), new Date(Date.now() + 20 * 60000))
    const link = new URL('/auth/reset-password', this.config.APP_BASE_URL)
    link.searchParams.set('token', token)
    await this.mailer.send(email, link.toString())
  }

  async resetPassword({ token, password }) {
    await this.sessions.resetPassword(this.tokens.hash(token), await this.passwords.hash(password))
  }
}
