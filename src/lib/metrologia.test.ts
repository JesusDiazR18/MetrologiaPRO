import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularProximoControl, calcularStatus, evaluarPuntos } from './metrologia'

test('conforme si |E| ≤ tolerancia', () => {
  assert.equal(calcularStatus(0.05, 0.05), 'APTO')
  assert.equal(calcularStatus(-0.051, 0.05), 'NO_APTO')
  // Errores de coma flotante no deben producir falsos NO_APTO
  assert.equal(calcularStatus(0.1 + 0.2 - 0.25, 0.05), 'APTO')
})

test('evaluarPuntos toma el peor punto e ignora valores no numéricos', () => {
  const ev = evaluarPuntos([
    { patron: '10', instrumento: '10.01' },
    { patron: 20, instrumento: 19.96 },
    { patron: 'x', instrumento: 1 },
  ], 0.05)
  assert.ok(ev)
  assert.equal(ev.points.length, 2)
  assert.equal(ev.worstVar, -0.04)
  assert.equal(ev.worstPatron, 20)
  assert.equal(ev.status, 'APTO')
  assert.equal(evaluarPuntos([{ patron: 'a', instrumento: 'b' }], 1), null)
})

test('próximo control respeta fin de mes', () => {
  const d = calcularProximoControl(new Date(2026, 0, 31), 1)
  assert.equal(d.getMonth(), 1)
  assert.equal(d.getDate(), 28)
})
