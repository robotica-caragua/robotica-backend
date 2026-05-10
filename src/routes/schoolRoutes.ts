import { Router } from 'express'
import { createSchoolController } from '../controllers/schoolControllers'
import { getSchoolsController } from '../controllers/schoolControllers'
import { getSchoolByIdController } from '../controllers/schoolControllers'
import { updateSchoolController } from '../controllers/schoolControllers'
import { deleteSchoolController } from '../controllers/schoolControllers'

const router: Router = Router()

router.param('id', (req, res, next, id) => {
  const parsedId = Number(id)

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return res.status(400).json({
      message: 'ID de escola inválido.',
    })
  }

  res.locals.schoolId = parsedId
  next()
})

router.get('/', getSchoolsController)
router.get('/:id', getSchoolByIdController)
router.post('/', createSchoolController)
router.put('/:id', updateSchoolController)
router.delete('/:id', deleteSchoolController)

export default router
