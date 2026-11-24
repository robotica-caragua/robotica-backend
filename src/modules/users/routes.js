export function userRoutes(app, controller, policy) {
  const guards = [policy.authenticate, policy.completed, policy.role('ADMIN')]
  const selfOrAdmin = [policy.authenticate, policy.completed, policy.selfOrAdmin]
  app.get('/users', { preHandler: guards }, controller.list)
  app.post('/users', { preHandler: guards }, controller.create)
  app.get('/users/:id', { preHandler: selfOrAdmin }, controller.get)
  app.put('/users/:id', { preHandler: selfOrAdmin }, controller.update)
  app.delete('/users/:id', { preHandler: guards }, controller.delete)
  app.get('/users/:id/school', { preHandler: selfOrAdmin }, controller.school)
}
