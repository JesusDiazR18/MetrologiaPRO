import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('qms_session')?.value

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 })
    }

    let payload: any = null
    try {
      const decoded = Buffer.from(sessionCookie, 'base64').toString('utf-8')
      payload = JSON.parse(decoded)
    } catch {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 })
    }

    if (!payload || !payload.email || (payload.expiresAt && Date.now() > payload.expiresAt)) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 })
    }

    // Verify user is in DB
    const usuario = await prisma.usuario.findUnique({
      where: { Email: payload.email },
      select: {
        Email: true,
        Nombre: true,
        Rol: true
      }
    })

    if (!usuario) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        email: usuario.Email,
        nombre: usuario.Nombre,
        rol: usuario.Rol,
        username: usuario.Email.split('@')[0]
      }
    })
  } catch (error) {
    console.error('Error en auth/me:', error)
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 })
  }
}
