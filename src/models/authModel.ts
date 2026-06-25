import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { AuthProvider, TeacherOnboardingStatus, UserRole } from '../generated/prisma/enums.js'

const authUserSelect = {
  id: true,
  name: true,
  email: true,
  password: true,
  role: true,
  authProvider: true,
  googleId: true,
  onboardingStatus: true,
  onboardingCompletedAt: true,
  schoolId: true,
  roboticsGroupId: true,
  createdAt: true,
  updatedAt: true,
}

const publicAuthUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  authProvider: true,
  onboardingStatus: true,
  onboardingCompletedAt: true,
  schoolId: true,
  roboticsGroupId: true,
  createdAt: true,
  updatedAt: true,
}

export type PublicAuthUser = {
  id: number
  name: string
  email: string
  role: UserRole
  authProvider: AuthProvider
  onboardingStatus: TeacherOnboardingStatus
  onboardingCompletedAt: Date | null
  schoolId: number | null
  roboticsGroupId: number | null
  createdAt: Date
  updatedAt: Date
}

export type AuthUser = PublicAuthUser & { password: string; googleId: string | null }

export async function findAuthUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: authUserSelect,
  })
}

export async function findAuthUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    select: publicAuthUserSelect,
  })
}

export async function findAuthUserByGoogleId(googleId: string) {
  return prisma.user.findUnique({
    where: { googleId },
    select: authUserSelect,
  })
}

export async function createAuthSession(userId: number, refreshTokenHash: string, expiresAt: Date) {
  return prisma.authSession.create({
    data: {
      userId,
      refreshTokenHash,
      expiresAt,
    },
  })
}

export async function findActiveSessionByRefreshTokenHash(refreshTokenHash: string) {
  return prisma.authSession.findFirst({
    where: {
      refreshTokenHash,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        select: publicAuthUserSelect,
      },
    },
  })
}

export async function rotateAuthSession(
  sessionId: number,
  refreshTokenHash: string,
  expiresAt: Date,
) {
  return prisma.authSession.update({
    where: { id: sessionId },
    data: {
      refreshTokenHash,
      expiresAt,
      revokedAt: null,
    },
  })
}

export async function revokeAuthSession(sessionId: number) {
  return prisma.authSession.update({
    where: { id: sessionId },
    data: {
      revokedAt: new Date(),
    },
  })
}

export async function revokeAllAuthSessionsForUser(userId: number) {
  return prisma.authSession.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  })
}

export async function createPasswordResetToken(userId: number, tokenHash: string, expiresAt: Date) {
  return prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  })
}

export async function findActivePasswordResetToken(tokenHash: string) {
  return prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        select: publicAuthUserSelect,
      },
    },
  })
}

export async function markPasswordResetTokenUsed(tokenId: number) {
  return prisma.passwordResetToken.update({
    where: { id: tokenId },
    data: {
      usedAt: new Date(),
    },
  })
}

export async function updateUserPassword(userId: number, password: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      password,
    },
    select: publicAuthUserSelect,
  })
}

export async function linkGoogleIdentity(userId: number, googleId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      authProvider: AuthProvider.GOOGLE,
      googleId,
    },
    select: publicAuthUserSelect,
  })
}

export async function createOrUpdateGoogleUser(data: {
  googleId: string
  email: string
  name: string
  schoolId?: number | null
}) {
  const socialPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10)

  const existingByGoogleId = await prisma.user.findUnique({
    where: { googleId: data.googleId },
    select: authUserSelect,
  })

  if (existingByGoogleId) {
    return existingByGoogleId
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { email: data.email },
    select: authUserSelect,
  })

  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        authProvider: AuthProvider.GOOGLE,
        googleId: data.googleId,
      },
      select: authUserSelect,
    })
  }

  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: socialPassword,
      role: UserRole.TEACHER,
      authProvider: AuthProvider.GOOGLE,
      googleId: data.googleId,
      onboardingStatus: data.schoolId
        ? TeacherOnboardingStatus.COMPLETED
        : TeacherOnboardingStatus.PENDING,
      ...(data.schoolId
        ? {
            onboardingCompletedAt: new Date(),
            school: { connect: { id: data.schoolId } },
          }
        : {}),
    },
    select: authUserSelect,
  })
}

export async function completeTeacherOnboarding(data: {
  userId: number
  schoolId?: number
  roboticsGroupId?: number
}) {
  return prisma.user.update({
    where: { id: data.userId },
    data: {
      onboardingStatus: TeacherOnboardingStatus.COMPLETED,
      onboardingCompletedAt: new Date(),
      ...(data.schoolId ? { school: { connect: { id: data.schoolId } } } : {}),
      ...(data.roboticsGroupId ? { roboticsGroup: { connect: { id: data.roboticsGroupId } } } : {}),
    },
    select: publicAuthUserSelect,
  })
}

export async function createRoboticsGroup(name: string) {
  return prisma.roboticsGroup.create({
    data: { name },
  })
}

export async function findRoboticsGroupById(id: number) {
  return prisma.roboticsGroup.findUnique({
    where: { id },
  })
}

export async function createAuthUser(data: {
  name: string
  email: string
  password: string
  role: UserRole
  schoolId?: number
}) {
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      authProvider: AuthProvider.LOCAL,
      onboardingStatus:
        data.role === UserRole.ADMIN || data.schoolId
          ? TeacherOnboardingStatus.COMPLETED
          : TeacherOnboardingStatus.PENDING,
      ...(data.role === UserRole.ADMIN || data.schoolId
        ? {
            onboardingCompletedAt: new Date(),
          }
        : {}),
      ...(data.schoolId ? { school: { connect: { id: data.schoolId } } } : {}),
    },
    select: publicAuthUserSelect,
  })
}
