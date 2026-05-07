import { Request, Response } from 'express'
import { createUser } from '../models/userModel'
import { createUserSchema } from '../schemas/userSchemas'
import { getUserErrorResponse, parseBody } from './userControllerUtils'

export async function createUsersController(req: Request, res: Response) {
  const validation = parseBody(createUserSchema, req.body)

  if ('error' in validation) {
    return res.status(400).json({
      message: validation.error,
    })
  }

  try {
    const result = await createUser(validation.data)

    return res.status(201).json({
      message: 'Usuário criado com sucesso!',
      user: result,
    })
  } catch (error) {
    const userError = getUserErrorResponse(error)

    return res.status(userError.status).json({
      message: userError.message,
    })
  }
}
