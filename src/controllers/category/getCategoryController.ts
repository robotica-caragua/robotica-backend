import { Request, Response } from 'express'
import { getCategories } from '../../models/categoryModel'
import { getCategoryErrorResponse } from './categoryControllerUtils'

export async function getCategoryController(req: Request, res: Response) {
  try {
    const result = await getCategories()

    if (result.length > 0) {
      return res.status(200).json({
        message: 'Categorias encontradas com sucesso!',
        categories: result,
      })
    }

    return res.status(404).json({
      message: 'Não foi encontrada nenhuma categoria!',
    })
  } catch (error) {
    const categoryError = getCategoryErrorResponse(error)

    return res.status(categoryError.status).json({
      message: categoryError.message,
    })
  }
}
