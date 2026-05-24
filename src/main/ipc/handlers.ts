import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc.channels'
import { ProjectService } from '../services/project.service'
import { SchemaService } from '../services/schema.service'
import { GeneratorService } from '../services/generator.service'
import { ExportService } from '../services/export.service'
import { SettingsService } from '../services/settings.service'
import {
  projectCreateSchema,
  projectUpdateSchema,
  projectDeleteSchema,
  projectSearchSchema,
  schemaGetByProjectSchema,
  schemaImportAvroSchema,
  fieldUpdateRuleSchema,
  generateRequestSchema,
  exportToFileSchema,
  settingsGetSchema,
  settingsSetSchema,
} from '@shared/validation'

function wrapHandler<T>(fn: (...args: unknown[]) => Promise<T>) {
  return async (_event: Electron.IpcMainInvokeEvent, payload: unknown): Promise<T> => {
    try {
      return await fn(payload)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error'
      throw new Error(message)
    }
  }
}

export function registerAllHandlers(): void {
  // ── Project channels ──

  ipcMain.handle(
    IPC_CHANNELS.PROJECT_CREATE,
    wrapHandler(async (payload) => {
      const parsed = projectCreateSchema.parse(payload)
      return ProjectService.create(parsed)
    }),
  )

  ipcMain.handle(
    IPC_CHANNELS.PROJECT_LIST,
    wrapHandler(async () => {
      return ProjectService.list()
    }),
  )

  ipcMain.handle(
    IPC_CHANNELS.PROJECT_UPDATE,
    wrapHandler(async (payload) => {
      const parsed = projectUpdateSchema.parse(payload)
      return ProjectService.update(parsed)
    }),
  )

  ipcMain.handle(
    IPC_CHANNELS.PROJECT_DELETE,
    wrapHandler(async (payload) => {
      const parsed = projectDeleteSchema.parse(payload)
      return ProjectService.delete(parsed.id)
    }),
  )

  ipcMain.handle(
    IPC_CHANNELS.PROJECT_SEARCH,
    wrapHandler(async (payload) => {
      const parsed = projectSearchSchema.parse(payload)
      return ProjectService.search(parsed.query)
    }),
  )

  // ── Schema channels ──

  ipcMain.handle(
    IPC_CHANNELS.SCHEMA_GET_BY_PROJECT,
    wrapHandler(async (payload) => {
      const parsed = schemaGetByProjectSchema.parse(payload)
      return SchemaService.getByProject(parsed.projectId)
    }),
  )

  ipcMain.handle(
    IPC_CHANNELS.SCHEMA_IMPORT_AVRO,
    wrapHandler(async (payload) => {
      const parsed = schemaImportAvroSchema.parse(payload)
      return SchemaService.importAvro(parsed.projectId, parsed.avroJson)
    }),
  )

  // ── Field channels ──

  ipcMain.handle(
    IPC_CHANNELS.FIELD_UPDATE_RULE,
    wrapHandler(async (payload) => {
      const parsed = fieldUpdateRuleSchema.parse(payload)
      return SchemaService.updateFieldRule(parsed.fieldId, parsed.rule)
    }),
  )

  // ── Generator channel ──

  ipcMain.handle(
    IPC_CHANNELS.GENERATOR_RUN,
    wrapHandler(async (payload) => {
      const parsed = generateRequestSchema.parse(payload)
      return GeneratorService.run(parsed)
    }),
  )

  // ── Export channel ──

  ipcMain.handle(
    IPC_CHANNELS.EXPORT_TO_FILE,
    wrapHandler(async (payload) => {
      const parsed = exportToFileSchema.parse(payload)
      return ExportService.toFile(parsed)
    }),
  )

  // ── Settings channels ──

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_GET,
    wrapHandler(async (payload) => {
      const parsed = settingsGetSchema.parse(payload)
      return SettingsService.get(parsed.key)
    }),
  )

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET,
    wrapHandler(async (payload) => {
      const parsed = settingsSetSchema.parse(payload)
      return SettingsService.set(parsed.key, parsed.value)
    }),
  )
}
