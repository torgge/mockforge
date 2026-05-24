import { randomUUID } from 'crypto'
import type { Field, FieldType } from '@shared/ipc.types'

interface FlatField {
  id: string
  parentFieldId: string | null
  name: string
  type: FieldType
  rule: string | null
  order: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AvroSchema = any

export class AvroParser {
  /**
   * Parse an Avro JSON schema string and return a flat array of field definitions.
   * Throws on invalid Avro schemas.
   */
  static parse(avroJson: string): FlatField[] {
    let parsed: AvroSchema

    try {
      parsed = JSON.parse(avroJson)
    } catch {
      throw new Error('Invalid JSON: could not parse Avro schema')
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid Avro schema: not a valid JSON object')
    }

    if (parsed.type !== 'record') {
      throw new Error(
        `Invalid Avro schema: expected top-level type "record", got "${parsed.type}"`,
      )
    }

    if (!Array.isArray(parsed.fields)) {
      throw new Error('Invalid Avro schema: missing or invalid "fields" array')
    }

    const result: FlatField[] = []

    for (const field of parsed.fields) {
      this.walkField(field.name, field.type, null, result, 0)
    }

    // Reassign order values sequentially within each parent scope
    this.reassignOrders(result)

    return result
  }

  private static walkField(
    name: string,
    avroType: AvroSchema,
    parentFieldId: string | null,
    result: FlatField[],
    depth: number,
  ): string {
    const id = randomUUID()

    // Resolve the actual type
    const resolved = this.resolveType(avroType)

    if (resolved.kind === 'array') {
      // Array field: insert the array field, then walk its items as children
      const entry: FlatField = {
        id,
        parentFieldId,
        name,
        type: 'array',
        rule: null,
        order: result.length,
      }
      result.push(entry)

      if (resolved.items) {
        const itemName = typeof resolved.items === 'string' ? `${name}_item` : 'item'
        // Walk the item type as a child of this array
        this.walkField(itemName, resolved.items, id, result, depth + 1)
      }

      return id
    }

    if (resolved.kind === 'object') {
      // Object field: insert the object entry, then walk all its child fields
      const entry: FlatField = {
        id,
        parentFieldId,
        name,
        type: 'object',
        rule: null,
        order: result.length,
      }
      result.push(entry)

      if (Array.isArray(resolved.fields)) {
        for (const childField of resolved.fields) {
          this.walkField(childField.name, childField.type, id, result, depth + 1)
        }
      }

      return id
    }

    // Primitive type
    const enumRule =
      resolved.enumValues && resolved.enumValues.length > 0
        ? JSON.stringify({ kind: 'enum', values: resolved.enumValues })
        : null
    const entry: FlatField = {
      id,
      parentFieldId,
      name,
      type: resolved.kind as FieldType,
      rule: enumRule,
      order: result.length,
    }
    result.push(entry)
    return id
  }

  private static resolveType(avroType: AvroSchema): ResolvedType {
    // Simple string type: "string", "int", etc.
    if (typeof avroType === 'string') {
      return { kind: this.mapAvroPrimitive(avroType) }
    }

    // Union array: ["null", "string"] — check arrays before objects
    if (Array.isArray(avroType)) {
      return this.resolveUnion(avroType)
    }

    // Complex types
    if (typeof avroType === 'object' && avroType !== null) {
      if (avroType.type === 'array') {
        return { kind: 'array', items: avroType.items ?? null }
      }

      if (avroType.type === 'record') {
        return { kind: 'object', fields: avroType.fields ?? [] }
      }

      if (avroType.type === 'enum') {
        return { kind: 'string', enumValues: Array.isArray(avroType.symbols) ? avroType.symbols : [] }
      }

      if (avroType.type === 'map') {
        return { kind: 'object' }
      }

      if (avroType.type === 'fixed') {
        return { kind: 'string' }
      }
    }

    throw new Error(`Unsupported Avro type: ${JSON.stringify(avroType)}`)
  }

  private static resolveUnion(types: AvroSchema[]): ResolvedType {
    const nonNull = types.filter((t) => {
      if (typeof t === 'string') return t !== 'null'
      if (typeof t === 'object' && t !== null) {
        if (Array.isArray(t)) return false
        return t.type !== 'null'
      }
      return false
    })

    if (nonNull.length === 0) {
      return { kind: 'null' }
    }

    // Pick the first non-null type that is not a complex type (record/array)
    const simple = nonNull.find((t) => {
      if (typeof t === 'string') return true
      if (typeof t === 'object' && t !== null && !Array.isArray(t)) {
        return t.type !== 'record' && t.type !== 'array'
      }
      return false
    })

    if (simple) {
      return this.resolveType(simple)
    }

    // If no simple type found, resolve the first non-null type
    // (e.g., for [null, {type: "record", ...}])
    return this.resolveType(nonNull[0])
  }

  private static mapAvroPrimitive(avroType: string): FieldType {
    switch (avroType) {
      case 'string':
      case 'bytes':
        return 'string'
      case 'int':
      case 'long':
      case 'float':
      case 'double':
        return 'number'
      case 'boolean':
        return 'boolean'
      case 'null':
        return 'null'
      default:
        throw new Error(`Unsupported Avro primitive type: ${avroType}`)
    }
  }

  /**
   * Reassign order values sequentially within each parent scope.
   * This ensures stable ordering after recursive insertion.
   */
  private static reassignOrders(fields: FlatField[]): void {
    const byParent = new Map<string | null, FlatField[]>()
    for (const f of fields) {
      const key = f.parentFieldId
      if (!byParent.has(key)) {
        byParent.set(key, [])
      }
      byParent.get(key)!.push(f)
    }
    for (const [, children] of byParent) {
      children.forEach((f, i) => {
        f.order = i
      })
    }
  }
}

interface ResolvedType {
  kind: FieldType | 'array' | 'object'
  items?: AvroSchema
  fields?: Array<{ name: string; type: AvroSchema }>
  enumValues?: string[]
}
