import { Request, Response } from 'express'
import { createSchool } from '../models/schoolModel'
import { createSchoolSchema } from '../schemas/schoolSchemas'
import { getSchoolErrorResponse, parseBody } from './schoolControllerUtils'

export async function createSchoolController(req: Request, res: Response) {
  const validation = parseBody(createSchoolSchema, req.body)

  if ('error' in validation) {
    return res.status(400).json({
      message: validation.error,
    })
  }

  try {
    const result = await createSchool(validation.data)

    return res.status(201).json({
      message: 'Escola criada com sucesso!',
      school: result,
    })
  } catch (error) {
    const schoolError = getSchoolErrorResponse(error)

    return res.status(schoolError.status).json({
      message: schoolError.message,
    })
  }
}
