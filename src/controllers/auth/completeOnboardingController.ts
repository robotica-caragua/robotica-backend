import { Request, Response } from 'express'
import { completeTeacherOnboarding, findRoboticsGroupById } from '../../models/authModel.js'
import { getSchoolById } from '../../models/schoolModel.js'
import { completeOnboardingSchema } from '../../schemas/authSchemas.js'
import { signAccessToken } from '../../lib/auth.js'
import { getAuthErrorResponse, parseBody } from './authControllerUtils.js'

export async function completeOnboardingController(req: Request, res: Response) {
  const validation = parseBody(completeOnboardingSchema, req.body)

  if ('error' in validation) {
    return res.status(400).json({
      message: validation.error,
    })
  }

  const authUser = res.locals.authUser as
    | { userId: number; role: string; onboardingStatus: string }
    | undefined

  if (!authUser) {
    return res.status(401).json({
      message: 'Não autorizado.',
    })
  }

  try {
    if (validation.data.schoolId) {
      const school = await getSchoolById(validation.data.schoolId)

      if (!school) {
        return res.status(404).json({
          message: 'Escola não encontrada.',
        })
      }
    }

    if (validation.data.roboticsGroupId) {
      const roboticsGroup = await findRoboticsGroupById(validation.data.roboticsGroupId)

      if (!roboticsGroup) {
        return res.status(404).json({
          message: 'Grupo de robótica não encontrado.',
        })
      }
    }

    const user = await completeTeacherOnboarding({
      userId: authUser.userId,
      ...(validation.data.schoolId ? { schoolId: validation.data.schoolId } : {}),
      ...(validation.data.roboticsGroupId
        ? { roboticsGroupId: validation.data.roboticsGroupId }
        : {}),
    })

    const accessToken = signAccessToken({
      userId: user.id,
      role: user.role,
      onboardingStatus: user.onboardingStatus,
    })

    return res.status(200).json({
      message: 'Onboarding concluído com sucesso!',
      user,
      accessToken,
    })
  } catch (error) {
    const authError = getAuthErrorResponse(error)

    return res.status(authError.status).json({
      message: authError.message,
    })
  }
}
