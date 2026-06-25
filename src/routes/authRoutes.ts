import { Router } from 'express'
import { registerController } from '../controllers/auth/registerController.js'
import { loginController } from '../controllers/auth/loginController.js'
import { refreshController } from '../controllers/auth/refreshController.js'
import { logoutController } from '../controllers/auth/logoutController.js'
import { meController } from '../controllers/auth/meController.js'
import { authMiddleware } from '../middlewares/authMiddleware.js'

const router: Router = Router()

router.post('/register', registerController)
router.post('/login', loginController)
router.post('/refresh', refreshController)
router.post('/logout', logoutController)
router.get('/me', authMiddleware, meController)

export default router
