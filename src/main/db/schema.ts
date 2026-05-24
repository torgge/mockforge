import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
})

export const schemas = sqliteTable('schemas', {
  id: text('id').primaryKey(),
  project_id: text('project_id').notNull().unique().references(() => projects.id),
  avro_source: text('avro_source'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
})

export const fields = sqliteTable('fields', {
  id: text('id').primaryKey(),
  schema_id: text('schema_id').notNull().references(() => schemas.id),
  parent_field_id: text('parent_field_id'),
  name: text('name').notNull(),
  type: text('type').notNull(),
  rule: text('rule'),
  order: integer('order').notNull().default(0),
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
