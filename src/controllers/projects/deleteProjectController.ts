import { Request, Response } from 'express'
import { deleteSchool } from '../../models/schoolModel'
import { getProjectErrorResponse } from './projectControllerUtils'

export async function deleteProjectController(req: Request, res: Response) {
  const id = res.locals.schoolId as number

  try {
    const result = await deleteSchool(id)

    return res.status(200).json({
      message: 'Escola deletada com sucesso!',
      school: result,
    })
  } catch (error) {
    const projectError = getProjectErrorResponse(error)

    return res.status(projectError.status).json({
      message: projectError.message,
    })
  }
}
