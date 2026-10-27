import type { RouteLocationNormalized } from 'vue-router'

interface Session {
  user: { role: string } | null
  validateSession(): Promise<boolean>
}

/** Default-deny private routes; the API remains the authority for identity and ownership. */
export function createAccessGuard(auth: Session, readResource: (path: string) => Promise<void>) {
  return async (to: Pick<RouteLocationNormalized, 'meta' | 'params' | 'name'>) => {
    if (to.meta.public) return true
    const verified = await auth.validateSession()
    if (to.meta.guest) return verified ? { name: 'dashboard' } : true
    if (!verified || !auth.user) return { name: 'login' }

    const roles = to.meta.roles as string[] | undefined
    const role = to.meta.role as string | undefined
    if ((role && auth.user.role !== role) || (roles && !roles.includes(auth.user.role))) {
      return { name: 'access-denied' }
    }
    if (to.params.id !== undefined) {
      const id = to.params.id
      if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id) || Number(id) > 2147483647) {
        return { name: 'access-denied' }
      }
      // Check the participant on the server before mounting private detail views.
      const resource = to.name === 'contrato' ? `/contratos/${id}`
        : to.name === 'chat' ? `/chats/${id}/messages?limit=1&offset=0` : null
      if (resource) {
        try { await readResource(resource) }
        catch { return { name: 'access-denied' } }
      }
    }
    return true
  }
}
