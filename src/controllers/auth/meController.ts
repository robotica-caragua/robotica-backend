import { Request, Response } from 'express'
import { findAuthUserById } from '../../models/authModel.js'

export async function meController(req: Request, res: Response) {
  const authUser = res.locals.authUser as { userId: number } | undefined

  if (!authUser) {
    return res.status(401).json({
      message: 'Não autorizado.',
    })
  }

  const user = await findAuthUserById(authUser.userId)

  if (!user) {
    return res.status(404).json({
      message: 'Usuário não encontrado.',
    })
  }

  return res.status(200).json({
    user,
  })
}
