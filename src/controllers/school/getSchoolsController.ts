import { Request, Response } from 'express'
import { getSchools } from '../../models/schoolModel'
import { getSchoolErrorResponse } from './schoolControllerUtils'

export async function getSchoolsController(req: Request, res: Response) {
  try {
    const result = await getSchools()

    if (result.length > 0) {
      return res.status(200).json({
        message: 'Escolas encontradas com sucesso!',
        schools: result,
      })
    }

    return res.status(404).json({
      message: 'Não foi encontrada nenhuma escola!',
    })
  } catch (error) {
    const schoolError = getSchoolErrorResponse(error)

    return res.status(schoolError.status).json({
      message: schoolError.message,
    })
  }
}
