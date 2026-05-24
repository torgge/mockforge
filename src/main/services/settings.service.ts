import { getSqlite } from '../db/client'

export const SettingsService = {
  get(key: string): string | null {
    const sqlite = getSqlite()
    const row = sqlite
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(key) as { value: string } | undefined
    return row ? row.value : null
  },

  set(key: string, value: string): void {
    const sqlite = getSqlite()
    sqlite.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
  },
}
