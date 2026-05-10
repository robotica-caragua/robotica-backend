import { Request, Response } from 'express'
import { deleteUser } from '../../models/userModel'
import { getUserErrorResponse } from './userControllerUtils'

export async function deleteUserController(req: Request, res: Response) {
  const id = res.locals.userId as number

  try {
    const result = await deleteUser(id)

    return res.status(200).json({
      message: 'Usuário deletado com sucesso!',
      user: result,
    })
  } catch (error) {
    const userError = getUserErrorResponse(error)

    return res.status(userError.status).json({
      message: userError.message,
    })
  }
}
