import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc.channels'
import { stubs } from './stubs'

export function registerAllHandlers(): void {
  // Project channels
  ipcMain.handle(IPC_CHANNELS.PROJECT_CREATE, (_event, payload) => {
    return stubs.project.create(payload)
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_LIST, () => {
    return stubs.project.list()
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_UPDATE, (_event, payload) => {
    return stubs.project.update(payload)
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_DELETE, (_event, payload) => {
    return stubs.project.delete(payload)
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_SEARCH, (_event, payload) => {
    return stubs.project.search(payload)
  })

  // Schema channels
  ipcMain.handle(IPC_CHANNELS.SCHEMA_GET_BY_PROJECT, (_event, payload) => {
    return stubs.schema.getByProject(payload)
  })

  ipcMain.handle(IPC_CHANNELS.SCHEMA_IMPORT_AVRO, (_event, payload) => {
    return stubs.schema.importAvro(payload)
  })

  // Field channels
  ipcMain.handle(IPC_CHANNELS.FIELD_UPDATE_RULE, (_event, payload) => {
    return stubs.field.updateRule(payload)
  })

  // Generator channels
  ipcMain.handle(IPC_CHANNELS.GENERATOR_RUN, (_event, payload) => {
    return stubs.generator.run(payload)
  })

  // Export channels
  ipcMain.handle(IPC_CHANNELS.EXPORT_TO_FILE, (_event, payload) => {
    return stubs.export.toFile(payload)
  })

  // Settings channels
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, (_event, payload) => {
    return stubs.settings.get(payload)
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_event, payload) => {
    return stubs.settings.set(payload)
  })
}
