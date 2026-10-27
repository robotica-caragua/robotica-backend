import { parse } from '../../core/http/validation.js'
import * as schemas from './schemas.js'

export class AuthController {
  constructor(service, tokens) { Object.assign(this, { service, tokens }) }
  session(reply, result, message, status = 200, includeOnboarding = false) {
    const { refreshToken, onboardingAllowed, ...body } = result
    this.tokens.setCookie(reply, refreshToken, result.session.expiresAt)
    return reply.code(status).send({ message, ...body, ...(includeOnboarding ? { onboardingAllowed } : {}) })
  }
  register = async (request, reply) => this.session(reply,
    await this.service.register(parse(schemas.registerSchema, request.body)), 'Usuário criado com sucesso!', 201)
  login = async (request, reply) => this.session(reply,
    await this.service.login('local', parse(schemas.loginSchema, request.body)), 'Login realizado com sucesso!', 200, true)
  google = async (request, reply) => this.session(reply,
    await this.service.login('google', parse(schemas.googleLoginSchema, request.body)), 'Login com Google realizado com sucesso!')
  refresh = async (request, reply) => this.session(reply,
    await this.service.refresh(this.tokens.readRefresh(request)), 'Token renovado com sucesso!')
  logout = async (request, reply) => {
    await this.service.logout(this.tokens.readRefresh(request))
    this.tokens.clearCookie(reply)
    return { message: 'Logout realizado com sucesso!' }
  }
  me = async (request) => ({ user: await this.service.me(request.authUser.userId) })
  onboarding = async (request) => ({ message: 'Onboarding concluído com sucesso!',
    ...await this.service.completeOnboarding(request.authUser.userId, parse(schemas.completeOnboardingSchema, request.body)) })
  forgotPassword = async (request) => {
    const data = parse(schemas.forgotPasswordSchema, request.body)
    await this.service.forgotPassword(data.email)
    return { message: 'Se o email estiver cadastrado, um link de redefinição será enviado.' }
  }
  resetPassword = async (request) => {
    await this.service.resetPassword(parse(schemas.resetPasswordSchema, request.body))
    return { message: 'Senha redefinida com sucesso!' }
  }
}
