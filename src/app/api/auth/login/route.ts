import { NextResponse } from 'next/server'
import { authenticate, withSessionCookie } from '@/lib/authenticate'

export async function POST(req: Request) {
  try {
    const { username, contrasena } = await req.json()
    const result = await authenticate(req, username, contrasena)
    if (!result.ok) return result.response

    const { user } = result
    return withSessionCookie(NextResponse.json({
      success: true,
      user: { email: user.Email, nombre: user.Nombre, rol: user.Rol, username: user.Email.split('@')[0] },
    }), user)
  } catch (error) {
    console.error('Error en login:', error)
    return NextResponse.json({ error: 'Error interno del servidor al iniciar sesión' }, { status: 500 })
  }
}
