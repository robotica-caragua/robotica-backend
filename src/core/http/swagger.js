import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { z } from 'zod'
import * as authSchemas from '../../modules/auth/schemas.js'
import { resourceDefinitions } from '../../modules/resources.js'

function fromZod(zodSchema) {
  const jsonSchema = z.toJSONSchema(zodSchema, {
    unrepresentable: 'any',
    io: 'input',
  })
  delete jsonSchema.$schema
  return jsonSchema
}

const errorResponse = (description) => ({
  description,
  type: 'object',
  properties: { message: { type: 'string' } },
})

const idParams = (label) => ({
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'integer', minimum: 1, description: `ID de ${label}` },
  },
})

const bearerSecurity = [{ bearerAuth: [] }]
const refreshSecurity = [{ cookieAuth: [] }, { refreshHeaderAuth: [] }]

const crudConfig = {
  '/users': { tag: 'Users', readSecurity: bearerSecurity, writeSecurity: bearerSecurity, def: resourceDefinitions.users },
  '/schools': { tag: 'Schools', readSecurity: bearerSecurity, writeSecurity: bearerSecurity, def: resourceDefinitions.schools },
  '/categories': { tag: 'Categories', readSecurity: [], writeSecurity: bearerSecurity, def: resourceDefinitions.categories },
  '/tutorials': { tag: 'Tutorials', readSecurity: [], writeSecurity: bearerSecurity, def: resourceDefinitions.tutorials },
  '/projects': { tag: 'Projects', readSecurity: bearerSecurity, writeSecurity: bearerSecurity, def: resourceDefinitions.projects },
}

const customRoutes = {
  'GET /status': {
    tags: ['Status'],
    summary: 'Verifica o status da API',
    response: {
      200: {
        description: 'API operacional',
        type: 'object',
        properties: { status: { type: 'string', example: 'ok' }, message: { type: 'string', example: 'API  online' } },
      },
    },
  },
  'POST /auth/register': {
    tags: ['Auth'],
    summary: 'Cadastra uma nova conta de professor (TEACHER)',
    body: fromZod(authSchemas.registerSchema),
    response: {
      201: { description: 'Usuário cadastrado e sessão iniciada', type: 'object', additionalProperties: true },
      400: errorResponse('Dados inválidos'),
      409: errorResponse('Email já cadastrado'),
      429: errorResponse('Limite de requisições excedido'),
    },
  },
  'POST /auth/login': {
    tags: ['Auth'],
    summary: 'Autentica usuário com email e senha',
    body: fromZod(authSchemas.loginSchema),
    response: {
      200: { description: 'Login realizado com sucesso', type: 'object', additionalProperties: true },
      400: errorResponse('Dados inválidos'),
      401: errorResponse('Credenciais inválidas'),
      429: errorResponse('Limite de requisições excedido'),
    },
  },
  'POST /auth/google': {
    tags: ['Auth'],
    summary: 'Autentica ou vincula conta institucional via Google ID Token',
    body: fromZod(authSchemas.googleLoginSchema),
    response: {
      200: { description: 'Login com Google realizado com sucesso', type: 'object', additionalProperties: true },
      400: errorResponse('Dados inválidos'),
      401: errorResponse('Token do Google inválido'),
      403: errorResponse('Domínio da conta Google não autorizado'),
      429: errorResponse('Limite de requisições excedido'),
    },
  },
  'POST /auth/refresh': {
    tags: ['Auth'],
    summary: 'Renova o access token e rotaciona o refresh token',
    security: refreshSecurity,
    response: {
      200: { description: 'Token renovado com sucesso', type: 'object', additionalProperties: true },
      400: errorResponse('Refresh token não informado'),
      401: errorResponse('Sessão inválida ou expirada'),
      429: errorResponse('Limite de requisições excedido'),
    },
  },
  'POST /auth/logout': {
    tags: ['Auth'],
    summary: 'Revoga a sessão atual e limpa o cookie de refresh token',
    security: refreshSecurity,
    response: {
      200: errorResponse('Logout realizado com sucesso'),
    },
  },
  'POST /auth/forgot-password': {
    tags: ['Auth'],
    summary: 'Solicita envio de link para redefinição de senha',
    body: fromZod(authSchemas.forgotPasswordSchema),
    response: {
      200: errorResponse('Solicitação processada'),
      400: errorResponse('Email inválido'),
      429: errorResponse('Limite de requisições excedido'),
    },
  },
  'POST /auth/reset-password': {
    tags: ['Auth'],
    summary: 'Redefine a senha usando token de recuperação e revoga sessões',
    body: fromZod(authSchemas.resetPasswordSchema),
    response: {
      200: errorResponse('Senha redefinida com sucesso'),
      400: errorResponse('Token inválido, expirado ou senha inválida'),
      429: errorResponse('Limite de requisições excedido'),
    },
  },
  'GET /auth/me': {
    tags: ['Auth'],
    summary: 'Retorna os dados do usuário autenticado',
    security: bearerSecurity,
    response: {
      200: { description: 'Dados públicos do usuário', type: 'object', additionalProperties: true },
      401: errorResponse('Token de acesso não informado ou inválido'),
      404: errorResponse('Usuário não encontrado'),
    },
  },
  'POST /auth/onboarding': {
    tags: ['Auth'],
    summary: 'Conclui o onboarding do professor vinculando escola e/ou grupo de robótica',
    security: bearerSecurity,
    body: fromZod(authSchemas.completeOnboardingSchema),
    response: {
      200: { description: 'Onboarding concluído e novo access token emitido', type: 'object', additionalProperties: true },
      400: errorResponse('Dados inválidos'),
      401: errorResponse('Token de acesso não informado ou inválido'),
      403: errorResponse('Acesso restrito a professores'),
      404: errorResponse('Escola ou grupo de robótica não encontrado'),
      409: errorResponse('Onboarding já concluído'),
    },
  },
  'GET /users/:id/school': {
    tags: ['Users'],
    summary: 'Consulta a escola vinculada a um usuário',
    security: bearerSecurity,
    params: idParams('usuário'),
    response: {
      200: { description: 'Escola encontrada com sucesso', type: 'object', additionalProperties: true },
      400: errorResponse('ID inválido'),
      401: errorResponse('Não autenticado'),
      403: errorResponse('Acesso restrito a administradores'),
      404: errorResponse('Usuário ou escola não encontrada'),
    },
  },
}

