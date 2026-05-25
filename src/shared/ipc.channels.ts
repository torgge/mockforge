export const IPC_CHANNELS = {
  PROJECT_CREATE: 'project:create',
  PROJECT_LIST: 'project:list',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',
  PROJECT_SEARCH: 'project:search',
  SCHEMA_GET_BY_PROJECT: 'schema:getByProject',
  SCHEMA_IMPORT_AVRO: 'schema:importAvro',
  FIELD_UPDATE_RULE: 'field:updateRule',
  GENERATOR_RUN: 'generator:run',
  EXPORT_TO_FILE: 'export:toFile',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  DIALOG_OPEN_FILE: 'dialog:openFile',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
