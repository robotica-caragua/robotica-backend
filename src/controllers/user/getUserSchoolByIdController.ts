import { Request, Response } from 'express'
import { getUserSchoolById } from '../../models/userModel'
import { getUserErrorResponse } from './userControllerUtils'

export async function getUserSchoolByIdController(req: Request, res: Response) {
  const id = res.locals.userId as number

  try {
    const user = await getUserSchoolById(id)

    if (!user) {
      return res.status(404).json({
        message: 'Usuário não encontrado.',
      })
    }

    if (!user.schoolId) {
      return res.status(404).json({
        message: 'Escola do usuário não encontrada.',
      })
    }

    if (!user.school) {
      return res.status(404).json({
        message: 'Escola não encontrada.',
      })
    }

    return res.status(200).json({
      message: 'Escola encontrada com sucesso.',
      school: user.school,
    })
  } catch (error) {
    const userError = getUserErrorResponse(error)

    return res.status(userError.status).json({
      message: userError.message,
    })
  }
}
