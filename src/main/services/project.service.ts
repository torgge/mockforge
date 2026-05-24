import { eq, like, desc } from 'drizzle-orm'
import { getDb, getSqlite } from '../db/client'
import { projects } from '../db/schema'
import { randomUUID } from 'crypto'
import type { Project, ProjectCreatePayload, ProjectUpdatePayload } from '@shared/ipc.types'

export const ProjectService = {
  async create(payload: ProjectCreatePayload): Promise<Project> {
    const db = getDb()
    const now = new Date().toISOString()
    const id = randomUUID()
    const schemaId = randomUUID()

    const sqlite = getSqlite()
    const insertProject = sqlite.prepare(
      'INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    )
    const insertSchema = sqlite.prepare(
      'INSERT INTO schemas (id, project_id, created_at, updated_at) VALUES (?, ?, ?, ?)',
    )

    sqlite.transaction(() => {
      insertProject.run(id, payload.name, payload.description ?? null, now, now)
      insertSchema.run(schemaId, id, now, now)
    })()

    return {
      id,
      name: payload.name,
      description: payload.description ?? null,
      createdAt: now,
      updatedAt: now,
    }
  },

  async list(): Promise<Project[]> {
    const db = getDb()
    const rows = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.created_at))

    return rows.map(mapRow)
  },

  async update(payload: ProjectUpdatePayload): Promise<Project> {
    const db = getDb()
    const now = new Date().toISOString()

    const existing = await db
      .select()
      .from(projects)
      .where(eq(projects.id, payload.id))
      .get()

    if (!existing) {
      throw new Error(`Project not found: ${payload.id}`)
    }

    await db
      .update(projects)
      .set({
        name: payload.name,
        description: payload.description ?? existing.description,
        updated_at: now,
      })
      .where(eq(projects.id, payload.id))

    return {
      ...mapRow(existing),
      name: payload.name,
      description: payload.description ?? existing.description,
      updatedAt: now,
    }
  },

  async delete(id: string): Promise<void> {
    const sqlite = getSqlite()

    const existing = sqlite.prepare('SELECT id FROM projects WHERE id = ?').get(id)
    if (!existing) {
      throw new Error(`Project not found: ${id}`)
    }

    sqlite.transaction(() => {
      // Delete fields via schema
      sqlite.prepare(
        `DELETE FROM fields WHERE schema_id IN (SELECT id FROM schemas WHERE project_id = ?)`,
      ).run(id)
      // Delete schema
      sqlite.prepare('DELETE FROM schemas WHERE project_id = ?').run(id)
      // Delete project
      sqlite.prepare('DELETE FROM projects WHERE id = ?').run(id)
    })()
  },

  async search(query: string): Promise<Project[]> {
    const db = getDb()
    const rows = await db
      .select()
      .from(projects)
      .where(like(projects.name, `%${query}%`))
      .orderBy(desc(projects.created_at))

    return rows.map(mapRow)
  },
}

function mapRow(row: typeof projects.$inferSelect): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
