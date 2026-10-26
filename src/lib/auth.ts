import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'

// ─────────────────────────────────────────────
//  Sesiones firmadas (HMAC-SHA256) y hashing de contraseñas (scrypt)
// ─────────────────────────────────────────────

export const SESSION_COOKIE = 'qms_session'
export const SESSION_MAX_AGE_S = 12 * 60 * 60 // 12 horas

export type Rol = 'Admin' | 'Técnico' | 'Lector'

export interface SessionPayload {
  email: string
  nombre: string
  rol: string
  username: string
  createdAt: number
  expiresAt: number
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (secret && secret.length >= 32) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET no configurado (mínimo 32 caracteres)')
  }
  // Solo desarrollo local: secreto estable por proceso
  const g = globalThis as unknown as { __devSessionSecret?: string }
  g.__devSessionSecret ??= randomBytes(32).toString('hex')
  return g.__devSessionSecret
}

function sign(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url')
}

export function createSessionToken(user: { Email: string; Nombre: string; Rol: string }): string {
  const now = Date.now()
  const payload: SessionPayload = {
    email: user.Email,
    nombre: user.Nombre,
    rol: user.Rol,
    username: user.Email.split('@')[0],
    createdAt: now,
    expiresAt: now + SESSION_MAX_AGE_S * 1000,
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${sign(body)}`
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = Buffer.from(sign(body))
  const received = Buffer.from(sig)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as SessionPayload
    if (!payload?.email || !payload.expiresAt || Date.now() > payload.expiresAt) return null
    return payload
  } catch {
    return null
  }
}

export function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    path: '/',
    maxAge: SESSION_MAX_AGE_S,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  }
}

export function getSessionFromRequest(req: Request): SessionPayload | null {
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.split(/;\s*/).find(c => c.startsWith(`${SESSION_COOKIE}=`))
  return verifySessionToken(match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : null)
}

// ── Contraseñas ──
const HASH_PREFIX = 'scrypt$'

export function hashPassword(plain: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(plain, salt, 64)
  return `${HASH_PREFIX}${salt.toString('base64')}$${hash.toString('base64')}`
}

export function isHashed(stored: string): boolean {
  return stored.startsWith(HASH_PREFIX)
}

/** Verifica contraseña. Soporta contraseñas heredadas en texto plano (se migran al iniciar sesión). */
export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  if (!stored) return false
  if (!isHashed(stored)) {
    const a = Buffer.from(plain)
    const b = Buffer.from(stored)
    return a.length === b.length && timingSafeEqual(a, b)
  }
  const [, saltB64, hashB64] = stored.split('$')
  if (!saltB64 || !hashB64) return false
  const expected = Buffer.from(hashB64, 'base64')
  const actual = scryptSync(plain, Buffer.from(saltB64, 'base64'), expected.length)
  return timingSafeEqual(expected, actual)
}

// ── Limitador de intentos de inicio de sesión (por instancia) ──
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 8
const WINDOW_MS = 15 * 60 * 1000

export function isRateLimited(key: string): boolean {
  const entry = attempts.get(key)
  return !!entry && entry.resetAt > Date.now() && entry.count >= MAX_ATTEMPTS
}

export function registerFailedAttempt(key: string) {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || entry.resetAt <= now) attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
  else entry.count++
}

export function clearAttempts(key: string) {
  attempts.delete(key)
}

export function clientKey(req: Request, username: string): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  return `${ip}|${username}`
}

/** Comparación constante del secreto de cron (Vercel envía `Authorization: Bearer <CRON_SECRET>`). */
export function isValidCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const a = Buffer.from(req.headers.get('authorization') || '')
  const b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && timingSafeEqual(a, b)
}
