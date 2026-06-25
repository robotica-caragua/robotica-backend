import { prisma } from '../lib/prisma.js'
import { CreateTutorialData, UpdateTutorialData } from '../schemas/tutorialSchemas'

const publicTutorialSelect = {
  id: true,
  title: true,
  description: true,
  categoryId: true,
  category: true,
  difficulty: true,
  schoolId: true,
  school: true,
  materialsNeeded: true,
  tutorialUrl: true,
  createdAt: true,
  updatedAt: true,
}

export const createTutorial = async (tutorial: CreateTutorialData) => {
  return prisma.tutorial.create({
    data: {
      title: tutorial.title,
      description: tutorial.description,
      categoryId: tutorial.categoryId,
      difficulty: tutorial.difficulty,
      schoolId: tutorial.schoolId,
      materialsNeeded: tutorial.materialsNeeded,
      ...(tutorial.tutorialUrl ? { tutorialUrl: tutorial.tutorialUrl } : {}),
    },
    select: publicTutorialSelect,
  })
}

export const getTutorials = async () => {
  return prisma.tutorial.findMany({
    orderBy: {
      id: 'asc',
    },
    select: publicTutorialSelect,
  })
}

export const getTutorialById = async (id: number) => {
  return prisma.tutorial.findUnique({
    where: {
      id,
    },
    select: publicTutorialSelect,
  })
}

export const updateTutorial = async (tutorial: UpdateTutorialData, id: number) => {
  return prisma.tutorial.update({
    data: {
      ...(tutorial.tutorialUrl ? { tutorialUrl: tutorial.tutorialUrl } : {}),
    },
    where: {
      id,
    },
    select: publicTutorialSelect,
  })
}

export const deleteTutorial = async (id: number) => {
  return prisma.tutorial.delete({
    where: {
      id,
    },
    select: publicTutorialSelect,
  })
}
