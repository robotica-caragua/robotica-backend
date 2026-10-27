import { type ZodType } from 'zod'

export function parseBody<T>(schema: ZodType<T>, body: unknown) {
  const result = schema.safeParse(body)

  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? 'O corpo da requisição deve ser um objeto JSON.',
    }
  }

  return { data: result.data }
}

export function getProjectErrorResponse(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === 'P2002') {
      return getProjectAlreadyExistsResponse()
    }

    if (error.code === 'P2025') {
      return getProjectNotFoundErrorResponse()
    }
  }

  return { status: 500, message: 'Erro interno ao processar a requisição.' }
}

export function getProjectNotFoundErrorResponse() {
  return { status: 404, message: 'Projeto não encontrado.' }
}

export function getProjectForbiddenResponse() {
  return { status: 403, message: 'Você não tem permissão para acessar este projeto.' }
}

export function getProjectUnauthorizedResponse() {
  return { status: 401, message: 'Você precisa estar autenticado para acessar este recurso.' }
}

export function getProjectBadRequestResponse() {
  return { status: 400, message: 'Requisição inválida.' }
}

export function getProjectAlreadyExistsResponse() {
  return { status: 409, message: 'Já existe um projeto com este nome.' }
}
