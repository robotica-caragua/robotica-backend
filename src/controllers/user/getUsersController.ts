import { Request, Response } from 'express'
import { getUsers } from '../../models/userModel'
import { getUserErrorResponse } from './userControllerUtils'

export async function getUsersController(req: Request, res: Response) {
  try {
    const result = await getUsers()
    
    if (result.length > 0) {
      return res.status(200).json({
        message: 'Usuários encontrados com sucesso!',
        users: result,
      })
    }

    return res.status(404).json({
      message: 'Não foi encontrado nenhum usuário!',
    })
    
  } catch (error) {
    const userError = getUserErrorResponse(error)

    return res.status(userError.status).json({
      message: userError.message,
    })
  }
}
