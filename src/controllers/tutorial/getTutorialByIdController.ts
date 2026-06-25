import { Request, Response } from 'express'
import { getTutorialById } from '../../models/tutorialModel'
import { getTutorialErrorResponse } from './tutorialControllerUtils'

export async function getTutorialByIdController(req: Request, res: Response) {
  const id = res.locals.tutorialId as number

  try {
    const result = await getTutorialById(id)

    if (!result) {
      return res.status(404).json({
        message: 'Tutorial não encontrado.',
      })
    }

    return res.status(200).json({
      message: 'Tutorial encontrado com sucesso!',
      tutorial: result,
    })
  } catch (error) {
    const tutorialError = getTutorialErrorResponse(error)

    return res.status(tutorialError.status).json({
      message: tutorialError.message,
    })
  }
}
