import { faker } from '@faker-js/faker'
import type { Field } from '@shared/ipc.types'
import { getStrategy } from './strategies'

export function resolveFields(
  fields: Field[],
  parentFieldId: string | null = null,
): Record<string, unknown> {
  const currentFields = fields
    .filter((f) => f.parentFieldId === parentFieldId)
    .sort((a, b) => a.order - b.order)

  const obj: Record<string, unknown> = {}

  for (const field of currentFields) {
    const strategy = getStrategy(field)

    if (field.type === 'object') {
      obj[field.name] = resolveFields(fields, field.id)
    } else if (field.type === 'array') {
      const children = fields.filter((f) => f.parentFieldId === field.id)
      if (children.length === 0) {
        obj[field.name] = []
      } else {
        const count = faker.number.int({ min: 1, max: 5 })
        obj[field.name] = Array.from({ length: count }, () => resolveFields(fields, field.id))
      }
    } else {
      obj[field.name] = strategy.generate(field)
    }
  }

  return obj
}
