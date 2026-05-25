import type { GenerationStrategy } from './types'
import type { Field } from '@shared/ipc.types'

export class SequentialStrategy implements GenerationStrategy {
  private counter = 0
  private startValue = 0

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
    this.counter = this.startValue
  }

  setStart(start: number): void {
    this.startValue = start
    this.counter = start
  }
}
