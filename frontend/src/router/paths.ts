import type { RouteRecordRaw } from 'vue-router'

// Stable, opaque presentation paths. Authorization is enforced separately.
export const VIEW_PATHS: Record<string, string> = {
  "/saldo/recargar": "/v/8f39c2a1b76de045",
  "/dashboard": "/v/2a71f7866bc48c60",
  "/perfil/empresa": "/v/549abc017e2e6d9f",
  "/perfil/influencer": "/v/26eb9a4d29e00ed0",
  "/influencers": "/v/a104d887a6339858",
  "/influencers/:id": "/v/0643b12d50d37f73/:id",
  "/empresas/:id": "/v/9792a431e3518543/:id",
  "/briefs": "/v/59f32613f64ce793",
  "/chats": "/v/1aa9e792980e97fd",
  "/chats/:id": "/v/a79f4649911657a7/:id",
  "/contratos": "/v/ae9422732923115a",
  "/contratos/:id": "/v/4d7651b1383832d2/:id",
  "/pagos/comprobantes": "/v/7fcc24d86b6fb141",
  "/admin": "/v/2194da0bf144b9b2",
  "/acceso-restringido": "/v/5c2a7844ebd6523b"
}

export function viewPath(path: string): string {
  if (VIEW_PATHS[path]) return VIEW_PATHS[path]
  for (const [original, opaque] of Object.entries(VIEW_PATHS)) {
    if (!original.endsWith('/:id')) continue
    const prefix = original.slice(0, -3)
    if (path.startsWith(prefix) && !path.slice(prefix.length).includes('/')) {
      return opaque.replace(':id', path.slice(prefix.length))
    }
  }
  return path
}

export function opaqueViewRoutes(routes: RouteRecordRaw[]): RouteRecordRaw[] {
  return routes.flatMap((route): RouteRecordRaw[] => {
    const opaque = VIEW_PATHS[route.path]
    if (!opaque || !route.name) return [route]
    return [
      { ...route, path: opaque } as RouteRecordRaw,
      { path: route.path, redirect: (to) => ({ name: route.name, params: to.params, query: to.query, hash: to.hash, replace: true }) },
    ]
  })
}
