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
      const count = faker.number.int({ min: 1, max: 5 })
      const children = fields.filter((f) => f.parentFieldId === field.id)
      obj[field.name] = Array.from({ length: count }, () => {
        if (children.length > 0) {
          return resolveFields(fields, field.id)
        }
        return strategy.generate(field)
      })
    } else {
      obj[field.name] = strategy.generate(field)
    }
  }

  return obj
}
