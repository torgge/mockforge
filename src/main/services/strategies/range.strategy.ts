import { faker } from '@faker-js/faker'
import type { GenerationStrategy } from './types'
import type { Field } from '@shared/ipc.types'

export class RangeStrategy implements GenerationStrategy {
  generate(field: Field): unknown {
    if (field.rule?.kind !== 'range') {
      throw new Error('RangeStrategy requires a range rule on field "' + field.name + '"')
    }
    return faker.number.int({ min: field.rule.min, max: field.rule.max })
  }
}
