import { AppError } from '../errors/AppError.js'

export class AccessPolicy {
  constructor(tokens) { this.tokens = tokens }

  authenticate = async (request) => {
    const header = request.headers.authorization
    if (!header?.startsWith('Bearer ')) throw new AppError(401, 'Token de acesso não informado.')
    try {
      request.authUser = this.tokens.verify(header.slice(7).trim())
    } catch {
      throw new AppError(401, 'Token de acesso inválido ou expirado.')
    }
  }

  completed = async (request) => {
    if (request.authUser.role === 'TEACHER' && request.authUser.onboardingStatus !== 'COMPLETED') {
      throw new AppError(403, 'Finalize o onboarding para continuar.')
    }
  }

  role(...roles) {
    return async (request) => {
      if (!roles.includes(request.authUser.role)) throw new AppError(403, 'Acesso negado.')
    }
  }
}
