import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { createAuthSession, createAuthUser } from '../../models/authModel.js'
import { registerSchema } from '../../schemas/authSchemas.js'
import {
  buildRefreshTokenCookie,
  generateRefreshToken,
  getRefreshTokenExpiryDate,
  hashToken,
  signAccessToken,
} from '../../lib/auth.js'
import { getAuthErrorResponse, parseBody } from './authControllerUtils.js'
import { UserRole } from '../../generated/prisma/enums.js'

export async function registerController(req: Request, res: Response) {
  const validation = parseBody(registerSchema, req.body)

  if ('error' in validation) {
    return res.status(400).json({
      message: validation.error,
    })
  }

  const role = validation.data.role ?? UserRole.TEACHER
  const hashedPassword = await bcrypt.hash(validation.data.password, 10)

  try {
    const user = await createAuthUser({
      name: validation.data.name,
      email: validation.data.email,
      password: hashedPassword,
      role,
      ...(validation.data.schoolId ? { schoolId: validation.data.schoolId } : {}),
    })

    const refreshToken = generateRefreshToken()
    const refreshTokenHash = hashToken(refreshToken)
    const refreshExpiresAt = getRefreshTokenExpiryDate()

    const session = await createAuthSession(user.id, refreshTokenHash, refreshExpiresAt)

    const accessToken = signAccessToken({
      userId: user.id,
      role,
      onboardingStatus: user.onboardingStatus,
    })

    res.setHeader('Set-Cookie', buildRefreshTokenCookie(refreshToken, refreshExpiresAt))

    return res.status(201).json({
      message: 'Usuário criado com sucesso!',
      user,
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
