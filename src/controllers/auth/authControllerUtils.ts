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

export function getAuthErrorResponse(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === 'P2002') {
      return { status: 409, message: 'Já existe um registro com este valor.' }
    }

    if (error.code === 'P2003') {
      return { status: 400, message: 'O vínculo informado não existe.' }
    }

    if (error.code === 'P2025') {
      return { status: 404, message: 'Registro não encontrado.' }
    }
  }

  return { status: 500, message: 'Erro interno ao processar a requisição.' }
}
