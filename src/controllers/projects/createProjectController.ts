import { Request, Response } from 'express'
import { getProjectErrorResponse, parseBody } from './projectControllerUtils'
import { createProjectSchema } from '../../schemas/projectSchemas'
import { createProject } from '../../models/projectModel'

export async function createProjectController(req: Request, res: Response) {
  const validation = parseBody(createProjectSchema, req.body)

  if ('error' in validation) {
    return res.status(400).json({
      message: validation.error,
    })
  }

  try {
    const result = await createProject(validation.data)

    return res.status(201).json({
      message: 'Projeto criado com sucesso!',
      project: result,
    })
  } catch (error) {
    const projectError = getProjectErrorResponse(error)

    return res.status(projectError.status).json({
      message: projectError.message,
    })
  }
}
