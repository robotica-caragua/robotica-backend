import { registerCrudRoutes } from '../../core/http/registerCrudRoutes.js'

export function userRoutes(app, controller, policy) {
  const guards = [policy.authenticate, policy.completed, policy.role('ADMIN')]
  app.put('/users/me', { preHandler: [policy.authenticate] }, controller.updateProfile)
  registerCrudRoutes(app, '/users', controller, guards)
  app.get('/users/:id/school', { preHandler: guards }, controller.school)
  app.patch('/users/:id/approval', { preHandler: guards }, controller.approval)
}
