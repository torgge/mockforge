import { z } from 'zod'
import type { FieldType, FieldRule } from './ipc.types'

const FIELD_TYPES: readonly [FieldType, ...FieldType[]] = [
  'string',
  'number',
  'boolean',
  'object',
  'array',
  'null',
]

export const projectCreateSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().max(1000).optional(),
})

export const projectUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().max(1000).optional(),
})

export const projectDeleteSchema = z.object({
  id: z.string().uuid(),
})

export const projectSearchSchema = z.object({
  query: z.string(),
})

export const schemaGetByProjectSchema = z.object({
  projectId: z.string().uuid(),
})

export const schemaImportAvroSchema = z.object({
  projectId: z.string().uuid(),
  avroJson: z.string().min(1, 'Avro content is required'),
})

const rangeRuleBaseSchema = z.object({
  kind: z.literal('range'),
  min: z.number(),
  max: z.number(),
})

export const rangeRuleSchema = rangeRuleBaseSchema.refine(
  (data) => data.min <= data.max,
  { message: 'Min must be less than or equal to Max', path: ['max'] },
)

export const enumRuleSchema = z.object({
  kind: z.literal('enum'),
  values: z.array(z.unknown()).min(1, 'At least one value is required'),
})

export const formatRuleSchema = z.object({
  kind: z.literal('format'),
  subtype: z.enum(['uuid', 'date', 'datetime']),
})

export const fieldRuleSchema = z.discriminatedUnion('kind', [
  rangeRuleBaseSchema,
  enumRuleSchema,
  formatRuleSchema,
])

export const fieldUpdateRuleSchema = z.object({
  fieldId: z.string().uuid(),
  rule: fieldRuleSchema.nullable(),
})

export const generateRequestSchema = z.object({
  schemaId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10000),
})

export const exportToFileSchema = z.object({
  data: z.array(z.unknown()),
  suggestedName: z.string().min(1),
})

export const settingsGetSchema = z.object({
  key: z.string().min(1),
})

export const dialogOpenFileSchema = z.object({
  filters: z.array(z.object({
    name: z.string(),
    extensions: z.array(z.string()),
  })),
})

export const settingsSetSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
})

export function validateRuleForFieldType(
  rule: FieldRule,
  fieldType: FieldType,
): boolean {
  switch (rule.kind) {
    case 'range':
      return fieldType === 'number'
    case 'enum':
      return fieldType === 'string' || fieldType === 'number' || fieldType === 'boolean'
    case 'format':
      return fieldType === 'string'
    default:
      return false
  }
}
