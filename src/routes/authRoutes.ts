import { Router } from 'express'
import { registerController } from '../controllers/auth/registerController.js'
import { loginController } from '../controllers/auth/loginController.js'
import { refreshController } from '../controllers/auth/refreshController.js'
import { logoutController } from '../controllers/auth/logoutController.js'
import { meController } from '../controllers/auth/meController.js'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import { requireRole } from '../middlewares/authorizationMiddleware.js'
import { completeOnboardingController } from '../controllers/auth/completeOnboardingController.js'
import { forgotPasswordController } from '../controllers/auth/forgotPasswordController.js'
import { resetPasswordController } from '../controllers/auth/resetPasswordController.js'
import { googleLoginController } from '../controllers/auth/googleLoginController.js'
import { UserRole } from '../generated/prisma/enums.js'

const router: Router = Router()

router.post('/register', registerController)
router.post('/login', loginController)
router.post('/google', googleLoginController)
router.post('/forgot-password', forgotPasswordController)
router.post('/reset-password', resetPasswordController)
router.post('/refresh', refreshController)
router.post('/logout', logoutController)
router.get('/me', authMiddleware, meController)
router.post(
  '/onboarding',
  authMiddleware,
  requireRole(UserRole.TEACHER),
  completeOnboardingController,
)

export default router
