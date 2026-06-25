import { Request, Response } from 'express'
import { updateCategory } from '../../models/categoryModel'
import { updateCategorySchema } from '../../schemas/categorySchemas'
import { getCategoryErrorResponse, parseBody } from './categoryControllerUtils'

export async function updateCategoryController(req: Request, res: Response) {
  const id = res.locals.categoryId as number
  const validation = parseBody(updateCategorySchema, req.body)

  if ('error' in validation) {
    return res.status(400).json({
      message: validation.error,
    })
  }

  try {
    const result = await updateCategory(validation.data, id)

    return res.status(200).json({
      message: 'Escola atualizada com sucesso!',
      category: result,
    })
  } catch (error) {
    const categoryError = getCategoryErrorResponse(error)

    return res.status(categoryError.status).json({
      message: categoryError.message,
    })
  }
}
