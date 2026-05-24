import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

export interface TestDb {
  sqlite: Database.Database
  db: ReturnType<typeof drizzle>
}

export function createTestDb(): TestDb {
  const sqlite = new Database(':memory:')
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

  const db = drizzle(sqlite)

  return { sqlite, db }
}

export function clearTestDb(testDb: TestDb): void {
  testDb.sqlite.exec('DELETE FROM fields')
  testDb.sqlite.exec('DELETE FROM schemas')
  testDb.sqlite.exec('DELETE FROM projects')
  testDb.sqlite.exec('DELETE FROM settings')
}
