import { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../lib/auth.js'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization

  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Token de acesso não informado.',
    })
  }

  const token = authorization.slice('Bearer '.length).trim()

  try {
    const payload = verifyAccessToken(token)
    res.locals.authUser = payload
    next()
  } catch {
    return res.status(401).json({
      message: 'Token de acesso inválido ou expirado.',
    })
  }
}
