import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  clearAttempts, clientKey, createSessionToken, hashPassword, isHashed,
  isRateLimited, registerFailedAttempt, sessionCookieOptions, verifyPassword,
} from '@/lib/auth'

const DEFAULT_DOMAIN = process.env.DEFAULT_EMAIL_DOMAIN || 'polifusion.cl'
const GENERIC_ERROR = 'Usuario o contraseña incorrectos'

type AuthResult =
  | { ok: true; user: { Email: string; Nombre: string; Rol: string } }
  | { ok: false; response: NextResponse }

/**
 * Valida credenciales (con límite de intentos) y migra contraseñas heredadas
 * en texto plano a hash scrypt en el primer inicio de sesión exitoso.
 */
export async function authenticate(req: Request, username: unknown, contrasena: unknown): Promise<AuthResult> {
  if (typeof username !== 'string' || typeof contrasena !== 'string' || !username.trim() || !contrasena) {
    return { ok: false, response: NextResponse.json({ error: 'Por favor ingrese usuario y contraseña' }, { status: 400 }) }
  }

  const target = username.trim().toLowerCase()
  const key = clientKey(req, target)
  if (isRateLimited(key)) {
    return { ok: false, response: NextResponse.json({ error: 'Demasiados intentos. Espere 15 minutos e intente nuevamente.' }, { status: 429 }) }
  }

  const emailToSearch = target.includes('@') ? target : `${target}@${DEFAULT_DOMAIN}`
  const usuario = await prisma.usuario.findFirst({
    where: {
      OR: [
        { Email: { equals: emailToSearch, mode: 'insensitive' } },
        { Email: { equals: target, mode: 'insensitive' } },
      ],
    },
  })

  if (!usuario || !usuario.Contrasena || !verifyPassword(contrasena, usuario.Contrasena)) {
    registerFailedAttempt(key)
    return { ok: false, response: NextResponse.json({ error: GENERIC_ERROR }, { status: 401 }) }
  }

  clearAttempts(key)
  if (!isHashed(usuario.Contrasena)) {
    await prisma.usuario.update({ where: { Email: usuario.Email }, data: { Contrasena: hashPassword(contrasena) } })
  }

  return { ok: true, user: { Email: usuario.Email, Nombre: usuario.Nombre, Rol: usuario.Rol } }
}

export function withSessionCookie(res: NextResponse, user: { Email: string; Nombre: string; Rol: string }) {
  res.cookies.set({ ...sessionCookieOptions(), value: createSessionToken(user) })
  return res
}
