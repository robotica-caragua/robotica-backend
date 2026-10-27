import { registerCrudRoutes } from '../../core/http/registerCrudRoutes.js'

export function userRoutes(app, controller, policy) {
  const guards = [policy.authenticate, policy.completed, policy.role('ADMIN')]
  registerCrudRoutes(app, '/users', controller, guards)
  app.get('/users/:id/school', { preHandler: guards }, controller.school)
}
