import { NextResponse } from 'next/server'
import { authenticate, withSessionCookie } from '@/lib/authenticate'

/**
 * POST /api/auth/verify
 * Autoriza (firma) el registro de una verificación. Solo Admin o Técnico.
 * Si las credenciales son válidas también abre sesión, lo que permite operar
 * desde el visor público (escaneo QR) sin pasar por /login.
 * Body: { username: string, contrasena: string }
 */
export async function POST(req: Request) {
  try {
    const { username, contrasena } = await req.json()
    const result = await authenticate(req, username, contrasena)
    if (!result.ok) return result.response

    const { user } = result
    if (user.Rol !== 'Admin' && user.Rol !== 'Técnico') {
      return NextResponse.json({ error: 'Su rol no permite registrar verificaciones' }, { status: 403 })
    }

    return withSessionCookie(NextResponse.json({ authenticated: true, nombre: user.Nombre, rol: user.Rol }), user)
  } catch (err) {
    console.error('Auth error:', err)
    return NextResponse.json({ error: 'Error de autenticación' }, { status: 500 })
  }
}
