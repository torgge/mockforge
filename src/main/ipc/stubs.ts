import type {
  Project,
  SchemaWithFields,
  Field,
  FieldType,
  FieldRule,
  ExportToFileResult,
} from '@shared/ipc.types'

// ── In-memory mock data stores ──

let projects: Project[] = [
  {
    id: 'proj-001',
    name: 'User Service',
    description: 'Mock data for the user service API',
    createdAt: '2026-05-20T10:00:00.000Z',
    updatedAt: '2026-05-20T10:00:00.000Z',
  },
  {
    id: 'proj-002',
    name: 'Order System',
    description: 'E-commerce order mock data',
    createdAt: '2026-05-19T14:30:00.000Z',
    updatedAt: '2026-05-19T14:30:00.000Z',
  },
  {
    id: 'proj-003',
    name: 'Analytics Events',
    description: null,
    createdAt: '2026-05-18T09:15:00.000Z',
    updatedAt: '2026-05-18T09:15:00.000Z',
  },
]

function makeFields(schemaId: string): Field[] {
  return [
    {
      id: 'field-001',
      schemaId,
      parentFieldId: null,
      name: 'id',
      type: 'string' as FieldType,
      rule: { kind: 'format' as const, subtype: 'uuid' as const },
      order: 0,
    },
    {
      id: 'field-002',
      schemaId,
      parentFieldId: null,
      name: 'name',
      type: 'string' as FieldType,
      rule: null,
      order: 1,
    },
    {
      id: 'field-003',
      schemaId,
      parentFieldId: null,
      name: 'email',
      type: 'string' as FieldType,
      rule: null,  // default string generation
      order: 2,
    },
    {
      id: 'field-004',
      schemaId,
      parentFieldId: null,
      name: 'age',
      type: 'number' as FieldType,
      rule: { kind: 'range' as const, min: 18, max: 99 },
      order: 3,
    },
    {
      id: 'field-005',
      schemaId,
      parentFieldId: null,
      name: 'isActive',
      type: 'boolean' as FieldType,
      rule: null,
      order: 4,
    },
    {
      id: 'field-006',
      schemaId,
      parentFieldId: null,
      name: 'address',
      type: 'object' as FieldType,
      rule: null,
      order: 5,
    },
    {
      id: 'field-007',
      schemaId,
      parentFieldId: 'field-006',
      name: 'street',
      type: 'string' as FieldType,
      rule: null,
      order: 0,
    },
    {
      id: 'field-008',
      schemaId,
      parentFieldId: 'field-006',
      name: 'city',
      type: 'string' as FieldType,
      rule: { kind: 'enum' as const, values: ['New York', 'London', 'Tokyo', 'Berlin'] },
      order: 1,
    },
    {
      id: 'field-009',
      schemaId,
      parentFieldId: 'field-006',
      name: 'zipCode',
      type: 'string' as FieldType,
      rule: null,
      order: 2,
    },
    {
      id: 'field-010',
      schemaId,
      parentFieldId: null,
      name: 'tags',
      type: 'array' as FieldType,
      rule: null,
      order: 6,
    },
    {
      id: 'field-011',
      schemaId,
      parentFieldId: 'field-010',
      name: 'item',
      type: 'string' as FieldType,
      rule: { kind: 'enum' as const, values: ['premium', 'enterprise', 'beta', 'stable'] },
      order: 0,
    },
  ]
}

const schemaId = 'schema-001'
let schemaWithFields: SchemaWithFields = {
  id: schemaId,
  projectId: 'proj-001',
  avroSource: null,
  createdAt: '2026-05-20T10:00:00.000Z',
  updatedAt: '2026-05-20T10:00:00.000Z',
  fields: makeFields(schemaId),
}

const mockSettings: Record<string, string> = {
  max_generation_limit: '1000',
}

// ── Generate realistic mock data ──

function generateMockData(fields: Field[], quantity: number): unknown[] {
  const result: unknown[] = []
  for (let i = 0; i < quantity; i++) {
    result.push(generateObject(fields))
  }
  return result
}

function generateObject(allFields: Field[], parentId: string | null = null): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  const currentFields = allFields
    .filter((f) => f.parentFieldId === parentId)
    .sort((a, b) => a.order - b.order)

  for (const field of currentFields) {
    obj[field.name] = generateValue(field, allFields)
  }
  return obj
}

