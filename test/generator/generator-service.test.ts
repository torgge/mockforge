import { describe, it, expect, vi, beforeEach } from "vitest"
import type { GenerateRequest } from "@shared/ipc.types"

describe("GeneratorService", () => {
  it("rejects quantity less than 1", async () => {
    vi.doMock("../../src/main/db/client", () => ({
      getSqlite: () => ({
        prepare: () => ({
          get: () => undefined,
          all: () => [],
        }),
      }),
    }))
    const { GeneratorService } = await import("../../src/main/services/generator.service")
    const req: GenerateRequest = { schemaId: "test-uuid", quantity: 0 }
    await expect(GeneratorService.run(req)).rejects.toThrow("at least 1")
  })

  it("rejects quantity exceeding max limit", async () => {
    vi.resetModules()
    vi.doMock("../../src/main/db/client", () => ({
      getSqlite: () => ({
        prepare: () => ({
          get: () => ({ value: "100" }),
          all: () => [],
        }),
      }),
    }))
    const { GeneratorService } = await import("../../src/main/services/generator.service")
    const req: GenerateRequest = { schemaId: "test-uuid", quantity: 101 }
    await expect(GeneratorService.run(req)).rejects.toThrow("not exceed")
  })

  it("throws when no fields exist for schema", async () => {
    vi.resetModules()
    vi.doMock("../../src/main/db/client", () => ({
      getSqlite: () => ({
        prepare: () => ({
          get: () => undefined,
          all: () => [],
        }),
      }),
    }))
    const { GeneratorService } = await import("../../src/main/services/generator.service")
    const req: GenerateRequest = { schemaId: "test-uuid", quantity: 5 }
    await expect(GeneratorService.run(req)).rejects.toThrow("No fields found")
  })
})
