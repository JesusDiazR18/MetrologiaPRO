import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSessionToken, hashPassword, isHashed, verifyPassword, verifySessionToken } from './auth'

test('hash scrypt y verificación de contraseña', () => {
  const h = hashPassword('s3creta')
  assert.ok(isHashed(h))
  assert.ok(verifyPassword('s3creta', h))
  assert.ok(!verifyPassword('otra', h))
})

test('contraseñas heredadas en texto plano siguen funcionando', () => {
  assert.ok(verifyPassword('legacy', 'legacy'))
  assert.ok(!verifyPassword('legacy', 'legacyx'))
})

test('token de sesión firmado no puede alterarse', () => {
  const token = createSessionToken({ Email: 'a@b.cl', Nombre: 'A', Rol: 'Lector' })
  assert.equal(verifySessionToken(token)?.rol, 'Lector')
  const [body, sig] = token.split('.')
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
  const forged = Buffer.from(JSON.stringify({ ...payload, rol: 'Admin' })).toString('base64url')
  assert.equal(verifySessionToken(`${forged}.${sig}`), null)
  assert.equal(verifySessionToken('basura'), null)
})
