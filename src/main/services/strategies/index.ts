import type { Field } from '@shared/ipc.types'
import type { GenerationStrategy } from './types'
import { RangeStrategy } from './range.strategy'
import { EnumStrategy } from './enum.strategy'
import { FormatStrategy } from './format.strategy'
import { StaticStrategy } from './static.strategy'
import { SequentialStrategy } from './sequential.strategy'
import { DefaultStrategy } from './default.strategy'

const sequentialStrategy = new SequentialStrategy()

const strategyMap: Record<string, GenerationStrategy> = {
  range: new RangeStrategy(),
  enum: new EnumStrategy(),
  format: new FormatStrategy(),
  static: new StaticStrategy(),
  sequential: sequentialStrategy,
}

const defaultStrategy = new DefaultStrategy()

export function getStrategy(field: Field): GenerationStrategy {
  if (field.rule && field.rule.kind in strategyMap) {
    return strategyMap[field.rule.kind]
  }
  return defaultStrategy
}

/**
 * Resets all stateful strategies before a generation run.
 * Currently only SequentialStrategy is stateful.
 */
export function resetStrategies(): void {
  sequentialStrategy.reset()
}

/**
 * Configures the sequential strategy's start value from the field rules.
 */
export function configureSequentialStart(fields: Field[]): void {
  for (const field of fields) {
    if (field.rule?.kind === 'sequential') {
      sequentialStrategy.setStart(field.rule.start)
      break // only one sequential field per schema is expected
    }
  }
}
