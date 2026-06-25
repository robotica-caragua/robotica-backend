import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import type { Request } from 'express'
import { TeacherOnboardingStatus, UserRole } from '../generated/prisma/enums.js'

function getEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Faltando variável de ambiente: ${name}`)
  }

  return value
}

export type AccessTokenPayload = {
  userId: number
  role: UserRole
  onboardingStatus: TeacherOnboardingStatus
}

export const authConfig = {
  accessTokenSecret: getEnv('JWT_ACCESS_SECRET'),
  accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshTokenExpiresInDays: Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS || '30'),
  refreshCookieName: 'refreshToken',
}

export function signAccessToken(payload: AccessTokenPayload) {
  const signOptions = {
    expiresIn: authConfig.accessTokenExpiresIn as jwt.SignOptions['expiresIn'],
  } as jwt.SignOptions

  return jwt.sign(
    payload as jwt.JwtPayload,
    authConfig.accessTokenSecret as jwt.Secret,
    signOptions,
  )
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, authConfig.accessTokenSecret) as AccessTokenPayload & {
    iat: number
    exp: number
  }
}

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex')
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function getRefreshTokenFromRequest(req: Request) {
  const authHeader = req.headers.authorization

  if (authHeader?.startsWith('Refresh ')) {
    return authHeader.slice('Refresh '.length).trim()
  }

  const cookieHeader = req.headers.cookie

  if (!cookieHeader) {
    return null
  }

  const cookies = cookieHeader.split(';').map((item) => item.trim())
  const match = cookies.find((item) => item.startsWith(`${authConfig.refreshCookieName}=`))

  if (!match) {
    return null
  }

  return decodeURIComponent(match.slice(authConfig.refreshCookieName.length + 1))
}

export function buildRefreshTokenCookie(refreshToken: string, expiresAt: Date) {
  const parts = [
    `${authConfig.refreshCookieName}=${encodeURIComponent(refreshToken)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Expires=${expiresAt.toUTCString()}`,
  ]

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure')
  }

  return parts.join('; ')
}

export function clearRefreshTokenCookie() {
  const parts = [
    `${authConfig.refreshCookieName}=`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ]

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure')
  }

  return parts.join('; ')
}

export function getRefreshTokenExpiryDate() {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + authConfig.refreshTokenExpiresInDays)
  return expiresAt
}

export function isTeacherFullyOnboarded(onboardingStatus: TeacherOnboardingStatus, role: UserRole) {
  if (role !== UserRole.TEACHER) {
    return true
  }

  return onboardingStatus === TeacherOnboardingStatus.COMPLETED
}
