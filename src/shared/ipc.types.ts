// ── Core domain types ──

export interface Project {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface Schema {
  id: string
  projectId: string
  avroSource: string | null
  createdAt: string
  updatedAt: string
}

export type FieldType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null'

export type FieldRule =
  | { kind: 'range'; min: number; max: number }
  | { kind: 'enum'; values: unknown[] }
  | { kind: 'format'; subtype: 'uuid' | 'date' | 'datetime' }

export interface Field {
  id: string
  schemaId: string
  parentFieldId: string | null
  name: string
  type: FieldType
  rule: FieldRule | null
  order: number
}

export interface GenerateRequest {
  schemaId: string
  quantity: number
}

// ── Schema with nested fields ──

export interface SchemaWithFields extends Schema {
  fields: Field[]
}

// ── IPC payload types ──

export interface ProjectCreatePayload {
  name: string
  description?: string
}

export interface ProjectUpdatePayload {
  id: string
  name: string
  description?: string
}

export interface ProjectDeletePayload {
  id: string
}

export interface ProjectSearchPayload {
  query: string
}

export interface SchemaGetByProjectPayload {
  projectId: string
}

export interface SchemaImportAvroPayload {
  projectId: string
  avroJson: string
}

export interface FieldUpdateRulePayload {
  fieldId: string
  rule: FieldRule | null
}

export interface DialogOpenFilePayload {
  filters: { name: string; extensions: string[] }[]
}

export interface DialogOpenFileResult {
  canceled: boolean
  content: string
  filePath: string
}

export interface ExportToFilePayload {
  data: unknown[]
  suggestedName: string
}

export interface ExportToFileResult {
  filePath: string
}

export interface SettingsGetPayload {
  key: string
}

export interface SettingsSetPayload {
  key: string
  value: string
}

// ── IPC API surface (mirrors contextBridge) ──

export interface MockForgeAPI {
  project: {
    create: (payload: ProjectCreatePayload) => Promise<Project>
    list: () => Promise<Project[]>
    update: (payload: ProjectUpdatePayload) => Promise<Project>
    delete: (payload: ProjectDeletePayload) => Promise<void>
    search: (payload: ProjectSearchPayload) => Promise<Project[]>
  }
  schema: {
    getByProject: (payload: SchemaGetByProjectPayload) => Promise<SchemaWithFields>
    importAvro: (payload: SchemaImportAvroPayload) => Promise<SchemaWithFields>
  }
  field: {
    updateRule: (payload: FieldUpdateRulePayload) => Promise<Field>
  }
  generator: {
    run: (payload: GenerateRequest) => Promise<unknown[]>
  }
  dialog: {
    openFile: (payload: DialogOpenFilePayload) => Promise<DialogOpenFileResult | null>
  }
  export: {
    toFile: (payload: ExportToFilePayload) => Promise<ExportToFileResult | null>
  }
  settings: {
    get: (payload: SettingsGetPayload) => Promise<string | null>
    set: (payload: SettingsSetPayload) => Promise<void>
  }
}
