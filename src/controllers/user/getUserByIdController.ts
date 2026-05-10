import { Request, Response } from 'express'
import { getUserById } from '../../models/userModel'
import { getUserErrorResponse } from './userControllerUtils'

export async function getUserByIdController(req: Request, res: Response) {
  const id = res.locals.userId as number

  try {
    const result = await getUserById(id)

    if (!result) {
      return res.status(404).json({
        message: 'Usuário não encontrado.',
      })
    }

    return res.status(200).json({
      message: 'Usuário encontrado com sucesso!',
      user: result,
    })
  } catch (error) {
    const userError = getUserErrorResponse(error)

    return res.status(userError.status).json({
      message: userError.message,
    })
  }
}
