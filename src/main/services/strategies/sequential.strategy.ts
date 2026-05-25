import type { GenerationStrategy } from './types'
import type { Field } from '@shared/ipc.types'

export class SequentialStrategy implements GenerationStrategy {
  private counter = 0

  generate(field: Field): unknown {
    if (field.rule?.kind !== 'sequential') {
      throw new Error('SequentialStrategy requires a sequential rule on field "' + field.name + '"')
    }
    const value = this.counter++
    if (field.type === 'string') {
      return String(value)
    }
    return value
  }

  reset(): void {
    // Reset to the start value for the next generation run.
    // The actual start value is applied by the generator service.
    this.counter = 0
  }

  setStart(start: number): void {
    this.counter = start
  }
}
