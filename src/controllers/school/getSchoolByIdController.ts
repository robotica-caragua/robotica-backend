import { Request, Response } from 'express'
import { getSchoolById } from '../../models/schoolModel'
import { getSchoolErrorResponse } from './schoolControllerUtils'

export async function getSchoolByIdController(req: Request, res: Response) {
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
    const schoolError = getSchoolErrorResponse(error)

    return res.status(schoolError.status).json({
      message: schoolError.message,
    })
  }
}
