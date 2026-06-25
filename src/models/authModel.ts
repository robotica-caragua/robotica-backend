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
  createdAt: true,
  updatedAt: true,
}

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
