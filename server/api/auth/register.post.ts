export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password, name } = body || {}

  if (!email || !password || !name) {
    throw createError({ statusCode: 400, statusMessage: 'Email, password, and name are required' })
  }

  if (!validateEmail(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email format' })
  }

  const passwordCheck = validatePassword(password)
  if (!passwordCheck.valid) {
    throw createError({ statusCode: 400, statusMessage: passwordCheck.message })
  }

  const sanitizedName = sanitizeName(name)

  const existing = await findUserByEmail(email)
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'An account with this email already exists' })
  }

  const passwordHash = await hashPassword(password)
  const user = await createUser({
    email,
    name: sanitizedName,
    passwordHash,
  })

  const token = await createVerificationToken(user.id, 'email_verify')
  await sendVerificationEmail(user.email, token)

  setResponseStatus(event, 201)
  return { message: 'Registration successful. Please check your email to verify your account.' }
})
