/**
 * Centralized helper for displaying user names — NEVER returns a UUID.
 * Use this everywhere we render a user reference to avoid the
 * "8521e61f-44c6-..." display bug when full_name is null.
 */

type UserRef = {
  id: string
  full_name?: string | null
  email?: string | null
}

export function getUserName(
  userId: string | null | undefined,
  users: UserRef[],
  fallback = 'Sem responsável',
): string {
  if (!userId) return fallback
  const u = users.find(x => x.id === userId)
  if (!u) return fallback
  if (u.full_name?.trim()) return u.full_name.trim()
  if (u.email?.trim()) return u.email.split('@')[0]
  return fallback
}

/** Same idea but accepts the user object directly. */
export function displayName(u: UserRef | null | undefined, fallback = 'Sem nome'): string {
  if (!u) return fallback
  if (u.full_name?.trim()) return u.full_name.trim()
  if (u.email?.trim()) return u.email.split('@')[0]
  return fallback
}
