import { Request, Response } from 'express'
import { createTutorial } from '../../models/tutorialModel'
import { createTutorialSchema } from '../../schemas/tutorialSchemas'
import { getTutorialErrorResponse, parseBody } from './tutorialControllerUtils'

export async function createTutorialController(req: Request, res: Response) {
  const validation = parseBody(createTutorialSchema, req.body)

  if ('error' in validation) {
    return res.status(400).json({
      message: validation.error,
    })
  }

  try {
    const result = await createTutorial(validation.data)

    return res.status(201).json({
      message: 'Tutorial criado com sucesso!',
      tutorial: result,
    })
  } catch (error) {
    const tutorialError = getTutorialErrorResponse(error)

    return res.status(tutorialError.status).json({
      message: tutorialError.message,
    })
  }
}
