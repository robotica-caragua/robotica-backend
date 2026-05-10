import { Router } from 'express'
import { createSchoolController } from '../controllers/createSchoolController'
import { getSchoolsController } from '../controllers/getSchoolsController'
import { getSchoolByIdController } from '../controllers/getSchoolByIdController'
import { updateSchoolController } from '../controllers/updateSchoolController'
import { deleteSchoolController } from '../controllers/deleteSchoolController'

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
