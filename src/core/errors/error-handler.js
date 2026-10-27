import { AppError } from './AppError.js'

export function errorHandler(error, request, reply) {
  if (error instanceof AppError) return reply.code(error.statusCode).send({ message: error.message })
  const databaseErrors = {
    P2002: [409, 'Já existe um registro com este valor.'],
    P2003: [400, 'O vínculo informado não existe ou o registro está em uso.'],
    P2025: [404, 'Registro não encontrado.'],
  }
  if (databaseErrors[error.code]) {
    const [status, message] = databaseErrors[error.code]
    return reply.code(status).send({ message })
  }
  if (error.statusCode >= 400 && error.statusCode < 500) {
    return reply.code(error.statusCode).send({ message: error.message })
  }
  request.log.error({ err: error }, 'Request failed')
  return reply.code(500).send({ message: 'Erro interno ao processar a requisição.' })
}
