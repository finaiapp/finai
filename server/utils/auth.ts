import { randomBytes } from 'node:crypto'
import { eq, and, isNull, gt } from 'drizzle-orm'
import { db } from '../database'
import { users, verificationTokens } from '../database/schema'

export async function findUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  })
}

export async function findUserByProvider(provider: string, providerId: string) {
  return db.query.users.findFirst({
    where: and(eq(users.provider, provider), eq(users.providerId, providerId)),
  })
}

export async function createUser(data: {
  email: string
  name: string
  passwordHash?: string
  avatarUrl?: string
  provider?: string
  providerId?: string
  emailVerified?: boolean
}) {
  const [user] = await db
    .insert(users)
    .values({
      email: data.email.toLowerCase(),
      name: data.name,
      passwordHash: data.passwordHash ?? null,
      avatarUrl: data.avatarUrl ?? null,
      provider: data.provider ?? null,
      providerId: data.providerId ?? null,
      emailVerified: data.emailVerified ?? false,
    })
    .returning()
  return user
}

export async function upsertOAuthUser(
  provider: string,
  profile: { id: string; email: string; name: string; avatarUrl?: string },
) {
  const existing = await findUserByProvider(provider, profile.id)
  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        name: profile.name,
        avatarUrl: profile.avatarUrl ?? existing.avatarUrl,
        emailVerified: true,
      })
      .where(eq(users.id, existing.id))
      .returning()
    return updated
  }

  return createUser({
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
    provider,
    providerId: profile.id,
    emailVerified: true,
  })
}

export async function createVerificationToken(
  userId: number,
  type: 'email_verify' | 'password_reset',
) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db.insert(verificationTokens).values({
    userId,
    token,
    type,
    expiresAt,
  })

  return token
}

export async function verifyToken(token: string, type: 'email_verify' | 'password_reset') {
  const [found] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.token, token),
        eq(verificationTokens.type, type),
        isNull(verificationTokens.usedAt),
        gt(verificationTokens.expiresAt, new Date()),
      ),
    )
    .limit(1)

  if (!found) return null

  await db
    .update(verificationTokens)
    .set({ usedAt: new Date() })
    .where(eq(verificationTokens.id, found.id))

  return found
}
