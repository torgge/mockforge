import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestDb, clearTestDb, type TestDb } from './test-db'

const testDb: TestDb = createTestDb()

vi.doMock('../../src/main/db/client', () => ({
  getSqlite: () => testDb.sqlite,
  getDb: () => testDb.db,
}))

describe('SettingsService', () => {
  beforeEach(() => {
    clearTestDb(testDb)
  })

  describe('get()', () => {
    it('should return the value for an existing key', async () => {
      const { SettingsService } = await import(
        '../../src/main/services/settings.service'
      )

      // Insert a setting directly via SQL
      testDb.sqlite
        .prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
        .run('theme', 'dark')

      const result = SettingsService.get('theme')
      expect(result).toBe('dark')
    })

    it('should return null for a missing key', async () => {
      const { SettingsService } = await import(
        '../../src/main/services/settings.service'
      )

      const result = SettingsService.get('non_existent_key')
      expect(result).toBeNull()
    })
  })

  describe('set()', () => {
    it('should create a new setting entry', async () => {
      const { SettingsService } = await import(
        '../../src/main/services/settings.service'
      )

      SettingsService.set('language', 'en')

      const row = testDb.sqlite
        .prepare('SELECT value FROM settings WHERE key = ?')
        .get('language') as { value: string } | undefined

      expect(row).toBeDefined()
      expect(row!.value).toBe('en')
    })

    it('should update the value of an existing setting', async () => {
      const { SettingsService } = await import(
        '../../src/main/services/settings.service'
      )

      // Create initial setting
      testDb.sqlite
        .prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
        .run('theme', 'light')

      // Update it via the service
      SettingsService.set('theme', 'dark')

      const row = testDb.sqlite
        .prepare('SELECT value FROM settings WHERE key = ?')
        .get('theme') as { value: string } | undefined

      expect(row).toBeDefined()
      expect(row!.value).toBe('dark')
    })

    it('should handle multiple settings independently', async () => {
      const { SettingsService } = await import(
        '../../src/main/services/settings.service'
      )

      SettingsService.set('setting_a', 'value_a')
      SettingsService.set('setting_b', 'value_b')

      const resultA = SettingsService.get('setting_a')
      const resultB = SettingsService.get('setting_b')
      const resultC = SettingsService.get('setting_c')

      expect(resultA).toBe('value_a')
      expect(resultB).toBe('value_b')
      expect(resultC).toBeNull()
    })
  })
})
