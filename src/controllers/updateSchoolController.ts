import { Request, Response } from 'express'
import { updateSchool } from '../models/schoolModel'
import { updateSchoolSchema } from '../schemas/schoolSchemas'
import { getSchoolErrorResponse, parseBody } from './schoolControllerUtils'

export async function updateSchoolController(req: Request, res: Response) {
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
    const schoolError = getSchoolErrorResponse(error)

    return res.status(schoolError.status).json({
      message: schoolError.message,
    })
  }
}
