import { describe, it, expect, beforeEach } from "vitest"
import { RangeStrategy } from "../../src/main/services/strategies/range.strategy"
import { EnumStrategy } from "../../src/main/services/strategies/enum.strategy"
import { FormatStrategy } from "../../src/main/services/strategies/format.strategy"
import { StaticStrategy } from "../../src/main/services/strategies/static.strategy"
import { SequentialStrategy } from "../../src/main/services/strategies/sequential.strategy"
import { DefaultStrategy } from "../../src/main/services/strategies/default.strategy"
import { getStrategy } from "../../src/main/services/strategies"
import type { Field } from "@shared/ipc.types"

function makeField(overrides: Partial<Field>): Field {
  return {
    id: "test-id",
    schemaId: "test-schema",
    parentFieldId: null,
    name: "testField",
    type: "string",
    rule: null,
    order: 0,
    ...overrides,
  }
}

describe("RangeStrategy", () => {
  it("generates a number within the specified range", () => {
    const strategy = new RangeStrategy()
    const field = makeField({
      type: "number",
      rule: { kind: "range", min: 10, max: 20 },
    })
    for (let i = 0; i < 100; i++) {
      const value = strategy.generate(field)
      expect(typeof value).toBe("number")
      expect(value).toBeGreaterThanOrEqual(10)
      expect(value).toBeLessThanOrEqual(20)
    }
  })

  it("throws for non-range rule", () => {
    const strategy = new RangeStrategy()
    const field = makeField({
      rule: { kind: "enum", values: ["a", "b"] },
    })
    expect(() => strategy.generate(field)).toThrow()
  })
})

describe("EnumStrategy", () => {
  it("picks a value from the enum", () => {
    const strategy = new EnumStrategy()
    const values = ["red", "green", "blue"]
    const field = makeField({
      rule: { kind: "enum", values },
    })
    for (let i = 0; i < 50; i++) {
      const value = strategy.generate(field)
      expect(values).toContain(value)
    }
  })

  it("throws for non-enum rule", () => {
    const strategy = new EnumStrategy()
    const field = makeField({
      rule: { kind: "range", min: 1, max: 5 },
    })
    expect(() => strategy.generate(field)).toThrow()
  })
})

