import { AuthenticationStrategy } from './AuthenticationStrategy.js'
import { AppError } from '../../../core/errors/AppError.js'

export class LocalAuthenticationStrategy extends AuthenticationStrategy {
  constructor(users, passwords) {
    super()
    this.users = users
    this.passwords = passwords
  }

  async authenticate({ email, password }) {
    const user = await this.users.findByEmail(email)
    if (!user || !await this.passwords.verify(password, user.password)) {
      throw new AppError(401, 'Credenciais inválidas.')
    }
    return user
  }
}
