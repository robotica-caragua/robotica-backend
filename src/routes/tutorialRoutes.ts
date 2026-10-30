import { Router } from 'express'
import { getTutorialsController } from '../controllers/tutorial/getTutorialsController'
import { getTutorialByIdController } from '../controllers/tutorial/getTutorialByIdController'
import { createTutorialController } from '../controllers/tutorial/createTutorialController'
import { updateTutorialController } from '../controllers/tutorial/updateTutorialController'
import { deleteTutorialController } from '../controllers/tutorial/deleteTutorialController'

const router: Router = Router()

router.param('id', (req, res, next, id) => {
  const parsedId = Number(id)

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return res.status(400).json({
      message: 'ID de tutorial inválido.',
    })
  }

  res.locals.tutorialId = parsedId
  next()
})

router.get('/', getTutorialsController)
router.get('/:id', getTutorialByIdController)
router.post('/', createTutorialController)
router.put('/:id', updateTutorialController)
router.delete('/:id', deleteTutorialController)

export default router
