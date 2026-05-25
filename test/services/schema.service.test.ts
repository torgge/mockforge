import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestDb, clearTestDb, type TestDb } from './test-db'
import type { ProjectCreatePayload } from '@shared/ipc.types'

const testDb: TestDb = createTestDb()

vi.doMock('../../src/main/db/client', () => ({
  getSqlite: () => testDb.sqlite,
  getDb: () => testDb.db,
}))

describe('SchemaService', () => {
  let projectId: string

  beforeEach(async () => {
    clearTestDb(testDb)

    // Create a project for each test so we have a valid project_id
    const { ProjectService } = await import(
      '../../src/main/services/project.service'
    )
    const project = await ProjectService.create({ name: 'Test Project' })
    projectId = project.id
  })

  describe('getByProject()', () => {
    it('should return a schema with its fields', async () => {
      const { SchemaService } = await import(
        '../../src/main/services/schema.service'
      )

      const schema = await SchemaService.getByProject(projectId)

      expect(schema).toBeDefined()
      expect(schema.projectId).toBe(projectId)
      expect(schema.fields).toEqual([])
      expect(schema.avroSource).toBeNull()
    })

    it('should return an empty fields array for a newly created schema', async () => {
      const { SchemaService } = await import(
        '../../src/main/services/schema.service'
      )

      const schema = await SchemaService.getByProject(projectId)

      expect(schema.fields).toBeInstanceOf(Array)
      expect(schema.fields).toHaveLength(0)
    })

    it('should throw when project does not exist', async () => {
      const { SchemaService } = await import(
        '../../src/main/services/schema.service'
      )

      await expect(
        SchemaService.getByProject('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow('Schema not found')
    })
  })

  describe('updateFieldRule()', () => {
    it('should save and return an updated field with a range rule', async () => {
      const { SchemaService } = await import(
        '../../src/main/services/schema.service'
      )

      // Import Avro to get fields
      const avroJson = JSON.stringify({
        type: 'record',
        name: 'TestRecord',
        fields: [{ name: 'age', type: 'int' }],
      })

      const schema = await SchemaService.importAvro(projectId, avroJson)
      const field = schema.fields[0]

      const updated = await SchemaService.updateFieldRule(field.id, {
        kind: 'range',
        min: 18,
        max: 99,
      })

      expect(updated.id).toBe(field.id)
      expect(updated.rule).toEqual({ kind: 'range', min: 18, max: 99 })
    })

    it('should save and return an updated field with an enum rule on a string field', async () => {
      const { SchemaService } = await import(
        '../../src/main/services/schema.service'
      )

      const avroJson = JSON.stringify({
        type: 'record',
        name: 'TestRecord',
        fields: [{ name: 'color', type: 'string' }],
      })

      const schema = await SchemaService.importAvro(projectId, avroJson)
      const field = schema.fields[0]

      const updated = await SchemaService.updateFieldRule(field.id, {
        kind: 'enum',
        values: ['red', 'green', 'blue'],
      })

      expect(updated.rule).toEqual({
        kind: 'enum',
        values: ['red', 'green', 'blue'],
      })
    })

    it('should clear the rule when setting rule to null', async () => {
      const { SchemaService } = await import(
        '../../src/main/services/schema.service'
      )

      const avroJson = JSON.stringify({
        type: 'record',
        name: 'TestRecord',
        fields: [{ name: 'age', type: 'int' }],
      })

      const schema = await SchemaService.importAvro(projectId, avroJson)
      const field = schema.fields[0]

      // Set a rule first
      await SchemaService.updateFieldRule(field.id, {
        kind: 'range',
        min: 1,
        max: 100,
      })

      // Then clear it
      const cleared = await SchemaService.updateFieldRule(field.id, null)
      expect(cleared.rule).toBeNull()
    })

    it('should accept a range rule on a string field', async () => {
      const { SchemaService } = await import(
        '../../src/main/services/schema.service'
      )

      const avroJson = JSON.stringify({
        type: 'record',
        name: 'TestRecord',
        fields: [{ name: 'name', type: 'string' }],
      })

      const schema = await SchemaService.importAvro(projectId, avroJson)
      const field = schema.fields[0]

      const updated = await SchemaService.updateFieldRule(field.id, {
        kind: 'range',
        min: 1,
        max: 10,
      })
      expect(updated.rule).toEqual({ kind: 'range', min: 1, max: 10 })
    })

    it('should reject an enum rule on a number field (actually allowed per validation)', async () => {
      const { SchemaService } = await import(
        '../../src/main/services/schema.service'
      )

      const avroJson = JSON.stringify({
        type: 'record',
        name: 'TestRecord',
        fields: [{ name: 'score', type: 'int' }],
      })

      const schema = await SchemaService.importAvro(projectId, avroJson)
      const field = schema.fields[0]

      // enum IS allowed for number types per validation
      const updated = await SchemaService.updateFieldRule(field.id, {
        kind: 'enum',
        values: [1, 2, 3],
      })
      expect(updated.rule).toEqual({ kind: 'enum', values: [1, 2, 3] })
    })

    it('should reject a format rule on a number field', async () => {
      const { SchemaService } = await import(
        '../../src/main/services/schema.service'
      )

      const avroJson = JSON.stringify({
        type: 'record',
        name: 'TestRecord',
        fields: [{ name: 'count', type: 'int' }],
      })

      const schema = await SchemaService.importAvro(projectId, avroJson)
      const field = schema.fields[0]

      await expect(
        SchemaService.updateFieldRule(field.id, {
          kind: 'format',
          subtype: 'uuid',
        }),
      ).rejects.toThrow('Rule kind "format" is not allowed for field type "number"')
    })

    it('should throw when updating a non-existent field', async () => {
      const { SchemaService } = await import(
        '../../src/main/services/schema.service'
      )

      await expect(
        SchemaService.updateFieldRule(
          '00000000-0000-0000-0000-000000000000',
          { kind: 'range', min: 0, max: 10 },
        ),
      ).rejects.toThrow('Field not found')
    })
  })

  describe('importAvro()', () => {
    it('should create fields from valid Avro JSON', async () => {
      const { SchemaService } = await import(
        '../../src/main/services/schema.service'
      )

      const avroJson = JSON.stringify({
        type: 'record',
        name: 'Person',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'age', type: 'int' },
          { name: 'active', type: 'boolean' },
        ],
      })

      const schema = await SchemaService.importAvro(projectId, avroJson)

      expect(schema.fields).toHaveLength(3)
      expect(schema.avroSource).toBe(avroJson)

      const names = schema.fields.map((f) => f.name).sort()
      expect(names).toEqual(['active', 'age', 'name'])

      const types = schema.fields.map((f) => f.type)
      expect(types).toContain('string')
      expect(types).toContain('number')
      expect(types).toContain('boolean')
    })

    it('should replace existing fields when importing a new Avro schema', async () => {
      const { SchemaService } = await import(
        '../../src/main/services/schema.service'
      )

      // First import
      const firstAvro = JSON.stringify({
        type: 'record',
        name: 'V1',
        fields: [{ name: 'oldField', type: 'string' }],
      })

      const schema1 = await SchemaService.importAvro(projectId, firstAvro)
      expect(schema1.fields).toHaveLength(1)
      expect(schema1.fields[0].name).toBe('oldField')

      // Second import replaces
      const secondAvro = JSON.stringify({
        type: 'record',
        name: 'V2',
        fields: [
          { name: 'newField', type: 'int' },
          { name: 'anotherField', type: 'boolean' },
        ],
      })

      const schema2 = await SchemaService.importAvro(projectId, secondAvro)

      expect(schema2.fields).toHaveLength(2)
      const names = schema2.fields.map((f) => f.name).sort()
      expect(names).toEqual(['anotherField', 'newField'])
    })

    it('should throw an error on invalid JSON', async () => {
      const { SchemaService } = await import(
        '../../src/main/services/schema.service'
      )

      await expect(
        SchemaService.importAvro(projectId, 'not valid json'),
      ).rejects.toThrow('Invalid JSON')
    })

    it('should throw an error on invalid Avro schema structure', async () => {
      const { SchemaService } = await import(
        '../../src/main/services/schema.service'
      )

      const invalidAvro = JSON.stringify({
        type: 'not_record',
        name: 'Bad',
        fields: [],
      })

      await expect(
        SchemaService.importAvro(projectId, invalidAvro),
      ).rejects.toThrow('Invalid Avro schema')
    })

    it('should throw when project does not have a schema', async () => {
      const { SchemaService } = await import(
        '../../src/main/services/schema.service'
      )

      await expect(
        SchemaService.importAvro('00000000-0000-0000-0000-000000000000', '{}'),
      ).rejects.toThrow('Schema not found')
    })
  })
})
