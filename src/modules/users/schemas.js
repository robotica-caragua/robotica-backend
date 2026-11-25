import { z } from "zod"
const UserRole = { ADMIN: "ADMIN", TEACHER: "TEACHER" }
const requiredString = (message) => z.string().trim().min(1, message)

const roleSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value
    const normalized = value.trim().toUpperCase()
    if (normalized === "ADMINISTRADOR") return "ADMIN"
    if (normalized === "PROFESSOR") return "TEACHER"
    return normalized
  },
  z.nativeEnum(UserRole, { error: "O campo role é inválido." }),
)

const perfilSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
  z.enum(["PROFESSOR", "ADMINISTRADOR", "TEACHER", "ADMIN"], {
    error: "O campo perfil é inválido.",
  }),
)

const matriculaSchema = z
  .preprocess(
    (value) => {
      if (value === null || value === undefined) return null
      const trimmed = String(value).trim()
      return trimmed.length > 0 ? trimmed : null
    },
    z.string().max(50, "A matrícula deve ter no máximo 50 caracteres.").nullable(),
  )
  .optional()

const baseUserSchema = z.object({
  name: requiredString("O campo name é obrigatório."),
  email: z
    .email("O campo email é inválido.")
    .transform((email) => email.toLowerCase()),
  password: requiredString(
    "O campo password deve ter ao menos 8 caracteres.",
  ).min(8, "O campo password deve ter ao menos 8 caracteres."),
  role: roleSchema.optional(),
  perfil: perfilSchema.optional(),
  permissaoAdministrador: z.boolean().optional(),
  matricula: matriculaSchema,
  schoolId: z
    .number()
    .int()
    .positive("O campo schoolId é inválido.")
    .nullable()
    .optional(),
  schoolIds: z
    .array(z.number().int().positive("O campo schoolIds é inválido."))
    .optional(),
})

function normalizarPerfilUsuario(data) {
  const out = { ...data }
  const perfilUpper = out.perfil
  if (
    perfilUpper === "ADMINISTRADOR" ||
    perfilUpper === "ADMIN" ||
    out.role === "ADMIN" ||
    out.permissaoAdministrador === true
  ) {
    out.role = "ADMIN"
    out.permissaoAdministrador = true
    if (!out.matricula) out.matricula = null
    if (!out.schoolIds && !out.schoolId) {
      out.schoolIds = []
      out.schoolId = null
    }
  } else if (perfilUpper === "PROFESSOR" || perfilUpper === "TEACHER") {
    out.role = "TEACHER"
    out.permissaoAdministrador = false
  }
  return out
}

function validarPerfilCondicional(data, ctx, exigirNaCriacao = false) {
  const perfilInformado = data.perfil
  const ehProfessorExplicito =
    perfilInformado === "PROFESSOR" || perfilInformado === "TEACHER"

  if (ehProfessorExplicito) {
    if ((exigirNaCriacao || data.matricula !== undefined) && !data.matricula) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["matricula"],
        message: "A matrícula é obrigatória para o perfil Professor.",
      })
    }
    const temEscola =
      (Array.isArray(data.schoolIds) && data.schoolIds.length > 0) ||
      Boolean(data.schoolId)
    if (
      (exigirNaCriacao ||
        data.schoolIds !== undefined ||
        data.schoolId !== undefined) &&
      !temEscola
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["schoolIds"],
        message: "Selecione ao menos uma escola vinculada para o perfil Professor.",
      })
    }
  }
}

export const createUserSchema = baseUserSchema
  .superRefine((data, ctx) => validarPerfilCondicional(data, ctx, true))
  .transform(normalizarPerfilUsuario)

export const updateUserSchema = baseUserSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Informe ao menos um campo para atualização.",
  )
  .superRefine((data, ctx) => validarPerfilCondicional(data, ctx, false))
  .transform(normalizarPerfilUsuario)
