import { Request, Response } from 'express'
import { updateSchool } from '../../models/schoolModel'
import { updateSchoolSchema } from '../../schemas/schoolSchemas'
import { getProjectErrorResponse, parseBody } from './projectControllerUtils'

export async function updateProjectController(req: Request, res: Response) {
  const id = res.locals.schoolId as number
  const validation = parseBody(updateSchoolSchema, req.body)

  if ('error' in validation) {
    return res.status(400).json({
      message: validation.error,
    })
  }

  try {
    const result = await updateSchool(validation.data, id)

    return res.status(200).json({
      message: 'Escola atualizada com sucesso!',
      school: result,
    })
  } catch (error) {
    const projectError = getProjectErrorResponse(error)

    return res.status(projectError.status).json({
      message: projectError.message,
    })
  }
}
