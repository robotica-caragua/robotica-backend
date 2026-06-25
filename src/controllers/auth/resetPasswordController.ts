import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import {
  findActivePasswordResetToken,
  markPasswordResetTokenUsed,
  revokeAllAuthSessionsForUser,
  updateUserPassword,
} from '../../models/authModel.js'
import { resetPasswordSchema } from '../../schemas/authSchemas.js'
import { getAuthErrorResponse, parseBody } from './authControllerUtils.js'

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function resetPasswordController(req: Request, res: Response) {
  const validation = parseBody(resetPasswordSchema, req.body)

  if ('error' in validation) {
    return res.status(400).json({
      message: validation.error,
    })
  }

  try {
    const tokenHash = hashToken(validation.data.token)
    const resetToken = await findActivePasswordResetToken(tokenHash)

    if (!resetToken) {
      return res.status(400).json({
        message: 'Token inválido ou expirado.',
      })
    }

    const hashedPassword = await bcrypt.hash(validation.data.password, 10)

    await updateUserPassword(resetToken.userId, hashedPassword)
    await markPasswordResetTokenUsed(resetToken.id)
    await revokeAllAuthSessionsForUser(resetToken.userId)

    return res.status(200).json({
      message: 'Senha redefinida com sucesso!',
    })
  } catch (error) {
    const authError = getAuthErrorResponse(error)

    return res.status(authError.status).json({
      message: authError.message,
    })
  }
}
