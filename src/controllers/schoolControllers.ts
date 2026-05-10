import { Request, Response } from 'express'
import {
  createSchool,
  deleteSchool,
  getSchoolById,
  getSchools,
  updateSchool,
} from '../models/schoolModel'
import { createSchoolSchema, updateSchoolSchema } from '../schemas/schoolSchemas'
import { parseBody } from './userControllerUtils'

export async function createSchoolController(req: Request, res: Response) {
  const validation = parseBody(createSchoolSchema, req.body)

  if ('error' in validation) {
    return res.status(400).json({
      message: validation.error,
    })
  }

  try {
    const result = await createSchool(validation.data)

    return res.status(201).json({
      message: 'Escola criada com sucesso!',
      school: result,
    })
  } catch (error) {
    const schoolError = getSchoolErrorResponse(error)

    return res.status(schoolError.status).json({
      message: schoolError.message,
    })
  }
}

export async function getSchoolsController(req: Request, res: Response) {
  try {
    const result = await getSchools()

    if (result.length > 0) {
      return res.status(200).json({
        message: 'Escolas encontradas com sucesso!',
        schools: result,
      })
    }

    return res.status(404).json({
      message: 'Não foi encontrada nenhuma escola!',
    })
  } catch (error) {
    const schoolError = getSchoolErrorResponse(error)

    return res.status(schoolError.status).json({
      message: schoolError.message,
    })
  }
}

export async function getSchoolByIdController(req: Request, res: Response) {
  const id = res.locals.schoolId as number

  try {
    const result = await getSchoolById(id)

    if (!result) {
      return res.status(404).json({
        message: 'Escola não encontrada.',
      })
    }

    return res.status(200).json({
      message: 'Escola encontrada com sucesso!',
      school: result,
    })
  } catch (error) {
    const schoolError = getSchoolErrorResponse(error)

    return res.status(schoolError.status).json({
      message: schoolError.message,
    })
  }
}

export async function updateSchoolController(req: Request, res: Response) {
  const id = res.locals.schoolId as number
  const validation = parseBody(updateSchoolSchema, req.body)

  if ('error' in validation) {
    return res.status(400).json({
      message: validation.error,
    })
  }

  try {
    const result = await updateSchool(validation.data, id)

    return res.status(200).json({
      message: 'Escola atualizada com sucesso!',
      school: result,
    })
  } catch (error) {
    const schoolError = getSchoolErrorResponse(error)

    return res.status(schoolError.status).json({
      message: schoolError.message,
    })
  }
}

export async function deleteSchoolController(req: Request, res: Response) {
  const id = res.locals.schoolId as number

  try {
    const result = await deleteSchool(id)

    return res.status(200).json({
      message: 'Escola deletada com sucesso!',
      school: result,
    })
  } catch (error) {
    const schoolError = getSchoolErrorResponse(error)

    return res.status(schoolError.status).json({
      message: schoolError.message,
    })
  }
}

function getSchoolErrorResponse(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === 'P2002') {
      return { status: 409, message: 'Já existe uma escola com este nome.' }
    }

    if (error.code === 'P2025') {
      return { status: 404, message: 'Escola não encontrada.' }
    }
  }

  return { status: 500, message: 'Erro interno ao processar a requisição.' }
}
