import { AppError } from '../errors/AppError.js'

export function parse(schema, data) {
  const result = schema.safeParse(data)
  if (!result.success) throw new AppError(400, result.error.issues[0]?.message || 'Requisição inválida.')
  return result.data
}

export function parseId(value, label) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
    throw new AppError(400, `ID de ${label} inválido.`)
  }
  return Number(value)
}
