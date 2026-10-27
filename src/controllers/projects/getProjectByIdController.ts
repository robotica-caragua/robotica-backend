import { Request, Response } from 'express'
import { getSchoolById } from '../../models/schoolModel'
import { getProjectErrorResponse } from './projectControllerUtils'

export async function getProjectByIdController(req: Request, res: Response) {
  const id = res.locals.schoolId as number

  try {
    const result = await getSchoolById(id)

    if (!result) {
      return res.status(404).json({
        message: 'Escola não encontrada.',
      })
    }

    return res.status(200).json({
      message: 'Escola encontrada com sucesso!',
      school: result,
    })
  } catch (error) {
    const projectError = getProjectErrorResponse(error)

    return res.status(projectError.status).json({
      message: projectError.message,
    })
  }
}
