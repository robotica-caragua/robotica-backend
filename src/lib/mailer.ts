import nodemailer from 'nodemailer'

function getEnv(name: string): string | undefined {
  const value = process.env[name]
  return value && value.trim() ? value : undefined
}

function getRequiredEnv(name: string): string {
  const value = getEnv(name)

  if (!value) {
    throw new Error(`Faltando variável de ambiente: ${name}`)
  }

  return value
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  const host = getEnv('SMTP_HOST')
  const port = getEnv('SMTP_PORT')
  const user = getEnv('SMTP_USER')
  const password = getEnv('SMTP_PASSWORD')
  const from = getEnv('MAIL_FROM') || 'no-reply@robotica.local'

  if (!host || !port || !user || !password) {
    console.log('[mail] password reset link:', resetLink)
    return
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: {
      user,
      pass: password,
    },
  })

  await transporter.sendMail({
    from,
    to: email,
    subject: 'Recuperação de senha',
    text: `Use o link para redefinir sua senha: ${resetLink}`,
    html: `<p>Use o link para redefinir sua senha:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
  })
}

export function getAppBaseUrl() {
  return getRequiredEnv('APP_BASE_URL')
}
