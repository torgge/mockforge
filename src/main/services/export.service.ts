import { dialog, BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'
import type { ExportToFilePayload, ExportToFileResult } from '@shared/ipc.types'

export const ExportService = {
  async toFile(payload: ExportToFilePayload): Promise<ExportToFileResult | null> {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null

    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      defaultPath: payload.suggestedName,
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    })

    if (canceled || !filePath) return null

    writeFileSync(filePath, JSON.stringify(payload.data, null, 2), 'utf-8')
    return { filePath }
  },
}
