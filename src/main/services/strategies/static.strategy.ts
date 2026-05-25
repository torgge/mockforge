import type { GenerationStrategy } from './types'
import type { Field } from '@shared/ipc.types'

export class StaticStrategy implements GenerationStrategy {
  generate(field: Field): unknown {
    if (field.rule?.kind !== 'static') {
      throw new Error('StaticStrategy requires a static rule on field "' + field.name + '"')
    }
    return field.rule.value
  }
}
