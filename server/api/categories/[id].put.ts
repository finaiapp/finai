export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid category ID' })
  }

  const body = await readBody(event)
  const { name, icon, color } = body || {}

  if (name !== undefined) {
    const nameValidation = validateCategoryName(name)
    if (!nameValidation.valid) {
      throw createError({ statusCode: 400, statusMessage: nameValidation.message })
    }
  }

  const updated = await updateCategory(id, session.user.id, { name, icon, color })
  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  return updated
})
