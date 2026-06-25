import { Request, Response } from 'express'
import crypto from 'crypto'
import { createPasswordResetToken, findAuthUserByEmail } from '../../models/authModel.js'
import { forgotPasswordSchema } from '../../schemas/authSchemas.js'
import { getAppBaseUrl, sendPasswordResetEmail } from '../../lib/mailer.js'
import { getAuthErrorResponse, parseBody } from './authControllerUtils.js'

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function forgotPasswordController(req: Request, res: Response) {
  const validation = parseBody(forgotPasswordSchema, req.body)

  if ('error' in validation) {
    return res.status(400).json({
      message: validation.error,
    })
  }

  try {
    const user = await findAuthUserByEmail(validation.data.email)

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex')
      const resetTokenHash = hashToken(resetToken)
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + 20)

      await createPasswordResetToken(user.id, resetTokenHash, expiresAt)

      const resetLink = `${getAppBaseUrl()}/auth/reset-password?token=${resetToken}`
      await sendPasswordResetEmail(user.email, resetLink)
    }

    return res.status(200).json({
      message: 'Se o email estiver cadastrado, um link de redefinição será enviado.',
    })
  } catch (error) {
    const authError = getAuthErrorResponse(error)

    return res.status(authError.status).json({
      message: authError.message,
    })
  }
}
