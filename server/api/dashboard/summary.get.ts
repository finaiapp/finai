export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  return getDashboardSummary(session.user.id)
})
