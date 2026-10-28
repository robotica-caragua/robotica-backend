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
  return existing || db.school.create({ data })
}

async function findOrCreateCategory(name) {
  const existing = await db.category.findFirst({ where: { name } })
  return existing || db.category.create({ data: { name } })
}

async function findOrCreateProject(data) {
  const existing = await db.project.findFirst({ where: { name: data.name } })
  return existing || db.project.create({ data })
}

async function findOrCreateTutorial(data) {
  const existing = await db.tutorial.findFirst({ where: { title: data.title } })
  return existing || db.tutorial.create({ data })
}

try {
  await db.$connect()

  const school = await findOrCreateSchool({
    name: "Escola Municipal BioBot",
    address: "Av. da Tecnologia, 100 - Caraguatatuba/SP",
  })
  const category = await findOrCreateCategory("Introdução à Robótica")
  const advancedCategory = await findOrCreateCategory("Programação")

  const password = await passwords.hash("Demo@123456")
  const user = await db.user.upsert({
    where: { email: "demo@robotica.local" },
    update: {
      name: "Professor Demo",
      role: "ADMIN",
      schoolId: school.id,
      onboardingStatus: "COMPLETED",
    },
    create: {
      name: "Professor Demo",
      email: "demo@robotica.local",
      password,
      role: "ADMIN",
      authProvider: "LOCAL",
      schoolId: school.id,
      onboardingStatus: "COMPLETED",
      onboardingCompletedAt: new Date(),
    },
  })

  const project = await findOrCreateProject({
    name: "Robô seguidor de linha",
    description:
      "Projeto introdutório para montar e programar um robô seguidor de linha.",
    schoolId: school.id,
  })
  const tutorial = await findOrCreateTutorial({
    title: "Primeiros passos com sensores",
    description: "Aprenda a ler um sensor e controlar os motores de um robô.",
    categoryId: category.id,
    difficulty: "EASY",
    schoolId: school.id,
    materialsNeeded: ["Arduino Uno", "Sensor infravermelho", "Kit de motores"],
    tutorialUrl: "https://example.com/tutorial/sensores",
  })
  const advancedTutorial = await findOrCreateTutorial({
    title: "Lógica condicional para robôs",
    description: "Use condições para criar comportamentos responsivos.",
    categoryId: advancedCategory.id,
    difficulty: "MEDIUM",
    schoolId: school.id,
    materialsNeeded: ["Arduino Uno", "Protoboard", "Cabos jumper"],
    tutorialUrl: "https://example.com/tutorial/logica",
  })

  console.log(
    JSON.stringify(
      {
        message: "Seed concluído com sucesso.",
        credentials: { email: user.email, password: "Demo@123456" },
        records: {
          schoolId: school.id,
          projectId: project.id,
          tutorialIds: [tutorial.id, advancedTutorial.id],
        },
      },
      null,
      2,
    ),
  )
} finally {
  await db.$disconnect()
}
