import { AppError } from '../../core/errors/AppError.js'

// Internal operation. Deliberately not exposed by an HTTP route.
export class AdminProvisioner {
  constructor(db) { this.db = db }

  async promote(email) {
    return this.db.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { email } })
      if (!user) throw new AppError(404, 'Conta não encontrada. Cadastre o usuário antes de promovê-lo.')
      const promoted = await tx.user.update({ where: { id: user.id }, data: {
        role: 'ADMIN', onboardingStatus: 'COMPLETED',
        onboardingCompletedAt: user.onboardingCompletedAt || new Date(),
      } })
      await tx.authSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } })
      return { id: promoted.id, email: promoted.email, role: promoted.role }
    })
  }
}
