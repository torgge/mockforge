import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc.channels'
import type {
  ProjectCreatePayload,
  ProjectUpdatePayload,
  ProjectDeletePayload,
  ProjectSearchPayload,
  SchemaGetByProjectPayload,
  SchemaImportAvroPayload,
  FieldUpdateRulePayload,
  GenerateRequest,
  ExportToFilePayload,
  SettingsGetPayload,
  SettingsSetPayload,
} from '@shared/ipc.types'

contextBridge.exposeInMainWorld('mockforge', {
  project: {
    create: (payload: ProjectCreatePayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROJECT_CREATE, payload),
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_LIST),
    update: (payload: ProjectUpdatePayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROJECT_UPDATE, payload),
    delete: (payload: ProjectDeletePayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROJECT_DELETE, payload),
    search: (payload: ProjectSearchPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROJECT_SEARCH, payload),
  },
  schema: {
    getByProject: (payload: SchemaGetByProjectPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCHEMA_GET_BY_PROJECT, payload),
    importAvro: (payload: SchemaImportAvroPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCHEMA_IMPORT_AVRO, payload),
  },
  field: {
    updateRule: (payload: FieldUpdateRulePayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.FIELD_UPDATE_RULE, payload),
  },
  generator: {
    run: (payload: GenerateRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.GENERATOR_RUN, payload),
  },
  export: {
    toFile: (payload: ExportToFilePayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_TO_FILE, payload),
  },
  settings: {
    get: (payload: SettingsGetPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, payload),
    set: (payload: SettingsSetPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, payload),
  },
})
