import { Router } from 'express'
import { getCategoryController } from '../controllers/category/getCategoryController'
import { deleteCategoryController } from '../controllers/category/deleteCategoryController'
import { updateCategoryController } from '../controllers/category/updateCategoryController'
import { createCategoryController } from '../controllers/category/createCategoryController'
import { getCategoryByIdController } from '../controllers/category/getCategoryByIdController'

const router: Router = Router()

router.param('id', (req, res, next, id) => {
  const parsedId = Number(id)

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return res.status(400).json({
      message: 'ID de categoria inválido.',
    })
  }

  res.locals.categoryId = parsedId
  next()
})

router.get('/', getCategoryController)
router.get('/:id', getCategoryByIdController)
router.post('/', createCategoryController)
router.put('/:id', updateCategoryController)
router.delete('/:id', deleteCategoryController)

export default router
