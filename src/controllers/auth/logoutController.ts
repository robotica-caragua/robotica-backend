import { Request, Response } from 'express'
import { clearRefreshTokenCookie, getRefreshTokenFromRequest, hashToken } from '../../lib/auth.js'
import { findActiveSessionByRefreshTokenHash, revokeAuthSession } from '../../models/authModel.js'

export async function logoutController(req: Request, res: Response) {
  const refreshToken = getRefreshTokenFromRequest(req)

  if (refreshToken) {
    const session = await findActiveSessionByRefreshTokenHash(hashToken(refreshToken))

    if (session) {
      await revokeAuthSession(session.id)
    }
  }

  res.setHeader('Set-Cookie', clearRefreshTokenCookie())

  return res.status(200).json({
    message: 'Logout realizado com sucesso!',
  })
}