function generateValue(field: Field, allFields: Field[]): unknown {
  // Apply rule if present
  if (field.rule) {
    return generateFromRule(field.rule)
  }

  // Default generation by type
  switch (field.type) {
    case 'string':
      return `mock_${field.name}_${Math.random().toString(36).slice(2, 8)}`
    case 'number':
      return Math.floor(Math.random() * 1000)
    case 'boolean':
      return Math.random() > 0.5
    case 'object':
      return generateObject(allFields, field.id)
    case 'array': {
      const count = Math.floor(Math.random() * 5) + 1
      const children = allFields.filter((f) => f.parentFieldId === field.id)
      return Array.from({ length: count }, () => {
        if (children.length > 0) {
          // Each child is the array element schema
          return generateValue(children[0], allFields)
        }
        return `item_${Math.random().toString(36).slice(2, 6)}`
      })
    }
    case 'null':
      return null
  }
}

function generateFromRule(rule: FieldRule): unknown {
  switch (rule.kind) {
    case 'range':
      return Math.floor(Math.random() * (rule.max - rule.min + 1)) + rule.min
    case 'enum':
      return rule.values[Math.floor(Math.random() * rule.values.length)]
    case 'format':
      switch (rule.subtype) {
        case 'uuid':
          return crypto.randomUUID()
        case 'date':
          return new Date().toISOString().split('T')[0]
        case 'datetime':
          return new Date().toISOString()
      }
  }
}

// ── Stub API implementations ──

export const stubs = {
  project: {
    async create(payload: { name: string; description?: string }): Promise<Project> {
      const now = new Date().toISOString()
      const project: Project = {
        id: `proj-${Date.now()}`,
        name: payload.name,
        description: payload.description ?? null,
        createdAt: now,
        updatedAt: now,
      }
      projects = [project, ...projects]
      return project
    },

    async list(): Promise<Project[]> {
      return [...projects]
    },

    async update(payload: { id: string; name: string; description?: string }): Promise<Project> {
      const idx = projects.findIndex((p) => p.id === payload.id)
      if (idx === -1) throw new Error(`Project not found: ${payload.id}`)
      const updated: Project = {
        ...projects[idx],
        name: payload.name,
        description: payload.description ?? projects[idx].description,
        updatedAt: new Date().toISOString(),
      }
      projects[idx] = updated
      return updated
    },

    async delete(payload: { id: string }): Promise<void> {
      const idx = projects.findIndex((p) => p.id === payload.id)
      if (idx === -1) throw new Error(`Project not found: ${payload.id}`)
      projects.splice(idx, 1)
    },

    async search(payload: { query: string }): Promise<Project[]> {
      const q = payload.query.toLowerCase()
      return projects.filter((p) => p.name.toLowerCase().includes(q))
    },
  },

  schema: {
    async getByProject(_payload: { projectId: string }): Promise<SchemaWithFields> {
      return { ...schemaWithFields, fields: [...schemaWithFields.fields] }
    },

    async importAvro(payload: {
      projectId: string
      avroJson: string
    }): Promise<SchemaWithFields> {
      const updated: SchemaWithFields = {
        ...schemaWithFields,
        projectId: payload.projectId,
        avroSource: payload.avroJson,
        updatedAt: new Date().toISOString(),
        fields: makeFields(schemaWithFields.id),
      }
      schemaWithFields = updated
      return { ...updated, fields: [...updated.fields] }
    },
  },

  field: {
    async updateRule(payload: { fieldId: string; rule: FieldRule | null }): Promise<Field> {
      const idx = schemaWithFields.fields.findIndex((f) => f.id === payload.fieldId)
      if (idx === -1) throw new Error(`Field not found: ${payload.fieldId}`)
      const updated: Field = { ...schemaWithFields.fields[idx], rule: payload.rule }
      schemaWithFields.fields[idx] = updated
      return updated
    },
  },

  generator: {
    async run(payload: { schemaId: string; quantity: number }): Promise<unknown[]> {
      return generateMockData(schemaWithFields.fields, payload.quantity)
    },
  },

  export: {
    async toFile(_payload: {
      data: unknown[]
      suggestedName: string
    }): Promise<ExportToFileResult> {
      return { filePath: `/mock/path/${_payload.suggestedName}` }
    },
  },

  settings: {
    async get(payload: { key: string }): Promise<string | null> {
      return mockSettings[payload.key] ?? null
    },

    async set(payload: { key: string; value: string }): Promise<void> {
      mockSettings[payload.key] = payload.value
    },
  },
}
