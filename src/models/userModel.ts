import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma.js'
import type { CreateUserData, UpdateUserData } from '../schemas/userSchemas.js'

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  schoolId: true,
  createdAt: true,
  updatedAt: true,
}

const publicUserSchoolSelect = {
  id: true,
  name: true,
  address: true,
  createdAt: true,
  updatedAt: true,
}

export const createUser = async (user: CreateUserData) => {
  const hashedPassword = await bcrypt.hash(user.password, 10)

  return prisma.user.create({
    data: {
      name: user.name,
      email: user.email,
      password: hashedPassword,
      ...(user.role ? { role: user.role } : {}),
      ...(user.schoolId ? { school: { connect: { id: user.schoolId } } } : {}),
    },
    select: publicUserSelect,
  })
}

export const getUsers = async () => {
  return prisma.user.findMany({
    orderBy: {
      id: 'asc',
    },
    select: publicUserSelect,
  })
}

export const getUserById = async (id: number) => {
  return prisma.user.findUnique({
    where: {
      id,
    },
    select: publicUserSelect,
  })
}

export const getUserSchoolById = async (id: number) => {
  return prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      schoolId: true,
      school: {
        select: publicUserSchoolSelect,
      },
    },
  })
}

export const deleteUser = async (id: number) => {
  return prisma.user.delete({
    where: {
      id,
    },
    select: publicUserSelect,
  })
}

export const updateUser = async (user: UpdateUserData, id: number) => {
  const hashedPassword = user.password
    ? await bcrypt.hash(user.password, 10)
    : undefined

  return prisma.user.update({
    data: {
      ...(user.name ? { name: user.name } : {}),
      ...(user.email ? { email: user.email } : {}),
      ...(hashedPassword ? { password: hashedPassword } : {}),
      ...(user.role ? { role: user.role } : {}),
      ...(user.schoolId ? { school: { connect: { id: user.schoolId } } } : {}),
    },
    where: {
      id,
    },
    select: publicUserSelect,
  })
}
