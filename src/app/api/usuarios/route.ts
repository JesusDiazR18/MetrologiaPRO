import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

// Helper to verify if requester is Admin
async function isAuthorizedAdmin() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('qms_session')?.value
    if (!sessionCookie) return false

    const decoded = Buffer.from(sessionCookie, 'base64').toString('utf-8')
    const payload = JSON.parse(decoded)
    if (!payload || !payload.email) return false

    const user = await prisma.usuario.findUnique({
      where: { Email: payload.email },
      select: { Rol: true }
    })

    return user?.Rol === 'Admin'
  } catch {
    return false
  }
}

// GET: List all users
export async function GET() {
  try {
    const isAdmin = await isAuthorizedAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado. Se requiere rol de Administrador.' }, { status: 403 })
    }

    const users = await prisma.usuario.findMany({
      select: {
        Email: true,
        Nombre: true,
        Rol: true,
        Contrasena: true
      },
      orderBy: { Nombre: 'asc' }
    })

    const formatted = users.map(u => ({
      email: u.Email,
      nombre: u.Nombre,
      rol: u.Rol,
      username: u.Email.split('@')[0],
      hasPassword: Boolean(u.Contrasena && u.Contrasena.trim().length > 0)
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
  }
}

// POST: Create a new user
export async function POST(req: Request) {
  try {
    const isAdmin = await isAuthorizedAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado. Se requiere rol de Administrador.' }, { status: 403 })
    }

    const body = await req.json()
    const { email, nombre, rol, contrasena } = body

    if (!email || !nombre || !rol) {
      return NextResponse.json({ error: 'Nombre, correo/usuario y rol son obligatorios' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const finalEmail = cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@polifusion.cl`

    // Check if exists
    const existing = await prisma.usuario.findUnique({
      where: { Email: finalEmail }
    })

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un usuario con este correo o identificador' }, { status: 400 })
    }

    const newUser = await prisma.usuario.create({
      data: {
        Email: finalEmail,
        Nombre: nombre.trim(),
        Rol: rol,
        Contrasena: contrasena ? contrasena.trim() : null
      }
    })

    return NextResponse.json({
      success: true,
      user: {
        email: newUser.Email,
        nombre: newUser.Nombre,
        rol: newUser.Rol,
        username: newUser.Email.split('@')[0],
        hasPassword: Boolean(newUser.Contrasena)
      }
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Error interno al crear usuario' }, { status: 500 })
  }
}

// PUT: Update user
export async function PUT(req: Request) {
  try {
    const isAdmin = await isAuthorizedAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado. Se requiere rol de Administrador.' }, { status: 403 })
    }

    const body = await req.json()
    const { email, nombre, rol, contrasena } = body

    if (!email || !nombre || !rol) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const updateData: any = {
      Nombre: nombre.trim(),
      Rol: rol
    }

    if (contrasena !== undefined && contrasena !== null && contrasena.trim().length > 0) {
      updateData.Contrasena = contrasena.trim()
    }

    const updated = await prisma.usuario.update({
      where: { Email: email },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      user: {
        email: updated.Email,
        nombre: updated.Nombre,
        rol: updated.Rol,
        username: updated.Email.split('@')[0],
        hasPassword: Boolean(updated.Contrasena)
      }
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 })
  }
}

// DELETE: Delete user
export async function DELETE(req: Request) {
  try {
    const isAdmin = await isAuthorizedAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado. Se requiere rol de Administrador.' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Correo de usuario requerido' }, { status: 400 })
    }

    // Check count of admins to avoid deleting the only admin
    const adminCount = await prisma.usuario.count({
      where: { Rol: 'Admin' }
    })

    const targetUser = await prisma.usuario.findUnique({
      where: { Email: email }
    })

    if (targetUser?.Rol === 'Admin' && adminCount <= 1) {
      return NextResponse.json({ error: 'No se puede eliminar el único administrador del sistema' }, { status: 400 })
    }

    await prisma.usuario.delete({
      where: { Email: email }
    })

    return NextResponse.json({ success: true, message: 'Usuario eliminado exitosamente' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 })
  }
}
