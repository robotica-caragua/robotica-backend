import { OAuth2Client } from 'google-auth-library'
import { PrismaRepository } from './core/database/PrismaRepository.js'
import { PasswordHasher } from './core/security/PasswordHasher.js'
import { AccessPolicy } from './core/security/AccessPolicy.js'
import { CrudService } from './core/http/CrudService.js'
import { CrudController } from './core/http/CrudController.js'
import { UserRepository } from './modules/users/UserRepository.js'
import { UserService } from './modules/users/UserService.js'
import { UserController } from './modules/users/UserController.js'
import { AuthRepository } from './modules/auth/AuthRepository.js'
import { AuthService } from './modules/auth/AuthService.js'
import { AuthController } from './modules/auth/AuthController.js'
import { TokenService } from './modules/auth/TokenService.js'
import { PasswordResetMailer } from './modules/auth/PasswordResetMailer.js'
import { LocalAuthenticationStrategy } from './modules/auth/strategies/LocalAuthenticationStrategy.js'
import { GoogleAuthenticationStrategy } from './modules/auth/strategies/GoogleAuthenticationStrategy.js'
import { resourceDefinitions } from './modules/resources.js'

// Composition root: dependencies are wired here, never inside controllers.
export function createContainer({ db, jwt, config, overrides = {} }) {
  const users = new UserRepository(db)
  const passwords = overrides.passwords || new PasswordHasher()
  const tokens = new TokenService(jwt, config)
  const repositories = { users }
  const controllers = {}
  for (const [name, definition] of Object.entries(resourceDefinitions)) {
    const repository = repositories[name] || new PrismaRepository(db[definition.key], definition.select)
    repositories[name] = repository
    const service = name === 'users'
      ? new UserService(repository, definition, passwords) : new CrudService(repository, definition)
    controllers[name] = name === 'users'
      ? new UserController(service, definition) : new CrudController(service, definition)
  }
  const strategies = new Map([
    ['local', new LocalAuthenticationStrategy(users, passwords)],
    ['google', new GoogleAuthenticationStrategy(users, passwords,
      overrides.googleClient || new OAuth2Client(config.GOOGLE_CLIENT_ID), config)],
  ])
  const authService = new AuthService({ users, passwords, tokens, strategies,
    sessions: new AuthRepository(db), schools: repositories.schools,
    groups: new PrismaRepository(db.roboticsGroup),
    mailer: overrides.mailer || new PasswordResetMailer(config), config })
  return { controllers, auth: new AuthController(authService, tokens), policy: new AccessPolicy(tokens) }
}
