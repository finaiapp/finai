export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  await checkRateLimit(apiRateLimiter, getRequestIP(event, { xForwardedFor: true }) || 'unknown')
  const body = await readBody(event)

  const { name, icon, color } = body || {}

  const nameValidation = validateCategoryName(name || '')
  if (!nameValidation.valid) {
    throw createError({ statusCode: 400, statusMessage: nameValidation.message })
  }

  try {
    const category = await createCategory(session.user.id, { name, icon, color })
    return category
  } catch (err: any) {
    if (err.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'Category already exists' })
    }
    throw err
  }
})
