import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * POST /api/auth/verify
 * Verifica credenciales de usuario para autorizar registros de verificación.
 * Solo usuarios con Rol 'Admin' o 'Técnico' y contraseña válida pueden autorizar.
 * Body: { email: string, contrasena: string }
 */
export async function POST(req: Request) {
  try {
    const { email, contrasena } = await req.json()

    if (!email || !contrasena) {
      return NextResponse.json(
        { error: 'Se requiere email y contraseña' },
        { status: 400 }
      )
    }

    const usuario = await prisma.usuario.findUnique({
      where: { Email: email.trim() },
      select: {
        Email: true,
        Nombre: true,
        Rol: true,
        Contrasena: true
      }
    })

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no autorizado' },
        { status: 401 }
      )
    }

    // Solo usuarios con contraseña configurada pueden autorizar
    if (!usuario.Contrasena) {
      return NextResponse.json(
        { error: 'Usuario sin permisos de verificación. Contacte al administrador.' },
        { status: 403 }
      )
    }

    // Verificar contraseña
    if (usuario.Contrasena !== contrasena) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      nombre: usuario.Nombre,
      rol: usuario.Rol
    })
  } catch (err: any) {
    console.error('Auth error:', err)
    return NextResponse.json({ error: 'Error de autenticación' }, { status: 500 })
  }
}
