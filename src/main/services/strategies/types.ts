import type { Field } from '@shared/ipc.types'

export interface GenerationStrategy {
  generate(field: Field): unknown
}
