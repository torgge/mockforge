import { describe, it, expect } from "vitest"
import { resolveFields } from "../../src/main/services/nested-resolver"
import type { Field } from "@shared/ipc.types"

function f(overrides: Partial<Field>): Field {
  return { id: "", schemaId: "s1", parentFieldId: null, name: "", type: "string", rule: null, order: 0, ...overrides }
}

describe("resolveFields", () => {
  it("resolves flat primitive fields", () => {
    const fields: Field[] = [
      f({ id: "f1", parentFieldId: null, name: "name", type: "string", order: 0 }),
      f({ id: "f2", parentFieldId: null, name: "age", type: "number", order: 1 }),
      f({ id: "f3", parentFieldId: null, name: "active", type: "boolean", order: 2 }),
    ]
    const result = resolveFields(fields)
    expect(result).toHaveProperty("name")
    expect(result).toHaveProperty("age")
    expect(result).toHaveProperty("active")
    expect(typeof result.name).toBe("string")
    expect(typeof result.age).toBe("number")
    expect(typeof result.active).toBe("boolean")
  })

  it("resolves nested object fields", () => {
    const fields: Field[] = [
      f({ id: "f1", parentFieldId: null, name: "address", type: "object", order: 0 }),
      f({ id: "f2", parentFieldId: "f1", name: "street", type: "string", order: 0 }),
      f({ id: "f3", parentFieldId: "f1", name: "city", type: "string", order: 1 }),
    ]
    const result = resolveFields(fields)
    expect(result).toHaveProperty("address")
    expect(typeof result.address).toBe("object")
    expect(result.address).toHaveProperty("street")
    expect(result.address).toHaveProperty("city")
    expect(typeof (result.address as Record<string, unknown>).street).toBe("string")
  })

  it("resolves array fields with children", () => {
    const fields: Field[] = [
      f({ id: "f1", parentFieldId: null, name: "items", type: "array", order: 0 }),
      f({ id: "f2", parentFieldId: "f1", name: "itemName", type: "string", order: 0 }),
    ]
    const result = resolveFields(fields)
    expect(result).toHaveProperty("items")
    expect(Array.isArray(result.items)).toBe(true)
    const arr = result.items as unknown[]
    expect(arr.length).toBeGreaterThanOrEqual(1)
    expect(arr.length).toBeLessThanOrEqual(5)
    if (arr.length > 0) {
      expect(typeof (arr[0] as Record<string, unknown>).itemName).toBe("string")
    }
  })

  it("handles deep nesting (5+ levels)", () => {
    const fields: Field[] = [
      f({ id: "l1", parentFieldId: null, name: "level1", type: "object", order: 0 }),
      f({ id: "l2", parentFieldId: "l1", name: "level2", type: "object", order: 0 }),
      f({ id: "l3", parentFieldId: "l2", name: "level3", type: "object", order: 0 }),
      f({ id: "l4", parentFieldId: "l3", name: "level4", type: "object", order: 0 }),
      f({ id: "l5", parentFieldId: "l4", name: "level5", type: "object", order: 0 }),
      f({ id: "l6", parentFieldId: "l5", name: "value", type: "string", order: 0 }),
    ]
    const result = resolveFields(fields)
    expect(result).toHaveProperty("level1")
    const l1 = result.level1 as Record<string, unknown>
    expect(l1).toHaveProperty("level2")
    const l2 = l1.level2 as Record<string, unknown>
    expect(l2).toHaveProperty("level3")
    const l3 = l2.level3 as Record<string, unknown>
    expect(l3).toHaveProperty("level4")
    const l4 = l3.level4 as Record<string, unknown>
    expect(l4).toHaveProperty("level5")
    const l5 = l4.level5 as Record<string, unknown>
    expect(l5).toHaveProperty("value")
    expect(typeof l5.value).toBe("string")
  })

  it("handles object with no children", () => {
    const fields: Field[] = [
      f({ id: "f1", parentFieldId: null, name: "emptyObj", type: "object", order: 0 }),
    ]
    const result = resolveFields(fields)
    expect(result).toHaveProperty("emptyObj")
    expect(result.emptyObj).toEqual({})
  })

  it("handles null type fields", () => {
    const fields: Field[] = [
      f({ id: "f1", parentFieldId: null, name: "nullable", type: "null", order: 0 }),
    ]
    const result = resolveFields(fields)
    expect(result.nullable).toBeNull()
  })

  it("respects field order", () => {
    const fields: Field[] = [
      f({ id: "f1", parentFieldId: null, name: "zField", type: "string", order: 1 }),
      f({ id: "f2", parentFieldId: null, name: "aField", type: "string", order: 0 }),
    ]
    const result = resolveFields(fields)
    const keys = Object.keys(result)
    expect(keys[0]).toBe("aField")
    expect(keys[1]).toBe("zField")
  })
})
