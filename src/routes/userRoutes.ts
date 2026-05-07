import { Router } from 'express'
import { createUsersController } from '../controllers/createUserController'
import { getUsersController } from '../controllers/getUsersController'
import { getUserByIdController } from '../controllers/getUserByIdController'
import { updateUserController } from '../controllers/updateUserController'
import { deleteUserController } from '../controllers/deleteUserController'

const router: Router = Router()

router.param('id', (req, res, next, id) => {
  const parsedId = Number(id)

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return res.status(400).json({
      message: 'ID de usuário inválido.',
    })
  }

  res.locals.userId = parsedId
  next()
})

router.get('/', getUsersController)
router.get('/:id', getUserByIdController)
router.post('/', createUsersController)
router.put('/:id', updateUserController)
router.patch('/:id', updateUserController)
router.delete('/:id', deleteUserController)

export default router
