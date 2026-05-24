import { faker } from '@faker-js/faker'
import type { GenerationStrategy } from './types'
import type { Field } from '@shared/ipc.types'

export class RangeStrategy implements GenerationStrategy {
  generate(field: Field): unknown {
    if (field.rule?.kind !== 'range') {
      throw new Error('RangeStrategy requires a range rule on field "' + field.name + '"')
    }
    const { min, max } = field.rule
    const isFloat = !Number.isInteger(min) || !Number.isInteger(max)
    if (isFloat) {
      return faker.number.float({ min, max, multipleOf: 0.01 })
    }
    return faker.number.int({ min, max })
  }
}
