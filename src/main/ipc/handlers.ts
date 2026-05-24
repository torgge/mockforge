import { ipcMain } from "electron"
import { ZodSchema } from "zod"
import { IPC_CHANNELS } from "@shared/ipc.channels"
import { generateRequestSchema, exportToFileSchema, settingsGetSchema, settingsSetSchema } from "@shared/validation"
import { GeneratorService } from "../services/generator.service"
import { ExportService } from "../services/export.service"
import { SettingsService } from "../services/settings.service"
import { stubs } from "./stubs"

function validate<T>(schema: ZodSchema<T>, payload: unknown): T {
  var result=schema.safeParse(payload);
  if(!result.success){
    throw new Error(result.error.errors.map(function(e){return e.message}).join("; "));
  }
  return result.data;
}

export function registerAllHandlers(){
  ipcMain.handle(IPC_CHANNELS.PROJECT_CREATE,function(e,p){return stubs.project.create(p)})
  ipcMain.handle(IPC_CHANNELS.PROJECT_LIST,function(){return stubs.project.list()})
  ipcMain.handle(IPC_CHANNELS.PROJECT_UPDATE,function(e,p){return stubs.project.update(p)})
  ipcMain.handle(IPC_CHANNELS.PROJECT_DELETE,function(e,p){return stubs.project.delete(p)})
  ipcMain.handle(IPC_CHANNELS.PROJECT_SEARCH,function(e,p){return stubs.project.search(p)})
  ipcMain.handle(IPC_CHANNELS.SCHEMA_GET_BY_PROJECT,function(e,p){return stubs.schema.getByProject(p)})
  ipcMain.handle(IPC_CHANNELS.SCHEMA_IMPORT_AVRO,function(e,p){return stubs.schema.importAvro(p)})
  ipcMain.handle(IPC_CHANNELS.FIELD_UPDATE_RULE,function(e,p){return stubs.field.updateRule(p)})
  ipcMain.handle(IPC_CHANNELS.GENERATOR_RUN,function(e,p){
    var payload=validate(generateRequestSchema,p);
    return GeneratorService.run(payload);
  })
  ipcMain.handle(IPC_CHANNELS.EXPORT_TO_FILE,function(e,p){
    var payload=validate(exportToFileSchema,p);
    return ExportService.toFile(payload);
  })
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET,function(e,p){
    var payload=validate(settingsGetSchema,p);
    return SettingsService.get(payload.key);
  })
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET,function(e,p){
    var payload=validate(settingsSetSchema,p);
    return SettingsService.set(payload.key,payload.value);
  })
}