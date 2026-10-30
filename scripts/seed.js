import "dotenv/config"
import { createDatabase } from "../src/core/database/prisma.js"
import { PasswordHasher } from "../src/core/security/PasswordHasher.js"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl)
  throw new Error("DATABASE_URL é obrigatória para executar o seed.")

const config = { DATABASE_URL: databaseUrl }
const db = await createDatabase(config)
const passwords = new PasswordHasher()

async function findOrCreateSchool(data) {
  const existing = await db.school.findFirst({ where: { name: data.name } })
  if (existing) {
    return db.school.update({
      where: { id: existing.id },
      data: { address: data.address },
    })
  }
  return db.school.create({ data })
}

try {
  await db.$connect()

  // As 4 escolas oficiais da rede municipal de Caraguatatuba
  const escolasOficiais = [
    {
      name: "EMEF Profª Maria Aparecida De Carvalho",
      address: "R. Seishi Yoshimoto, 120 - Getuba, Caraguatatuba - SP, 11676-403",
    },
    {
      name: "EMEF Prof. Luiz Ribeiro Muniz",
      address: "R. Analândia, 355 - Martim de Sá, Caraguatatuba - SP, 11662-320",
    },
    {
      name: "EMEF Prof. Luiz Silvar do Prado",
      address: "R. José Pedro de Oliveira Barbosa, 805 - Jardim Casa Branca, Caraguatatuba - SP",
    },
    {
      name: "EMEF Profª Maria Thereza de Souza Castro",
      address: "R. Seishi Yoshimoto, 120 - Getuba, Caraguatatuba - SP, 11676-403",
    },
  ]

  const escolasCriadas = []
  for (const esc of escolasOficiais) {
    const criada = await findOrCreateSchool(esc)
    escolasCriadas.push(criada)
  }

  const school = escolasCriadas[0]

  // Limpa tutoriais e projetos para manter banco limpo
  await db.tutorial.deleteMany({})
  await db.project.deleteMany({})

  // Remove usuário demo
  await db.user.deleteMany({
    where: { email: { in: ["demo@robotica.local", "demo@gmail.com"] } }
  })

  // Usuário Administrador
  const passwordAdmin = await passwords.hash("Admin123@")
  const admin = await db.user.upsert({
    where: { email: "admin@gmail.com" },
    update: {
      name: "Administrador",
      password: passwordAdmin,
      role: "ADMIN",
      schoolId: school.id,
      onboardingStatus: "COMPLETED",
    },
    create: {
      name: "Administrador",
      email: "admin@gmail.com",
      password: passwordAdmin,
      role: "ADMIN",
      authProvider: "LOCAL",
      schoolId: school.id,
      onboardingStatus: "COMPLETED",
      onboardingCompletedAt: new Date(),
    },
  })

  // Usuário Professor Robson
  const passwordRobson = await passwords.hash("Robson123@")
  const robson = await db.user.upsert({
    where: { email: "robson@gmail.com" },
    update: {
      name: "Prof. Robson Nascimento",
      password: passwordRobson,
      role: "TEACHER",
      schoolId: school.id,
      onboardingStatus: "COMPLETED",
    },
    create: {
      name: "Prof. Robson Nascimento",
      email: "robson@gmail.com",
      password: passwordRobson,
      role: "TEACHER",
      authProvider: "LOCAL",
      schoolId: school.id,
      onboardingStatus: "COMPLETED",
      onboardingCompletedAt: new Date(),
    },
  })

  console.log(
    JSON.stringify(
      {
        message: "Seed atualizado com sucesso. Apenas as escolas e usuários solicitados mantidos.",
        escolas: escolasCriadas.map((e) => ({ id: e.id, name: e.name })),
        usuarios: [
          { email: admin.email, role: admin.role },
          { email: robson.email, role: robson.role }
        ]
      },
      null,
      2
    )
  )
} catch (error) {
  console.error("Erro no seed:", error)
  process.exitCode = 1
} finally {
  await db.$disconnect()
}
