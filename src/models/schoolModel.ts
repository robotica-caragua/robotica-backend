import { prisma } from '../lib/prisma.js'
import type { CreateSchoolData, UpdateSchoolData } from '../schemas/schoolSchemas.js'

const publicSchoolSelect = {
  id: true,
  name: true,
  address: true,
  createdAt: true,
  updatedAt: true,
}

export const createSchool = async (school: CreateSchoolData) => {
  return prisma.school.create({
    data: {
      name: school.name,
      ...(school.address ? { address: school.address } : {}),
    },
    select: publicSchoolSelect,
  })
}

export const getSchools = async () => {
  return prisma.school.findMany({
    orderBy: {
      id: 'asc',
    },
    select: publicSchoolSelect,
  })
}

export const getSchoolById = async (id: number) => {
  return prisma.school.findUnique({
    where: {
      id,
    },
    select: publicSchoolSelect,
  })
}

export const updateSchool = async (school: UpdateSchoolData, id: number) => {
  return prisma.school.update({
    data: {
      ...(school.name ? { name: school.name } : {}),
      ...(school.address ? { address: school.address } : {}),
    },
    where: {
      id,
    },
    select: publicSchoolSelect,
  })
}

export const deleteSchool = async (id: number) => {
  return prisma.school.delete({
    where: {
      id,
    },
    select: publicSchoolSelect,
  })
}
