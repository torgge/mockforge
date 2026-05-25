import { getSqlite } from '../db/client'
import type { Field, GenerateRequest, FieldRule } from '@shared/ipc.types'
import { resolveFields } from './nested-resolver'
import { resetStrategies, configureSequentialStart } from './strategies'

export const GeneratorService = {
  async run(request: GenerateRequest): Promise<unknown[]> {
    if (request.quantity < 1) {
      throw new Error('Quantity must be at least 1')
    }

    const sqlite = getSqlite()

    const settingsRow = sqlite
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get('max_generation_limit') as { value: string } | undefined

    const maxLimit = settingsRow ? parseInt(settingsRow.value, 10) : 1000

    if (request.quantity > maxLimit) {
      throw new Error('Quantity must not exceed ' + maxLimit)
    }

    const fieldRows = sqlite
      .prepare('SELECT * FROM fields WHERE schema_id = ? ORDER BY parent_field_id NULLS FIRST, "order"')
      .all(request.schemaId) as Array<Record<string, unknown>>

    if (fieldRows.length === 0) {
      throw new Error('No fields found for this schema. Import an Avro schema first.')
    }

    const fields: Field[] = fieldRows.map((row) => ({
      id: row.id as string,
      schemaId: row.schema_id as string,
      parentFieldId: (row.parent_field_id as string) || null,
      name: row.name as string,
      type: row.type as Field['type'],
      rule: row.rule ? (JSON.parse(row.rule as string) as FieldRule) : null,
      order: row.order as number,
    }))

    const results: unknown[] = []
    // Reset stateful strategies (sequential) and apply start values
    configureSequentialStart(fields)
    resetStrategies()
    // Yield to event loop every 100 records to prevent UI freeze
    const BATCH_SIZE = 100
    for (let i = 0; i < request.quantity; i++) {
      results.push(resolveFields(fields))
      if (i % BATCH_SIZE === BATCH_SIZE - 1) {
        await new Promise((resolve) => setImmediate(resolve))
      }
    }

    return results
  },
}
