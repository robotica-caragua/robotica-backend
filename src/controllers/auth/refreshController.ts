import { Request, Response } from 'express'
import { findActiveSessionByRefreshTokenHash, rotateAuthSession } from '../../models/authModel.js'
import {
  buildRefreshTokenCookie,
  generateRefreshToken,
  getRefreshTokenExpiryDate,
  getRefreshTokenFromRequest,
  hashToken,
  signAccessToken,
} from '../../lib/auth.js'

export async function refreshController(req: Request, res: Response) {
  const refreshToken = getRefreshTokenFromRequest(req)

  if (!refreshToken) {
    return res.status(400).json({
      message: 'Refresh token não informado.',
    })
  }

  const refreshTokenHash = hashToken(refreshToken)
  const session = await findActiveSessionByRefreshTokenHash(refreshTokenHash)

  if (!session) {
    return res.status(401).json({
      message: 'Sessão inválida ou expirada.',
    })
  }

  const nextRefreshToken = generateRefreshToken()
  const nextRefreshTokenHash = hashToken(nextRefreshToken)
  const nextRefreshExpiresAt = getRefreshTokenExpiryDate()

  const rotatedSession = await rotateAuthSession(
    session.id,
    nextRefreshTokenHash,
    nextRefreshExpiresAt,
  )

  const accessToken = signAccessToken({
    userId: session.user.id,
    role: session.user.role,
    onboardingStatus: session.user.onboardingStatus,
  })

  res.setHeader('Set-Cookie', buildRefreshTokenCookie(nextRefreshToken, nextRefreshExpiresAt))

  return res.status(200).json({
    message: 'Token renovado com sucesso!',
    accessToken,
    session: {
      id: rotatedSession.id,
      expiresAt: rotatedSession.expiresAt,
    },
    user: session.user,
  })
}
