import { OAuth2Client } from 'google-auth-library'
import { PrismaRepository } from './core/database/PrismaRepository.js'
import { PasswordHasher } from './core/security/PasswordHasher.js'
import { AccessPolicy } from './core/security/AccessPolicy.js'
import { CrudService } from './core/http/CrudService.js'
import { CrudController } from './core/http/CrudController.js'
import { UserRepository } from './modules/users/UserRepository.js'
import { UserService } from './modules/users/UserService.js'
import { UserController } from './modules/users/UserController.js'
import { AuthRepository } from './modules/auth/AuthRepository.js'
import { AuthService } from './modules/auth/AuthService.js'
import { AuthController } from './modules/auth/AuthController.js'
import { TokenService } from './modules/auth/TokenService.js'
import { PasswordResetMailer } from './modules/auth/PasswordResetMailer.js'
import { LocalAuthenticationStrategy } from './modules/auth/strategies/LocalAuthenticationStrategy.js'
import { GoogleAuthenticationStrategy } from './modules/auth/strategies/GoogleAuthenticationStrategy.js'
import { TutorialService } from './modules/tutorials/TutorialService.js'
import { TutorialController } from './modules/tutorials/TutorialController.js'
import { ProjectService } from './modules/projects/ProjectService.js'
import { ProjectController } from './modules/projects/ProjectController.js'
import { CloudinaryStorageStrategy } from './modules/uploads/strategies/CloudinaryStorageStrategy.js'
import { LocalStorageStrategy } from './modules/uploads/strategies/LocalStorageStrategy.js'
import { UploadService } from './modules/uploads/UploadService.js'
import { UploadController } from './modules/uploads/UploadController.js'
import { resourceDefinitions } from './modules/resources.js'
import { AnnouncementService } from './modules/announcements/AnnouncementService.js'
import { AnnouncementController } from './modules/announcements/AnnouncementController.js'

class SchoolRepository extends PrismaRepository {
  constructor(db, select) {
    super(db.school, select)
    this.db = db
  }
  async delete(id) {
    return this.db.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { schoolId: id }, data: { schoolId: null } })
      await tx.event?.updateMany?.({ where: { schoolId: id }, data: { schoolId: null } })
      await tx.project.deleteMany({ where: { schoolId: id } })
      await tx.tutorial.deleteMany({ where: { schoolId: id } })
      return tx.school.delete({ where: { id }, select: this.select })
    })
  }
}

export function createContainer({ db, jwt, config, overrides = {} }) {
  const users = new UserRepository(db)
  const passwords = overrides.passwords || new PasswordHasher()
  const tokens = new TokenService(jwt, config)
  const hasCloudinary = Boolean(
    config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET,
  )
  const storage = overrides.storage || (hasCloudinary
    ? new CloudinaryStorageStrategy(config)
    : new LocalStorageStrategy(config))
  const uploads = overrides.uploads || new UploadService(storage)
  const schools = new SchoolRepository(db, resourceDefinitions.schools.select)
  const repositories = { users, schools }
  const controllers = {}
  for (const [name, definition] of Object.entries(resourceDefinitions)) {
    const repository = repositories[name] || new PrismaRepository(db[definition.key], definition.select)
    repositories[name] = repository
    const service = name === 'users' ? new UserService(repository, definition, passwords)
      : name === 'tutorials' ? new TutorialService(repository, definition, users, uploads)
        : name === 'projects' ? new ProjectService(repository, definition, users, uploads)
          : name === 'announcements' ? new AnnouncementService(repository, definition)
            : new CrudService(repository, definition)
    controllers[name] = name === 'users' ? new UserController(service, definition)
      : name === 'tutorials' ? new TutorialController(service, definition)
        : name === 'projects' ? new ProjectController(service, definition)
          : name === 'announcements' ? new AnnouncementController(service, definition)
            : new CrudController(service, definition)
  }
  const strategies = new Map([
    ['local', new LocalAuthenticationStrategy(users, passwords)],
    ['google', new GoogleAuthenticationStrategy(users, passwords,
      overrides.googleClient || new OAuth2Client(config.GOOGLE_CLIENT_ID), config)],
  ])
  const authService = new AuthService({ users, passwords, tokens, strategies,
    sessions: new AuthRepository(db), schools: repositories.schools,
    groups: new PrismaRepository(db.roboticsGroup),
    mailer: overrides.mailer || new PasswordResetMailer(config), config })
  return {
    controllers,
    auth: new AuthController(authService, tokens),
    uploads: new UploadController(uploads),
    policy: new AccessPolicy(tokens),
  }
}
