export function registerCrudRoutes(app, path, controller, preHandler = []) {
  app.get(path, { preHandler }, controller.list)
  app.get(`${path}/:id`, { preHandler }, controller.get)
  app.post(path, { preHandler }, controller.create)
  app.put(`${path}/:id`, { preHandler }, controller.update)
  app.delete(`${path}/:id`, { preHandler }, controller.delete)
}
