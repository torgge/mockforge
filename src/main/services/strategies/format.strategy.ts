import { faker } from '@faker-js/faker'
import { randomUUID } from 'crypto'
import type { GenerationStrategy } from './types'
import type { Field } from '@shared/ipc.types'

export class FormatStrategy implements GenerationStrategy {
  generate(field: Field): unknown {
    if (field.rule?.kind !== 'format') {
      throw new Error('FormatStrategy requires a format rule on field "' + field.name + '"')
    }

    switch (field.rule.subtype) {
      case 'uuid':
        return randomUUID()
      case 'date':
        return faker.date.recent().toISOString().split('T')[0]
      case 'datetime':
        return faker.date.recent().toISOString()
    }
  }
}
