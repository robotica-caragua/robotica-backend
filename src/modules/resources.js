import * as users from './users/schemas.js'
import * as schools from './schools/schemas.js'
import * as projects from './projects/schemas.js'
import * as categories from './categories/schemas.js'
import * as tutorials from './tutorials/schemas.js'

function definition(key, plural, label, schemas, title, gender, empty, select) {
  const feminine = gender === 'f'
  const suffix = feminine ? 'a' : 'o'
  const capitalized = key[0].toUpperCase() + key.slice(1)
  return { key, plural, label, select,
    createSchema: schemas[`create${capitalized}Schema`], updateSchema: schemas[`update${capitalized}Schema`],
    messages: {
      create: `${title} criad${suffix} com sucesso!`, update: `${title} atualizad${suffix} com sucesso!`,
      delete: `${title} deletad${suffix} com sucesso!`, get: `${title} encontrad${suffix} com sucesso!`,
      notFound: `${title} não encontrad${suffix}.`, empty,
    },
  }
}

const timestamps = { createdAt: true, updatedAt: true }
export const resourceDefinitions = {
  users: definition('user', 'users', 'usuário', users, 'Usuário', 'm', 'Não foi encontrado nenhum usuário!'),
  schools: definition('school', 'schools', 'escola', schools, 'Escola', 'f', 'Não foi encontrada nenhuma escola!',
    { id: true, name: true, address: true, ...timestamps }),
  projects: definition('project', 'projects', 'projeto', projects, 'Projeto', 'm', 'Não foi encontrado nenhum projeto!',
    { id: true, name: true, description: true, schoolId: true, school: true, ...timestamps }),
  categories: definition('category', 'categories', 'categoria', categories, 'Categoria', 'f', 'Não foi encontrada nenhuma categoria!',
    { id: true, name: true }),
  tutorials: definition('tutorial', 'tutorials', 'tutorial', tutorials, 'Tutorial', 'm', 'Não foi encontrado nenhum tutorial!',
    { id: true, title: true, description: true, categoryId: true, category: true, difficulty: true,
      schoolId: true, school: true, materialsNeeded: true, tutorialUrl: true, ...timestamps }),
}
Object.assign(resourceDefinitions.users.messages, { list: 'Usuários encontrados com sucesso!' })
Object.assign(resourceDefinitions.schools.messages, { list: 'Escolas encontradas com sucesso!' })
Object.assign(resourceDefinitions.projects.messages, { list: 'Projetos encontrados com sucesso!' })
Object.assign(resourceDefinitions.categories.messages, { list: 'Categorias encontradas com sucesso!' })
Object.assign(resourceDefinitions.tutorials.messages, { list: 'Tutoriais encontrados com sucesso!' })
