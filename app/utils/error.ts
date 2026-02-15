export function extractErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const e = err as Record<string, any>
  return e?.statusMessage || e?.data?.message || fallback
}
