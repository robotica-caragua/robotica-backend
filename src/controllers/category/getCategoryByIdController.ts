import { Request, Response } from 'express'
import { getCategoryById } from '../../models/categoryModel'
import { getCategoryErrorResponse } from './categoryControllerUtils'

export async function getCategoryByIdController(req: Request, res: Response) {
  const id = res.locals.categoryId as number

  try {
    const result = await getCategoryById(id)

    if (!result) {
      return res.status(404).json({
        message: 'Categoria não encontrada.',
      })
    }

    return res.status(200).json({
      message: 'Categoria encontrada com sucesso!',
      category: result,
    })
  } catch (error) {
    const categoryError = getCategoryErrorResponse(error)

    return res.status(categoryError.status).json({
      message: categoryError.message,
    })
  }
}
