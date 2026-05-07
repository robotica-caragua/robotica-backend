import { Request, Response } from 'express'
import { updateUser } from '../models/userModel'
import { updateUserSchema } from '../schemas/userSchemas'
import { getUserErrorResponse, parseBody } from './userControllerUtils'

export async function updateUserController(req: Request, res: Response) {
  const id = res.locals.userId as number
  const validation = parseBody(updateUserSchema, req.body)

  if ('error' in validation) {
    return res.status(400).json({
      message: validation.error,
    })
  }

  try {
    const result = await updateUser(validation.data, id)

    return res.status(200).json({
      message: 'Usuário atualizado com sucesso!',
      user: result,
    })
  } catch (error) {
    const userError = getUserErrorResponse(error)

    return res.status(userError.status).json({
      message: userError.message,
    })
  }
}
