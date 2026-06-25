import { Request, Response } from 'express'
import { getTutorials } from '../../models/tutorialModel'
import { getTutorialErrorResponse } from './tutorialControllerUtils'

export async function getTutorialsController(req: Request, res: Response) {
  try {
    const result = await getTutorials()

    if (result.length > 0) {
      return res.status(200).json({
        message: 'Tutoriais encontrados com sucesso!',
        tutorials: result,
      })
    }

    return res.status(404).json({
      message: 'Não foi encontrado nenhum tutorial!',
    })
  } catch (error) {
    const tutorialError = getTutorialErrorResponse(error)

    return res.status(tutorialError.status).json({
      message: tutorialError.message,
    })
  }
}
