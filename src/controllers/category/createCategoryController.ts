import { Request, Response } from 'express'
import { getCategoryErrorResponse, parseBody } from './categoryControllerUtils'
import { createCategorySchema } from '../../schemas/categorySchemas'
import { createCategory } from '../../models/categoryModel'

export async function createCategoryController(req: Request, res: Response) {
  const validation = parseBody(createCategorySchema, req.body)

  if ('error' in validation) {
    return res.status(400).json({
      message: validation.error,
    })
  }

  try {
    const result = await createCategory(validation.data)

    return res.status(201).json({
      message: 'Categoria criada com sucesso!',
      category: result,
    })
  } catch (error) {
    const categoryError = getCategoryErrorResponse(error)

    return res.status(categoryError.status).json({
      message: categoryError.message,
    })
  }
}