function buildCrudSchema(method, url) {
  const basePath = url.replace(/\/:id$/, '')
  const entry = crudConfig[basePath]
  if (!entry) return null
  const { tag, readSecurity, writeSecurity, def } = entry
  const hasId = url.endsWith('/:id')
  const base = { tags: [tag] }

  if (method === 'GET' && !hasId) {
    return {
      ...base,
      summary: `Lista registros de ${def.label}`,
      ...(readSecurity.length ? { security: readSecurity } : {}),
      response: {
        200: { description: def.messages.list, type: 'object', additionalProperties: true },
        404: errorResponse(def.messages.empty),
      },
    }
  }
  if (method === 'GET' && hasId) {
    return {
      ...base,
      summary: `Busca ${def.label} por ID`,
      ...(readSecurity.length ? { security: readSecurity } : {}),
      params: idParams(def.label),
      response: {
        200: { description: def.messages.get, type: 'object', additionalProperties: true },
        400: errorResponse(`ID de ${def.label} inválido.`),
        404: errorResponse(def.messages.notFound),
      },
    }
  }
  if (method === 'POST') {
    return {
      ...base,
      summary: `Cria ${def.label}`,
      security: writeSecurity,
      body: fromZod(def.createSchema),
      response: {
        201: { description: def.messages.create, type: 'object', additionalProperties: true },
        400: errorResponse('Dados inválidos'),
        401: errorResponse('Não autenticado'),
        403: errorResponse('Acesso negado'),
      },
    }
  }
  if (method === 'PUT') {
    return {
      ...base,
      summary: `Atualiza ${def.label} por ID`,
      security: writeSecurity,
      params: idParams(def.label),
      body: fromZod(def.updateSchema),
      response: {
        200: { description: def.messages.update, type: 'object', additionalProperties: true },
        400: errorResponse('Dados inválidos'),
        401: errorResponse('Não autenticado'),
        403: errorResponse('Acesso negado'),
        404: errorResponse(def.messages.notFound),
      },
    }
  }
  if (method === 'DELETE') {
    return {
      ...base,
      summary: `Remove ${def.label} por ID`,
      security: writeSecurity,
      params: idParams(def.label),
      response: {
        200: { description: def.messages.delete, type: 'object', additionalProperties: true },
        400: errorResponse(`ID de ${def.label} inválido.`),
        401: errorResponse('Não autenticado'),
        403: errorResponse('Acesso negado'),
        404: errorResponse(def.messages.notFound),
      },
    }
  }
  return null
}

function resolveRouteSchema(schema, url, route) {
  if (url.startsWith('/docs')) return { ...schema, hide: true }
  const methods = Array.isArray(route.method) ? route.method : [route.method]
  const method = methods.find((m) => m !== 'HEAD') || methods[0]
  const custom = customRoutes[`${method} ${url}`] || buildCrudSchema(method, url)
  return custom ? { ...schema, ...custom } : schema
}

export async function registerSwagger(app) {
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Robótica Backend API',
        description: 'API em JavaScript ESM, Fastify 5 e Prisma 7 para gestão de robótica educacional.',
        version: '1.0.0',
      },
      tags: [
        { name: 'Status', description: 'Monitoramento e saúde da API' },
        { name: 'Auth', description: 'Autenticação local/Google, sessões, recuperação de senha e onboarding' },
        { name: 'Users', description: 'Gestão de usuários (restrito a ADMIN)' },
        { name: 'Schools', description: 'Gestão de escolas (restrito a ADMIN)' },
        { name: 'Categories', description: 'Categorias de tutoriais (leitura pública, escrita ADMIN)' },
        { name: 'Tutorials', description: 'Tutoriais (leitura pública, escrita ADMIN ou TEACHER da escola)' },
        { name: 'Projects', description: 'Projetos de robótica (usuários autenticados com onboarding concluído)' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Access token JWT no cabeçalho Authorization: Bearer <token>',
          },
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'refreshToken',
            description: 'Refresh token armazenado em cookie HttpOnly',
          },
          refreshHeaderAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'Authorization',
            description: 'Refresh token alternativo via cabeçalho Authorization: Refresh <token>',
          },
        },
      },
    },
    transform: ({ schema, url, route }) => ({
      schema: resolveRouteSchema(schema, url, route),
      url,
    }),
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      persistAuthorization: true,
    },
  })
}
