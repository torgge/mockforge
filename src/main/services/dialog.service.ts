import { dialog, BrowserWindow } from 'electron'
import { readFileSync } from 'fs'
import type { DialogOpenFilePayload, DialogOpenFileResult } from '@shared/ipc.types'

export const DialogService = {
  async openFile(payload: DialogOpenFilePayload): Promise<DialogOpenFileResult | null> {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null

    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: payload.filters.map((f) => ({
        name: f.name,
        extensions: f.extensions,
      })),
    })

    if (canceled || filePaths.length === 0) return null

    try {
      const content = readFileSync(filePaths[0], 'utf-8')
      return { canceled: false, content, filePath: filePaths[0] }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read file'
      throw new Error(`Failed to read file: ${message}`)
    }
  },
}
