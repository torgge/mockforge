import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

let db: ReturnType<typeof drizzle> | null = null
let sqliteInstance: Database.Database | null = null

export async function initDatabase(): Promise<void> {
  const dbPath = join(app.getPath('userData'), 'mockforge.db')
  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  // Create tables if they don't exist (initial migration)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schemas (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL UNIQUE REFERENCES projects(id),
      avro_source TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fields (
      id TEXT PRIMARY KEY,
      schema_id TEXT NOT NULL REFERENCES schemas(id),
      parent_field_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      rule TEXT,
      "order" INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  // Seed default settings
  const insertStmt = sqlite.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
  )
  insertStmt.run('max_generation_limit', '1000')

  sqliteInstance = sqlite
  db = drizzle(sqlite)
}

export function getDb(): ReturnType<typeof drizzle> {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function getSqlite(): Database.Database {
  if (!sqliteInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return sqliteInstance
}
