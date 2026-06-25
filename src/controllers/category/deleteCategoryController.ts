import { Request, Response } from 'express'
import { deleteCategory } from '../../models/categoryModel'
import { getCategoryErrorResponse } from './categoryControllerUtils'

export async function deleteCategoryController(req: Request, res: Response) {
  const id = res.locals.categoryId as number

  try {
    const result = await deleteCategory(id)

    return res.status(200).json({
      message: 'Categoria deletada com sucesso!',
      category: result,
    })
  } catch (error) {
    const categoryError = getCategoryErrorResponse(error)

    return res.status(categoryError.status).json({
      message: categoryError.message,
    })
  }
}
