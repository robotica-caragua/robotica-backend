import { Request, Response } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { createAuthSession, createOrUpdateGoogleUser } from '../../models/authModel.js'
import { googleLoginSchema } from '../../schemas/authSchemas.js'
import {
  buildRefreshTokenCookie,
  generateRefreshToken,
  getRefreshTokenExpiryDate,
  hashToken,
  signAccessToken,
} from '../../lib/auth.js'
import { getAuthErrorResponse, parseBody } from './authControllerUtils.js'

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export async function googleLoginController(req: Request, res: Response) {
  const validation = parseBody(googleLoginSchema, req.body)

  if ('error' in validation) {
    return res.status(400).json({
      message: validation.error,
    })
  }

  const allowedDomain = process.env.GOOGLE_ALLOWED_DOMAIN?.trim().toLowerCase()

  if (!allowedDomain) {
    return res.status(500).json({
      message: 'Configuração do Google ausente.',
    })
  }

  const audience = process.env.GOOGLE_CLIENT_ID

  if (!audience) {
    return res.status(500).json({
      message: 'Configuração do Google ausente.',
    })
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: validation.data.idToken,
      audience,
    })

    const payload = ticket.getPayload()

    if (!payload?.email || !payload.sub || !payload.email_verified) {
      return res.status(401).json({
        message: 'Token do Google inválido.',
      })
    }

    const email = payload.email.toLowerCase()

    if (!email.endsWith(`@${allowedDomain}`)) {
      return res.status(403).json({
        message: 'Conta Google não autorizada.',
      })
    }

    const user = await createOrUpdateGoogleUser({
      googleId: payload.sub,
      email,
      name: payload.name || email.split('@')[0] || 'Usuário Google',
    })

    const refreshToken = generateRefreshToken()
    const refreshTokenHash = hashToken(refreshToken)
    const refreshExpiresAt = getRefreshTokenExpiryDate()

    const session = await createAuthSession(user.id, refreshTokenHash, refreshExpiresAt)

    const accessToken = signAccessToken({
      userId: user.id,
      role: user.role,
      onboardingStatus: user.onboardingStatus,
    })

    res.setHeader('Set-Cookie', buildRefreshTokenCookie(refreshToken, refreshExpiresAt))

    return res.status(200).json({
      message: 'Login com Google realizado com sucesso!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
        onboardingStatus: user.onboardingStatus,
        onboardingCompletedAt: user.onboardingCompletedAt,
        schoolId: user.schoolId,
        roboticsGroupId: user.roboticsGroupId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken,
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
      },
    })
  } catch (error) {
    const authError = getAuthErrorResponse(error)

    return res.status(authError.status).json({
      message: authError.message,
    })
  }
}
