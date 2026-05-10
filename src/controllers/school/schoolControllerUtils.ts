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

export function getSchoolErrorResponse(error: unknown) {
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
