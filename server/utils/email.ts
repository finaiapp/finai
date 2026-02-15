import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.APP_URL}/verify-email?token=${token}`

  await resend.emails.send({
    to: email,
    from: process.env.EMAIL_FROM!,
    subject: 'Verify your finai account',
    html: `
      <h2>Welcome to finai!</h2>
      <p>Click the link below to verify your email address:</p>
      <p><a href="${verifyUrl}">Verify Email</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
    `,
  })
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`

  await resend.emails.send({
    to: email,
    from: process.env.EMAIL_FROM!,
    subject: 'Reset your finai password',
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
    `,
  })
}
