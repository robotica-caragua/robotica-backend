import { prisma } from '../lib/prisma.js'
import { CreateCategoryData, UpdateCategoryData } from '../schemas/categorySchemas'

const publicCategorySelect = {
  id: true,
  name: true,
}

export const createCategory = async (category: CreateCategoryData) => {
  return prisma.category.create({
    data: {
      name: category.name,
    },
    select: publicCategorySelect,
  })
}

export const getCategories = async () => {
  return prisma.category.findMany({
    orderBy: {
      id: 'asc',
    },
    select: publicCategorySelect,
  })
}

export const getCategoryById = async (id: number) => {
  return prisma.category.findUnique({
    where: {
      id,
    },
    select: publicCategorySelect,
  })
}

export const updateCategory = async (category: UpdateCategoryData, id: number) => {
  return prisma.category.update({
    data: {
      ...(category.name ? { name: category.name } : {}),
    },
    where: {
      id,
    },
    select: publicCategorySelect,
  })
}

export const deleteCategory = async (id: number) => {
  return prisma.category.delete({
    where: {
      id,
    },
    select: publicCategorySelect,
  })
}
