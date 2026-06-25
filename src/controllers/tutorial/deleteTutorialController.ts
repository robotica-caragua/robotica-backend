import { Request, Response } from 'express'
import { deleteTutorial } from '../../models/tutorialModel'
import { getTutorialErrorResponse } from './tutorialControllerUtils'

export async function deleteTutorialController(req: Request, res: Response) {
  const id = res.locals.tutorialId as number

  try {
    const result = await deleteTutorial(id)

    return res.status(200).json({
      message: 'Tutorial deletado com sucesso!',
      tutorial: result,
    })
  } catch (error) {
    const tutorialError = getTutorialErrorResponse(error)

    return res.status(tutorialError.status).json({
      message: tutorialError.message,
    })
  }
}
