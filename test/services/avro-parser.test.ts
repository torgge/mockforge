import { describe, it, expect } from 'vitest'
import { AvroParser } from '../../src/main/services/avro-parser'

describe('AvroParser', () => {
  describe('parse()', () => {
    it('should parse a simple record with primitive fields', () => {
      const avro = JSON.stringify({
        type: 'record',
        name: 'Person',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'age', type: 'int' },
          { name: 'height', type: 'float' },
          { name: 'active', type: 'boolean' },
          { name: 'data', type: 'bytes' },
        ],
      })

      const result = AvroParser.parse(avro)

      expect(result).toHaveLength(5)
      expect(result[0]).toMatchObject({
        name: 'name',
        type: 'string',
        parentFieldId: null,
      })
      expect(result[1]).toMatchObject({
        name: 'age',
        type: 'number',
        parentFieldId: null,
      })
      expect(result[2]).toMatchObject({
        name: 'height',
        type: 'number',
        parentFieldId: null,
      })
      expect(result[3]).toMatchObject({
        name: 'active',
        type: 'boolean',
        parentFieldId: null,
      })
      expect(result[4]).toMatchObject({
        name: 'data',
        type: 'string',
        parentFieldId: null,
      })
    })

    it('should parse nested records', () => {
      const avro = JSON.stringify({
        type: 'record',
        name: 'Employee',
        fields: [
          { name: 'name', type: 'string' },
          {
            name: 'address',
            type: {
              type: 'record',
              name: 'Address',
              fields: [
                { name: 'street', type: 'string' },
                { name: 'city', type: 'string' },
                { name: 'zip', type: 'string' },
              ],
            },
          },
          { name: 'department', type: 'string' },
        ],
      })

      const result = AvroParser.parse(avro)

      // name, address (object), street, city, zip, department
      expect(result).toHaveLength(6)

      // Find the address object field
      const addressField = result.find((f) => f.name === 'address')
      expect(addressField).toBeDefined()
      expect(addressField!.type).toBe('object')
      expect(addressField!.parentFieldId).toBeNull()

      // Find the child fields of address
      const childFields = result.filter(
        (f) => f.parentFieldId === addressField!.id,
      )
      expect(childFields).toHaveLength(3)
      const childNames = childFields.map((f) => f.name).sort()
      expect(childNames).toEqual(['city', 'street', 'zip'])

      // Department should be at the top level
      const departmentField = result.find((f) => f.name === 'department')
      expect(departmentField!.parentFieldId).toBeNull()
    })

    it('should parse arrays', () => {
      const avro = JSON.stringify({
        type: 'record',
        name: 'Team',
        fields: [
          {
            name: 'members',
            type: {
              type: 'array',
              items: {
                type: 'record',
                name: 'Member',
                fields: [
                  { name: 'name', type: 'string' },
                  { name: 'role', type: 'string' },
                ],
              },
            },
          },
          { name: 'teamName', type: 'string' },
        ],
      })

      const result = AvroParser.parse(avro)

      // members (array), item (object, child of members), name, role (children of item), teamName
      expect(result.length).toBeGreaterThanOrEqual(4)

      // Find the array field
      const arrayField = result.find((f) => f.name === 'members')
      expect(arrayField).toBeDefined()
      expect(arrayField!.type).toBe('array')
      expect(arrayField!.parentFieldId).toBeNull()

      // The array field should have at least one child (the item or its children)
      const arrayChildren = result.filter(
        (f) => f.parentFieldId === arrayField!.id,
      )
      expect(arrayChildren.length).toBeGreaterThanOrEqual(1)
      expect(arrayChildren[0].name).toBe('item')
      expect(arrayChildren[0].type).toBe('object')
    })

    it('should handle union types ("null" + type)', () => {
      const avro = JSON.stringify({
        type: 'record',
        name: 'Nullable',
        fields: [
          { name: 'nickname', type: ['null', 'string'] },
          { name: 'score', type: ['null', 'int'] },
          { name: 'badge', type: ['null', 'boolean'] },
        ],
      })

      const result = AvroParser.parse(avro)

      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({
        name: 'nickname',
        type: 'string',
      })
      expect(result[1]).toMatchObject({
        name: 'score',
        type: 'number',
      })
      expect(result[2]).toMatchObject({
        name: 'badge',
        type: 'boolean',
      })
    })

    it('should map Avro types correctly', () => {
      const avro = JSON.stringify({
        type: 'record',
        name: 'TypeMap',
        fields: [
          { name: 'a_string', type: 'string' },
          { name: 'a_bytes', type: 'bytes' },
          { name: 'an_int', type: 'int' },
          { name: 'a_long', type: 'long' },
          { name: 'a_float', type: 'float' },
          { name: 'a_double', type: 'double' },
          { name: 'a_boolean', type: 'boolean' },
        ],
      })

      const result = AvroParser.parse(avro)

      const map = new Map(result.map((f) => [f.name, f.type]))
      expect(map.get('a_string')).toBe('string')
      expect(map.get('a_bytes')).toBe('string')
      expect(map.get('an_int')).toBe('number')
      expect(map.get('a_long')).toBe('number')
      expect(map.get('a_float')).toBe('number')
      expect(map.get('a_double')).toBe('number')
      expect(map.get('a_boolean')).toBe('boolean')
    })

    it('should throw on invalid Avro schema (not a record)', () => {
      const avro = JSON.stringify({
        type: 'array',
        items: 'string',
      })

      expect(() => AvroParser.parse(avro)).toThrow('Invalid Avro schema')
    })

    it('should throw on missing fields array', () => {
      const avro = JSON.stringify({
        type: 'record',
        name: 'Empty',
      })

      expect(() => AvroParser.parse(avro)).toThrow('Invalid Avro schema')
    })

    it('should throw on non-object input', () => {
      expect(() => AvroParser.parse('"just a string"')).toThrow(
        'Invalid Avro schema',
      )
    })

    it('should throw on invalid JSON', () => {
      expect(() => AvroParser.parse('{bad json}')).toThrow('Invalid JSON')
    })

    it('should assign sequential order values within each parent scope', () => {
      const avro = JSON.stringify({
        type: 'record',
        name: 'Ordered',
        fields: [
          { name: 'first', type: 'int' },
          { name: 'second', type: 'string' },
          { name: 'third', type: 'boolean' },
        ],
      })

      const result = AvroParser.parse(avro)

      expect(result[0].name).toBe('first')
      expect(result[0].order).toBe(0)
      expect(result[1].name).toBe('second')
      expect(result[1].order).toBe(1)
      expect(result[2].name).toBe('third')
      expect(result[2].order).toBe(2)
    })

    it('should generate unique IDs for each field', () => {
      const avro = JSON.stringify({
        type: 'record',
        name: 'UniqueIDs',
        fields: [
          { name: 'a', type: 'string' },
          { name: 'b', type: 'int' },
          { name: 'c', type: 'boolean' },
        ],
      })

      const result = AvroParser.parse(avro)

      const ids = result.map((f) => f.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(3)
    })
  })
})