describe("FormatStrategy", () => {
  it("generates a UUID for uuid subtype", () => {
    const strategy = new FormatStrategy()
    const field = makeField({
      rule: { kind: "format", subtype: "uuid" },
    })
    const value = strategy.generate(field) as string
    expect(value).toMatch(/^[0-9a-f-]{36}$/)
  })

  it("generates YYYY-MM-DD for date subtype", () => {
    const strategy = new FormatStrategy()
    const field = makeField({
      rule: { kind: "format", subtype: "date" },
    })
    const value = strategy.generate(field) as string
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("generates ISO string for datetime subtype", () => {
    const strategy = new FormatStrategy()
    const field = makeField({
      rule: { kind: "format", subtype: "datetime" },
    })
    const value = strategy.generate(field) as string
    expect(value).toContain("T")
  })

  it("throws for non-format rule", () => {
    const strategy = new FormatStrategy()
    const field = makeField({
      type: "string",
      rule: { kind: "enum", values: ["x"] },
    })
    expect(() => strategy.generate(field)).toThrow()
  })
})

describe("DefaultStrategy", () => {
  it("generates a string for string type without rule", () => {
    const strategy = new DefaultStrategy()
    const field = makeField({ type: "string" })
    const value = strategy.generate(field)
    expect(typeof value).toBe("string")
  })

  it("generates a number for number type", () => {
    const strategy = new DefaultStrategy()
    const field = makeField({ type: "number" })
    const value = strategy.generate(field)
    expect(typeof value).toBe("number")
  })

  it("generates a boolean for boolean type", () => {
    const strategy = new DefaultStrategy()
    const field = makeField({ type: "boolean" })
    const value = strategy.generate(field)
    expect(typeof value).toBe("boolean")
  })

  it("returns empty object for object type", () => {
    const strategy = new DefaultStrategy()
    const field = makeField({ type: "object" })
    const value = strategy.generate(field)
    expect(value).toEqual({})
  })

  it("returns empty array for array type", () => {
    const strategy = new DefaultStrategy()
    const field = makeField({ type: "array" })
    const value = strategy.generate(field)
    expect(value).toEqual([])
  })

  it("returns null for null type", () => {
    const strategy = new DefaultStrategy()
    const field = makeField({ type: "null" })
    const value = strategy.generate(field)
    expect(value).toBeNull()
  })

  it("generates email for field named email", () => {
    const strategy = new DefaultStrategy()
    const field = makeField({ type: "string", name: "email" })
    const value = strategy.generate(field) as string
    expect(value).toContain("@")
  })

  it("generates UUID for field named id", () => {
    const strategy = new DefaultStrategy()
    const field = makeField({ type: "string", name: "id" })
    const value = strategy.generate(field) as string
    expect(value.length).toBeGreaterThan(10)
  })

  it("uses name heuristic for firstName", () => {
    const strategy = new DefaultStrategy()
    const field = makeField({ type: "string", name: "firstName" })
    const value = strategy.generate(field)
    expect(typeof value).toBe("string")
    expect(value.length).toBeGreaterThan(0)
  })

  it("throws if field has a rule", () => {
    const strategy = new DefaultStrategy()
    const field = makeField({
      rule: { kind: "range", min: 1, max: 10 },
    })
    expect(() => strategy.generate(field)).toThrow()
  })
})

describe("getStrategy factory", () => {
  it("returns RangeStrategy for range rules", () => {
    const field = makeField({
      rule: { kind: "range", min: 1, max: 5 },
    })
    const strategy = getStrategy(field)
    expect(strategy).toBeInstanceOf(RangeStrategy)
  })

  it("returns EnumStrategy for enum rules", () => {
    const field = makeField({
      rule: { kind: "enum", values: ["a", "b"] },
    })
    const strategy = getStrategy(field)
    expect(strategy).toBeInstanceOf(EnumStrategy)
  })

  it("returns FormatStrategy for format rules", () => {
    const field = makeField({
      rule: { kind: "format", subtype: "uuid" },
    })
    const strategy = getStrategy(field)
    expect(strategy).toBeInstanceOf(FormatStrategy)
  })

  it("returns DefaultStrategy when no rule is set", () => {
    const field = makeField({})
    const strategy = getStrategy(field)
    expect(strategy).toBeInstanceOf(DefaultStrategy)
  })

  it("returns StaticStrategy for static rule", () => {
    const field = makeField({ rule: { kind: 'static', value: 'test' } })
    const strategy = getStrategy(field)
    expect(strategy).toBeInstanceOf(StaticStrategy)
  })
})

describe("StaticStrategy", () => {
  it("generates the exact static string value", () => {
    const strategy = new StaticStrategy()
    const field = makeField({
      type: 'string',
      rule: { kind: 'static', value: '00010' },
    })
    const result = strategy.generate(field)
    expect(result).toBe('00010')
  })

  it("generates the exact static number value", () => {
    const strategy = new StaticStrategy()
    const field = makeField({
      type: 'number',
      rule: { kind: 'static', value: 42 },
    })
    const result = strategy.generate(field)
    expect(result).toBe(42)
  })

  it("generates the exact static boolean value", () => {
    const strategy = new StaticStrategy()
    const field = makeField({
      type: 'boolean',
      rule: { kind: 'static', value: true },
    })
    const result = strategy.generate(field)
    expect(result).toBe(true)
  })

  it("generates the same value across multiple calls", () => {
    const strategy = new StaticStrategy()
    const field = makeField({
      type: 'string',
      rule: { kind: 'static', value: '00010' },
    })
    const results = Array.from({ length: 100 }, () => strategy.generate(field))
    expect(results.every(v => v === '00010')).toBe(true)
  })
})

describe("RangeStrategy on string fields", () => {
  const strategy = new RangeStrategy()

  it("generates integer strings for integer range on string field", () => {
    const result = strategy.generate(makeField({
      type: 'string',
      rule: { kind: 'range', min: 1, max: 100 },
    })) as string
    expect(typeof result).toBe('string')
    const num = Number(result)
    expect(Number.isInteger(num)).toBe(true)
    expect(num).toBeGreaterThanOrEqual(1)
    expect(num).toBeLessThanOrEqual(100)
  })

  it("generates float strings when min/max are floats on string field", () => {
    const result = strategy.generate(makeField({
      type: 'string',
      rule: { kind: 'range', min: 0.5, max: 0.9 },
    })) as string
    expect(typeof result).toBe('string')
    const num = Number(result)
    expect(num).toBeGreaterThanOrEqual(0.5)
    expect(num).toBeLessThanOrEqual(0.9)
  })

  it("generates values within range across multiple calls on string field", () => {
    const field = makeField({
      type: 'string',
      rule: { kind: 'range', min: 1, max: 5 },
    })
    const results = Array.from({ length: 20 }, () => strategy.generate(field))
    results.forEach(r => {
      expect(typeof r).toBe('string')
      expect(Number(r)).toBeGreaterThanOrEqual(1)
      expect(Number(r)).toBeLessThanOrEqual(5)
    })
  })
})

describe("SequentialStrategy", () => {
  const strategy = new SequentialStrategy()

  beforeEach(() => {
    strategy.setStart(0)
    strategy.reset()
  })

  it("increments by 1 starting from 0 by default", () => {
    const field = makeField({
      type: 'number',
      rule: { kind: 'sequential', start: 0 },
    })
    expect(strategy.generate(field)).toBe(0)
    expect(strategy.generate(field)).toBe(1)
    expect(strategy.generate(field)).toBe(2)
    expect(strategy.generate(field)).toBe(3)
  })

  it("starts from user-defined start value", () => {
    const field = makeField({
      type: 'number',
      rule: { kind: 'sequential', start: 100 },
    })
    strategy.setStart(100)
    expect(strategy.generate(field)).toBe(100)
    expect(strategy.generate(field)).toBe(101)
    expect(strategy.generate(field)).toBe(102)
  })

  it("returns strings when field type is string", () => {
    const field = makeField({
      type: 'string',
      rule: { kind: 'sequential', start: 1 },
    })
    strategy.setStart(1)
    const r1 = strategy.generate(field)
    const r2 = strategy.generate(field)
    expect(typeof r1).toBe('string')
    expect(r1).toBe('1')
    expect(r2).toBe('2')
  })

  it("reset restarts counter from the configured start", () => {
    const field = makeField({
      type: 'number',
      rule: { kind: 'sequential', start: 5 },
    })
    strategy.setStart(5)
    strategy.generate(field) // 5
    strategy.generate(field) // 6
    strategy.generate(field) // 7
    strategy.reset()
    expect(strategy.generate(field)).toBe(5)
  })

  it("returns sequential values across many iterations", () => {
    const field = makeField({
      type: 'number',
      rule: { kind: 'sequential', start: 0 },
    })
    const values = Array.from({ length: 50 }, () => strategy.generate(field))
    values.forEach((v, i) => expect(v).toBe(i))
  })
})
