export function registerCrudRoutes(app, path, controller, preHandler = [], writeGuards = []) {
  const write = [...preHandler, ...writeGuards]
  app.get(path, { preHandler }, controller.list)
  app.get(`${path}/:id`, { preHandler }, controller.get)
  app.post(path, { preHandler: write }, controller.create)
  app.put(`${path}/:id`, { preHandler: write }, controller.update)
  app.delete(`${path}/:id`, { preHandler: write }, controller.delete)
}
