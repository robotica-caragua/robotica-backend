import nodemailer from 'nodemailer'
import { AppError } from '../../core/errors/AppError.js'
import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

export class PasswordResetMailer {
  constructor(config) { this.config = config }
  async send(email, link) {
    const c = this.config
    if (!c.SMTP_HOST || !c.SMTP_USER || !c.SMTP_PASSWORD) {
      if (c.NODE_ENV !== 'production') {
        await mkdir('.local/mail', { recursive: true, mode: 0o700 })
        await writeFile(`.local/mail/${randomUUID()}.json`, JSON.stringify({ to: email, resetLink: link }), { mode: 0o600 })
        return
      }
      throw new AppError(503, 'Serviço de email não configurado.')
    }
    const transport = nodemailer.createTransport({
      host: c.SMTP_HOST, port: c.SMTP_PORT, secure: c.SMTP_PORT === 465,
      auth: { user: c.SMTP_USER, pass: c.SMTP_PASSWORD },
    })
    await transport.sendMail({ from: c.MAIL_FROM, to: email,
      subject: 'Recuperação de senha', text: `Use o link para redefinir sua senha: ${link}` })
  }
}
