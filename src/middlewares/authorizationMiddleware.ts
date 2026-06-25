import { NextFunction, Request, Response } from 'express'
import { TeacherOnboardingStatus, UserRole } from '../generated/prisma/enums.js'

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authUser = res.locals.authUser as
      | { role: UserRole; onboardingStatus: TeacherOnboardingStatus }
      | undefined

    if (!authUser) {
      return res.status(401).json({
        message: 'Não autorizado.',
      })
    }

    if (!allowedRoles.includes(authUser.role)) {
      return res.status(403).json({
        message: 'Acesso negado.',
      })
    }

    next()
  }
}

export function requireCompletedOnboarding(req: Request, res: Response, next: NextFunction) {
  const authUser = res.locals.authUser as
    | { role: UserRole; onboardingStatus: TeacherOnboardingStatus }
    | undefined

  if (!authUser) {
    return res.status(401).json({
      message: 'Não autorizado.',
    })
  }

  if (authUser.role !== UserRole.TEACHER) {
    return next()
  }

  if (authUser.onboardingStatus !== TeacherOnboardingStatus.COMPLETED) {
    return res.status(403).json({
      message: 'Finalize o onboarding para continuar.',
    })
  }

  next()
}
