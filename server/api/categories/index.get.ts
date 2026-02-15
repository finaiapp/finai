export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  return seedDefaultCategories(session.user.id)
})
