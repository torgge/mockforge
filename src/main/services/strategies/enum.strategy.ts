import { faker } from '@faker-js/faker'
import type { GenerationStrategy } from './types'
import type { Field } from '@shared/ipc.types'

export class EnumStrategy implements GenerationStrategy {
  generate(field: Field): unknown {
    if (field.rule?.kind !== 'enum') {
      throw new Error('EnumStrategy requires an enum rule on field "' + field.name + '"')
    }
    return faker.helpers.arrayElement(field.rule.values)
  }
}
