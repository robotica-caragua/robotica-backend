import { prisma } from '../lib/prisma.js'
import { CreateProjectData, UpdateProjectData } from '../schemas/projectSchemas'

const publicProjectSelect = {
  id: true,
  name: true,
  description: true,
  schoolId: true,
  school: true,
  createdAt: true,
  updatedAt: true,
}

export const createProject = async (project: CreateProjectData) => {
  return prisma.project.create({
    data: {
      name: project.name,
      ...(project.description ? { description: project.description } : {}),
      ...(project.schoolId ? { schoolId: project.schoolId } : {}),
    },
    select: publicProjectSelect,
  })
}

export const getProjects = async () => {
  return prisma.project.findMany({
    orderBy: {
      id: 'asc',
    },
    select: publicProjectSelect,
  })
}

export const getProjectById = async (id: number) => {
  return prisma.project.findUnique({
    where: {
      id,
    },
    select: publicProjectSelect,
  })
}

export const updateProject = async (project: UpdateProjectData, id: number) => {
  return prisma.project.update({
    data: {
      ...(project.name ? { name: project.name } : {}),
      ...(project.description ? { description: project.description } : {}),
      ...(project.schoolId ? { schoolId: project.schoolId } : {}),
    },
    where: {
      id,
    },
    select: publicProjectSelect,
  })
}

export const deleteProject = async (id: number) => {
  return prisma.project.delete({
    where: {
      id,
    },
    select: publicProjectSelect,
  })
}
