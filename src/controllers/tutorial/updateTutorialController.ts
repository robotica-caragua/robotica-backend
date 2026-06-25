import { Request, Response } from 'express'
import { updateTutorial } from '../../models/tutorialModel'
import { updateTutorialSchema } from '../../schemas/tutorialSchemas'
import { getTutorialErrorResponse, parseBody } from './tutorialControllerUtils'

export async function updateTutorialController(req: Request, res: Response) {
  const id = res.locals.tutorialId as number
  const validation = parseBody(updateTutorialSchema, req.body)

  if ('error' in validation) {
    return res.status(400).json({
      message: validation.error,
    })
  }

  try {
    const result = await updateTutorial(validation.data, id)

    return res.status(200).json({
      message: 'Tutorial atualizado com sucesso!',
      tutorial: result,
    })
  } catch (error) {
    const tutorialError = getTutorialErrorResponse(error)

    return res.status(tutorialError.status).json({
      message: tutorialError.message,
    })
  }
}
