import { describe, it, expect, beforeAll } from 'vitest'
import { resolveFields } from '../../src/main/services/nested-resolver'
import type { Field } from '@shared/ipc.types'

// ── Schema definition ──
// Realistic User schema with nested Address + tags array
// Top-level: id, name, email, age, role, isActive, phone, address, tags
// Nested: address -> street, city, zipCode
// Array child: tags -> tagItem
//
// 13 Field objects total (9 top-level + 3 address children + 1 tags child)
// Mix of strategies used: Format (uuid), Range (age), Enum (role), Default (rest)

const ADDRESS_FIELD_ID = 'f8'
const TAGS_FIELD_ID = 'f9'

const SCHEMA_FIELDS: Field[] = [
  // Top-level fields (parentFieldId = null)
  { id: 'f1', schemaId: 'bench-schema', parentFieldId: null, name: 'id', type: 'string', rule: { kind: 'format', subtype: 'uuid' }, order: 0 },
  { id: 'f2', schemaId: 'bench-schema', parentFieldId: null, name: 'name', type: 'string', rule: null, order: 1 },
  { id: 'f3', schemaId: 'bench-schema', parentFieldId: null, name: 'email', type: 'string', rule: null, order: 2 },
  { id: 'f4', schemaId: 'bench-schema', parentFieldId: null, name: 'age', type: 'number', rule: { kind: 'range', min: 18, max: 99 }, order: 3 },
  { id: 'f5', schemaId: 'bench-schema', parentFieldId: null, name: 'role', type: 'string', rule: { kind: 'enum', values: ['admin', 'user', 'moderator'] }, order: 4 },
  { id: 'f6', schemaId: 'bench-schema', parentFieldId: null, name: 'isActive', type: 'boolean', rule: null, order: 5 },
  { id: 'f7', schemaId: 'bench-schema', parentFieldId: null, name: 'phone', type: 'string', rule: null, order: 6 },
  { id: ADDRESS_FIELD_ID, schemaId: 'bench-schema', parentFieldId: null, name: 'address', type: 'object', rule: null, order: 7 },
  { id: TAGS_FIELD_ID, schemaId: 'bench-schema', parentFieldId: null, name: 'tags', type: 'array', rule: null, order: 8 },

  // Nested address fields (parent = address)
  { id: 'a1', schemaId: 'bench-schema', parentFieldId: ADDRESS_FIELD_ID, name: 'street', type: 'string', rule: null, order: 0 },
  { id: 'a2', schemaId: 'bench-schema', parentFieldId: ADDRESS_FIELD_ID, name: 'city', type: 'string', rule: null, order: 1 },
  { id: 'a3', schemaId: 'bench-schema', parentFieldId: ADDRESS_FIELD_ID, name: 'zipCode', type: 'string', rule: null, order: 2 },

  // Array child field (parent = tags)
  { id: 't1', schemaId: 'bench-schema', parentFieldId: TAGS_FIELD_ID, name: 'tagItem', type: 'string', rule: null, order: 0 },
]

// ── Benchmark helpers ──

function generateN(count: number): unknown[] {
  const results: unknown[] = []
  for (let i = 0; i < count; i++) {
    results.push(resolveFields(SCHEMA_FIELDS))
  }
  return results
}

function measureTime(label: string, fn: () => void): number {
  const start = performance.now()
  fn()
  const elapsed = performance.now() - start
  console.log(`  ${label}: ${elapsed.toFixed(2)}ms (${(elapsed / 1000).toFixed(2)}s)`)
  return elapsed
}

// ── Validation helpers ──

function validateRecord(record: unknown): void {
  const obj = record as Record<string, unknown>
  expect(obj).toHaveProperty('id')
  expect(obj).toHaveProperty('name')
  expect(obj).toHaveProperty('email')
  expect(obj).toHaveProperty('age')
  expect(obj).toHaveProperty('role')
  expect(obj).toHaveProperty('isActive')
  expect(obj).toHaveProperty('phone')
  expect(obj).toHaveProperty('address')
  expect(obj).toHaveProperty('tags')

  // Type checks
  expect(typeof obj.id).toBe('string')
  expect(typeof obj.name).toBe('string')
  expect(typeof obj.email).toBe('string')
  expect(typeof obj.age).toBe('number')
  expect(typeof obj.isActive).toBe('boolean')

  // Enum check
  expect(['admin', 'user', 'moderator']).toContain(obj.role)

  // Nested object check
  const address = obj.address as Record<string, unknown>
  expect(address).toHaveProperty('street')
  expect(address).toHaveProperty('city')
  expect(address).toHaveProperty('zipCode')
  expect(typeof address.street).toBe('string')
  expect(typeof address.city).toBe('string')
  expect(typeof address.zipCode).toBe('string')

  // Array check: tags has a child tagItem, so each item is an object { tagItem: "..." }
  expect(Array.isArray(obj.tags)).toBe(true)
  if ((obj.tags as unknown[]).length > 0) {
    const tagItem = (obj.tags as Record<string, unknown>[])[0]
    expect(tagItem).toHaveProperty('tagItem')
    expect(typeof tagItem.tagItem).toBe('string')
  }
}

// ── Performance Benchmarks ──

describe('Generator Performance Benchmarks', () => {
  // Warm-up: ensure JIT compilation doesn't skew results
  beforeAll(() => {
    console.log('\n[Warm-up] Generating 10 records...')
    generateN(10)
    console.log('[Warm-up] Complete\n')
  })

  it('benchmark: generate 100 records', () => {
    const elapsed = measureTime('100 records', () => {
      const results = generateN(100)
      expect(results).toHaveLength(100)
      // Validate first and last record
      validateRecord(results[0])
      validateRecord(results[99])
    })
    // Sanity check: 100 records should complete well under 1 second
    expect(elapsed).toBeLessThan(1000)
  })

  it('benchmark: generate 1,000 records (target: < 2s)', () => {
    const elapsed = measureTime('1,000 records', () => {
      const results = generateN(1000)
      expect(results).toHaveLength(1000)
      // Validate a sample
      validateRecord(results[0])
      validateRecord(results[500])
      validateRecord(results[999])
    })
    expect(elapsed).toBeLessThan(2000)
  })

  it('benchmark: generate 10,000 records (target: < 10s)', () => {
    const elapsed = measureTime('10,000 records', () => {
      const results = generateN(10000)
      expect(results).toHaveLength(10000)
      // Validate a sample
      validateRecord(results[0])
      validateRecord(results[5000])
      validateRecord(results[9999])
    })
    expect(elapsed).toBeLessThan(10000)
  })
})
