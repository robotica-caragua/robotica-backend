import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { createAuthSession, findAuthUserByEmail } from '../../models/authModel.js'
import { loginSchema } from '../../schemas/authSchemas.js'
import {
  buildRefreshTokenCookie,
  generateRefreshToken,
  getRefreshTokenExpiryDate,
  hashToken,
  isTeacherFullyOnboarded,
  signAccessToken,
} from '../../lib/auth.js'
import { getAuthErrorResponse, parseBody } from './authControllerUtils.js'

export async function loginController(req: Request, res: Response) {
  const validation = parseBody(loginSchema, req.body)

  if ('error' in validation) {
    return res.status(400).json({
      message: validation.error,
    })
  }

  try {
    const user = await findAuthUserByEmail(validation.data.email)

    if (!user) {
      return res.status(401).json({
        message: 'Credenciais inválidas.',
      })
    }

    const passwordMatches = await bcrypt.compare(validation.data.password, user.password)

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Credenciais inválidas.',
      })
    }

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
      message: 'Login realizado com sucesso!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
        onboardingStatus: user.onboardingStatus,
        onboardingCompletedAt: user.onboardingCompletedAt,
        schoolId: user.schoolId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken,
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
      },
      onboardingAllowed: isTeacherFullyOnboarded(user.onboardingStatus, user.role),
    })
  } catch (error) {
    const authError = getAuthErrorResponse(error)

    return res.status(authError.status).json({
      message: authError.message,
    })
  }
}
