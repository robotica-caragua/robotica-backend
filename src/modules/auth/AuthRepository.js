import { AppError } from '../../core/errors/AppError.js'

export class AuthRepository {
  constructor(db) { this.db = db }
  createSession(userId, refreshTokenHash, expiresAt) {
    return this.db.authSession.create({ data: { userId, refreshTokenHash, expiresAt } })
  }
  findSession(refreshTokenHash) {
    return this.db.authSession.findFirst({
      where: { refreshTokenHash, revokedAt: null, expiresAt: { gt: new Date() } }, include: { user: true },
    })
  }
  async rotateSession(id, previousHash, refreshTokenHash, expiresAt) {
    // Conditional update prevents concurrent reuse of a rotated token.
    const result = await this.db.authSession.updateMany({
      where: { id, refreshTokenHash: previousHash, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { refreshTokenHash, expiresAt },
    })
    if (!result.count) throw new AppError(401, 'Sessão inválida ou expirada.')
    return { id, expiresAt }
  }
  revokeSession(id) { return this.db.authSession.update({ where: { id }, data: { revokedAt: new Date() } }) }
  createReset(userId, tokenHash, expiresAt) {
    return this.db.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } })
  }
  async resetPassword(tokenHash, password) {
    return this.db.$transaction(async (tx) => {
      const token = await tx.passwordResetToken.findFirst({
        where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      })
      if (!token) throw new AppError(400, 'Token inválido ou expirado.')
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() },
      })
      if (!consumed.count) throw new AppError(400, 'Token inválido ou expirado.')
      await tx.user.update({ where: { id: token.userId }, data: { password } })
      await tx.authSession.updateMany({ where: { userId: token.userId, revokedAt: null }, data: { revokedAt: new Date() } })
    })
  }
}
