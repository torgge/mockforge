import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestDb, clearTestDb, type TestDb } from './test-db'
import type { ProjectCreatePayload, ProjectUpdatePayload } from '@shared/ipc.types'

const testDb: TestDb = createTestDb()

vi.doMock('../../src/main/db/client', () => ({
  getSqlite: () => testDb.sqlite,
  getDb: () => testDb.db,
}))

describe('ProjectService', () => {
  beforeEach(() => {
    clearTestDb(testDb)
  })

  describe('create()', () => {
    it('should create a project with an empty schema', async () => {
      const { ProjectService } = await import(
        '../../src/main/services/project.service'
      )

      const payload: ProjectCreatePayload = {
        name: 'My Test Project',
        description: 'A test project description',
      }

      const project = await ProjectService.create(payload)

      expect(project).toBeDefined()
      expect(project.id).toBeDefined()
      expect(project.name).toBe('My Test Project')
      expect(project.description).toBe('A test project description')
      expect(project.createdAt).toBeDefined()
      expect(project.updatedAt).toBeDefined()

      // Verify project exists via list
      const all = await ProjectService.list()
      expect(all).toHaveLength(1)
      expect(all[0].id).toBe(project.id)
    })

    it('should create a project with null description when not provided', async () => {
      const { ProjectService } = await import(
        '../../src/main/services/project.service'
      )

      const payload: ProjectCreatePayload = {
        name: 'Minimal Project',
      }

      const project = await ProjectService.create(payload)

      expect(project.description).toBeNull()
    })

    it('should generate unique IDs for different projects', async () => {
      const { ProjectService } = await import(
        '../../src/main/services/project.service'
      )

      const project1 = await ProjectService.create({ name: 'Project 1' })
      const project2 = await ProjectService.create({ name: 'Project 2' })
      const project3 = await ProjectService.create({ name: 'Project 3' })

      const ids = [project1.id, project2.id, project3.id]
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(3)
    })
  })

  describe('list()', () => {
    it('should return projects sorted by created_at descending', async () => {
      const { ProjectService } = await import(
        '../../src/main/services/project.service'
      )

      const p1 = await ProjectService.create({ name: 'Alpha' })
      // Small delay to ensure different timestamps
      await new Promise((r) => setTimeout(r, 10))
      const p2 = await ProjectService.create({ name: 'Beta' })
      await new Promise((r) => setTimeout(r, 10))
      const p3 = await ProjectService.create({ name: 'Gamma' })

      const all = await ProjectService.list()

      expect(all).toHaveLength(3)
      // Most recent first (Gamma, Beta, Alpha)
      expect(all[0].id).toBe(p3.id)
      expect(all[1].id).toBe(p2.id)
      expect(all[2].id).toBe(p1.id)
    })

    it('should return an empty array when no projects exist', async () => {
      const { ProjectService } = await import(
        '../../src/main/services/project.service'
      )

      const all = await ProjectService.list()
      expect(all).toEqual([])
    })
  })

  describe('update()', () => {
    it('should change the name and description of a project', async () => {
      const { ProjectService } = await import(
        '../../src/main/services/project.service'
      )

      const created = await ProjectService.create({
        name: 'Original Name',
        description: 'Original description',
      })

      const updated = await ProjectService.update({
        id: created.id,
        name: 'Updated Name',
        description: 'Updated description',
      })

      expect(updated.name).toBe('Updated Name')
      expect(updated.description).toBe('Updated description')
      expect(updated.id).toBe(created.id)

      // Verify persistence via list
      const all = await ProjectService.list()
      expect(all).toHaveLength(1)
      expect(all[0].name).toBe('Updated Name')
    })

    it('should keep the existing description when not provided in update', async () => {
      const { ProjectService } = await import(
        '../../src/main/services/project.service'
      )

      const created = await ProjectService.create({
        name: 'Original Name',
        description: 'Persistent description',
      })

      const updated = await ProjectService.update({
        id: created.id,
        name: 'Updated Name',
      })

      expect(updated.description).toBe('Persistent description')
      expect(updated.name).toBe('Updated Name')
    })

    it('should throw an error when updating a non-existent project', async () => {
      const { ProjectService } = await import(
        '../../src/main/services/project.service'
      )

      const payload: ProjectUpdatePayload = {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Ghost',
      }

      await expect(ProjectService.update(payload)).rejects.toThrow(
        'Project not found',
      )
    })
  })

  describe('delete()', () => {
    it('should remove a project, its schema, and its fields', async () => {
      const { ProjectService } = await import(
        '../../src/main/services/project.service'
      )
      const { SchemaService } = await import(
        '../../src/main/services/schema.service'
      )

      // Create a project and import an Avro schema with fields
      const project = await ProjectService.create({
        name: 'To Delete',
      })

      const avroJson = JSON.stringify({
        type: 'record',
        name: 'TestRecord',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'age', type: 'int' },
        ],
      })

      await SchemaService.importAvro(project.id, avroJson)

      // Verify schema and fields exist before delete
      const schemaBefore = await SchemaService.getByProject(project.id)
      expect(schemaBefore.fields).toHaveLength(2)

      // Delete the project
      await ProjectService.delete(project.id)

      // Verify project is gone
      const all = await ProjectService.list()
      expect(all).toHaveLength(0)

      // Verify schema is gone
      await expect(SchemaService.getByProject(project.id)).rejects.toThrow(
        'Schema not found',
      )

      // Verify fields table is empty for this project
      const fieldRows = testDb.sqlite
        .prepare(
          `SELECT f.* FROM fields f
           JOIN schemas s ON f.schema_id = s.id
           WHERE s.project_id = ?`,
        )
        .all(project.id)
      expect(fieldRows).toHaveLength(0)
    })

    it('should throw an error when deleting a non-existent project', async () => {
      const { ProjectService } = await import(
        '../../src/main/services/project.service'
      )

      await expect(
        ProjectService.delete('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow('Project not found')
    })
  })

  describe('search()', () => {
    it('should find projects by name substring', async () => {
      const { ProjectService } = await import(
        '../../src/main/services/project.service'
      )

      await ProjectService.create({ name: 'User API Service' })
      await ProjectService.create({ name: 'Admin Dashboard' })
      await ProjectService.create({ name: 'User Profile Module' })

      const results = await ProjectService.search('User')

      expect(results).toHaveLength(2)
      const names = results.map((p) => p.name).sort()
      expect(names).toEqual(['User API Service', 'User Profile Module'])
    })

    it('should return an empty array when no projects match the query', async () => {
      const { ProjectService } = await import(
        '../../src/main/services/project.service'
      )

      await ProjectService.create({ name: 'Alpha' })
      await ProjectService.create({ name: 'Beta' })

      const results = await ProjectService.search('Zeta')
      expect(results).toEqual([])
    })
  })
})
