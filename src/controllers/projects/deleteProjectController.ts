import { Request, Response } from 'express'
import { deleteSchool } from '../../models/schoolModel'
import { getSchoolErrorResponse } from './projectControllerUtils'

export async function deleteProjectController(req: Request, res: Response) {
  const id = res.locals.schoolId as number

  try {
    const result = await deleteSchool(id)

    return res.status(200).json({
      message: 'Escola deletada com sucesso!',
      school: result,
    })
  } catch (error) {
    const schoolError = getSchoolErrorResponse(error)

    return res.status(schoolError.status).json({
      message: schoolError.message,
    })
  }
}
