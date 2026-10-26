import { NextResponse, type NextRequest } from 'next/server'
import { getSessionFromRequest, isValidCronRequest } from '@/lib/auth'

// Control de acceso central para toda la API.
//  - Público: autenticación y certificados enlazados desde el visor QR.
//  - Cron: secreto CRON_SECRET (Vercel Cron) o sesión de Administrador.
//  - Lector: solo lectura. Técnico: lectura y registro. Admin: todo (incl. eliminar).

const PUBLIC_ROUTES = [
  /^\/api\/auth\/(login|logout|me|verify)$/,
]
const PUBLIC_GET_ROUTES = [
  /^\/api\/(equipos|patrones)\/[^/]+\/certificado$/,
]
const CRON_ROUTES = /^\/api\/cron\/(alertas|mensual)$/
const DEV_ONLY_ROUTES = /^\/api\/(seed|test_db)(\/|$)/

function deny(status: 401 | 403 | 404, error: string) {
  return NextResponse.json({ error }, { status })
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method.toUpperCase()

  if (PUBLIC_ROUTES.some(r => r.test(pathname))) return NextResponse.next()
  if (method === 'GET' && PUBLIC_GET_ROUTES.some(r => r.test(pathname))) return NextResponse.next()
  if (CRON_ROUTES.test(pathname) && isValidCronRequest(req)) return NextResponse.next()

  if (DEV_ONLY_ROUTES.test(pathname) && process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    return deny(404, 'No disponible')
  }

  const session = getSessionFromRequest(req)
  if (!session) return deny(401, 'Sesión no válida o expirada. Inicie sesión nuevamente.')

  const rol = (session.rol || '').normalize('NFC')
  const isAdmin = rol === 'Admin'
  const adminOnly = pathname.startsWith('/api/usuarios') || pathname.startsWith('/api/cron') || DEV_ONLY_ROUTES.test(pathname)

  if (adminOnly && !isAdmin) return deny(403, 'Se requiere rol de Administrador.')
  if (method === 'DELETE' && !isAdmin) return deny(403, 'Solo un Administrador puede eliminar registros.')
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && rol !== 'Admin' && rol !== 'Técnico') {
    return deny(403, 'Su rol es de solo lectura.')
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
