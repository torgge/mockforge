import type { Field } from '@shared/ipc.types'
import type { GenerationStrategy } from './types'
import { RangeStrategy } from './range.strategy'
import { EnumStrategy } from './enum.strategy'
import { FormatStrategy } from './format.strategy'
import { StaticStrategy } from './static.strategy'
import { DefaultStrategy } from './default.strategy'

const strategyMap: Record<string, GenerationStrategy> = {
  range: new RangeStrategy(),
  enum: new EnumStrategy(),
  format: new FormatStrategy(),
  static: new StaticStrategy(),
}

const defaultStrategy = new DefaultStrategy()

export function getStrategy(field: Field): GenerationStrategy {
  if (field.rule && field.rule.kind in strategyMap) {
    return strategyMap[field.rule.kind]
  }
  return defaultStrategy
}
