import { NextResponse } from 'next/server'
import { sessionCookieOptions } from '@/lib/auth'

export async function POST() {
  try {
    const response = NextResponse.json({ success: true, message: 'Sesión cerrada exitosamente' })
    
    // Clear session cookie
    response.cookies.set({
      ...sessionCookieOptions(),
      value: '',
      maxAge: 0
    })

    return response
  } catch (error) {
    console.error('Error en logout:', error)
    return NextResponse.json({ error: 'Error al cerrar sesión' }, { status: 500 })
  }
}
