import { eq } from 'drizzle-orm'
import { getDb, getSqlite } from '../db/client'
import { schemas } from '../db/schema'
import { AvroParser } from './avro-parser'
import type { SchemaWithFields, Field, FieldRule } from '@shared/ipc.types'
import { validateRuleForFieldType } from '@shared/validation'

export const SchemaService = {
  async getByProject(projectId: string): Promise<SchemaWithFields> {
    const db = getDb()

    const schema = await db
      .select()
      .from(schemas)
      .where(eq(schemas.project_id, projectId))
      .get()

    if (!schema) {
      throw new Error(`Schema not found for project: ${projectId}`)
    }

    const fields = await loadFields(schema.id)

    return {
      id: schema.id,
      projectId: schema.project_id,
      avroSource: schema.avro_source,
      createdAt: schema.created_at,
      updatedAt: schema.updated_at,
      fields,
    }
  },

  async importAvro(projectId: string, avroJson: string): Promise<SchemaWithFields> {
    const db = getDb()
    const sqlite = getSqlite()

    const schema = await db
      .select()
      .from(schemas)
      .where(eq(schemas.project_id, projectId))
      .get()

    if (!schema) {
      throw new Error(`Schema not found for project: ${projectId}`)
    }

    // Parse the Avro schema (throws on invalid input)
    const flatFields = AvroParser.parse(avroJson)
    const now = new Date().toISOString()

    sqlite.transaction(() => {
      // Delete existing fields
      sqlite.prepare('DELETE FROM fields WHERE schema_id = ?').run(schema.id)

      // Insert new fields
      const insertField = sqlite.prepare(
        'INSERT INTO fields (id, schema_id, parent_field_id, name, type, rule, "order") VALUES (?, ?, ?, ?, ?, ?, ?)',
      )

      for (const f of flatFields) {
        insertField.run(
          f.id,
          schema.id,
          f.parentFieldId,
          f.name,
          f.type,
          f.rule,
          f.order,
        )
      }

      // Update avro_source and timestamp
      sqlite
        .prepare('UPDATE schemas SET avro_source = ?, updated_at = ? WHERE id = ?')
        .run(avroJson, now, schema.id)
    })()

    // Re-fetch to return the updated schema
    return SchemaService.getByProject(projectId)
  },

  async updateFieldRule(
    fieldId: string,
    rule: FieldRule | null,
  ): Promise<Field> {
    const sqlite = getSqlite()

    const row = sqlite
      .prepare('SELECT * FROM fields WHERE id = ?')
      .get(fieldId) as Record<string, unknown> | undefined

    if (!row) {
      throw new Error(`Field not found: ${fieldId}`)
    }

    const fieldType = row.type as string

    // Validate rule against field type
    if (rule !== null) {
      if (!validateRuleForFieldType(rule, fieldType as Field['type'])) {
        throw new Error(
          `Rule kind "${rule.kind}" is not allowed for field type "${fieldType}"`,
        )
      }
    }

    const ruleJson = rule ? JSON.stringify(rule) : null

    sqlite
      .prepare('UPDATE fields SET rule = ? WHERE id = ?')
      .run(ruleJson, fieldId)

    return {
      id: row.id as string,
      schemaId: row.schema_id as string,
      parentFieldId: (row.parent_field_id as string) || null,
      name: row.name as string,
      type: fieldType as Field['type'],
      rule,
      order: row.order as number,
    }
  },
}

// ── Helpers ──

function loadFields(schemaId: string): Field[] {
  const sqlite = getSqlite()
  const rows = sqlite
    .prepare(
      'SELECT * FROM fields WHERE schema_id = ? ORDER BY parent_field_id NULLS FIRST, "order"',
    )
    .all(schemaId) as Array<Record<string, unknown>>

  return rows.map((row) => ({
    id: row.id as string,
    schemaId: row.schema_id as string,
    parentFieldId: (row.parent_field_id as string) || null,
    name: row.name as string,
    type: row.type as Field['type'],
    rule: row.rule ? (JSON.parse(row.rule as string) as FieldRule) : null,
    order: row.order as number,
  }))
}
