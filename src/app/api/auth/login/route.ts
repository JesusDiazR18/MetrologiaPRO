import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { username, contrasena } = await req.json()

    if (!username || !contrasena) {
      return NextResponse.json(
        { error: 'Por favor ingrese usuario y contraseña' },
        { status: 400 }
      )
    }

    const target = username.trim().toLowerCase()
    const emailToSearch = target.includes('@') ? target : `${target}@polifusion.cl`

    const usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { Email: { equals: emailToSearch, mode: 'insensitive' } },
          { Email: { equals: target, mode: 'insensitive' } }
        ]
      }
    })

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 401 }
      )
    }

    if (!usuario.Contrasena) {
      return NextResponse.json(
        { error: 'El usuario no tiene una contraseña configurada' },
        { status: 403 }
      )
    }

    if (usuario.Contrasena !== contrasena) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta' },
        { status: 401 }
      )
    }

    const simpleUsername = usuario.Email.split('@')[0]
    const sessionPayload = {
      email: usuario.Email,
      nombre: usuario.Nombre,
      rol: usuario.Rol,
      username: simpleUsername,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    }

    const sessionToken = Buffer.from(JSON.stringify(sessionPayload)).toString('base64')

    const response = NextResponse.json({
      success: true,
      user: {
        email: usuario.Email,
        nombre: usuario.Nombre,
        rol: usuario.Rol,
        username: simpleUsername
      }
    })

    // Set session cookie valid for 30 days
    response.cookies.set({
      name: 'qms_session',
      value: sessionToken,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      httpOnly: false,
      sameSite: 'lax'
    })

    return response
  } catch (error) {
    console.error('Error en login:', error)
    return NextResponse.json({ error: 'Error interno del servidor al iniciar sesión' }, { status: 500 })
  }
}
