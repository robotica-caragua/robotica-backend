import { z } from "zod"
const UserRole = { ADMIN: "ADMIN", TEACHER: "TEACHER" }
const requiredString = (message) => z.string().trim().min(1, message)

const roleSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
  z.nativeEnum(UserRole, { error: "O campo role é inválido." }),
)

export const createUserSchema = z.object({
  name: requiredString("O campo name é obrigatório."),
  email: z
    .email("O campo email é inválido.")
    .transform((email) => email.toLowerCase()),
  password: requiredString(
    "O campo password deve ter ao menos 8 caracteres.",
  ).min(8, "O campo password deve ter ao menos 8 caracteres."),
  role: roleSchema.optional(),
  schoolId: z
    .number()
    .int()
    .positive("O campo schoolId é inválido.")
    .optional(),
})

export const updateUserSchema = createUserSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Informe ao menos um campo para atualização.",
  )

const approvalAliases = { PENDENTE: "PENDING", DEFERIDO: "APPROVED", INDEFERIDO: "REJECTED" }
const approvalStatusSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value
    const normalized = value.trim().toUpperCase()
    return approvalAliases[normalized] ?? normalized
  },
  z.enum(["PENDING", "APPROVED", "REJECTED"], {
    error: "O campo status deve ser Pendente, Deferido ou Indeferido.",
  }),
)

export const updateApprovalSchema = z.object({ status: approvalStatusSchema })

export const listUsersQuerySchema = z.object({ status: approvalStatusSchema.optional() })

export const updateProfileSchema = createUserSchema
  .pick({ name: true, email: true })
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Informe ao menos um campo para atualização.",
  )
