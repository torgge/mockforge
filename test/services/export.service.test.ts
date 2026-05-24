import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ExportToFilePayload } from '@shared/ipc.types'

// Mock Electron modules
vi.mock('electron', () => ({
  BrowserWindow: {
    getFocusedWindow: vi.fn(),
  },
  dialog: {
    showSaveDialog: vi.fn(),
  },
}))

// Mock fs module to control writeFileSync behavior
vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
}))

describe('ExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return null when the save dialog is cancelled', async () => {
    const electron = await import('electron')
    const mockGetFocusedWindow = electron.BrowserWindow
      .getFocusedWindow as ReturnType<typeof vi.fn>
    const mockShowSaveDialog = electron.dialog
      .showSaveDialog as ReturnType<typeof vi.fn>

    // Focused window exists
    mockGetFocusedWindow.mockReturnValue({} as Electron.BrowserWindow)
    // Dialog is cancelled
    mockShowSaveDialog.mockResolvedValue({ canceled: true, filePath: undefined })

    const { ExportService } = await import(
      '../../src/main/services/export.service'
    )

    const payload: ExportToFilePayload = {
      data: [{ id: 1 }],
      suggestedName: 'test-output.json',
    }

    const result = await ExportService.toFile(payload)
    expect(result).toBeNull()
  })

  it('should return null when no focused window exists', async () => {
    const electron = await import('electron')
    const mockGetFocusedWindow = electron.BrowserWindow
      .getFocusedWindow as ReturnType<typeof vi.fn>
    mockGetFocusedWindow.mockReturnValue(null)

    const { ExportService } = await import(
      '../../src/main/services/export.service'
    )

    const payload: ExportToFilePayload = {
      data: [{ id: 1 }],
      suggestedName: 'test-output.json',
    }

    const result = await ExportService.toFile(payload)
    expect(result).toBeNull()
  })

  it('should return the file path when dialog is confirmed', async () => {
    const electron = await import('electron')
    const mockGetFocusedWindow = electron.BrowserWindow
      .getFocusedWindow as ReturnType<typeof vi.fn>
    const mockShowSaveDialog = electron.dialog
      .showSaveDialog as ReturnType<typeof vi.fn>

    const fs = await import('fs')
    const mockWriteFileSync = fs.writeFileSync as ReturnType<typeof vi.fn>
    mockWriteFileSync.mockImplementation(() => {})

    mockGetFocusedWindow.mockReturnValue({} as Electron.BrowserWindow)
    mockShowSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: '/tmp/output.json',
    })

    const { ExportService } = await import(
      '../../src/main/services/export.service'
    )

    const payload: ExportToFilePayload = {
      data: [{ name: 'test', value: 42 }],
      suggestedName: 'output.json',
    }

    const result = await ExportService.toFile(payload)
    expect(result).toEqual({ filePath: '/tmp/output.json' })
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      '/tmp/output.json',
      JSON.stringify(payload.data, null, 2),
      'utf-8',
    )
  })

  it('should throw when file write fails', async () => {
    const electron = await import('electron')
    const mockGetFocusedWindow = electron.BrowserWindow
      .getFocusedWindow as ReturnType<typeof vi.fn>
    const mockShowSaveDialog = electron.dialog
      .showSaveDialog as ReturnType<typeof vi.fn>

    const fs = await import('fs')
    const mockWriteFileSync = fs.writeFileSync as ReturnType<typeof vi.fn>
    mockWriteFileSync.mockImplementation(() => {
      throw new Error('Permission denied')
    })

    mockGetFocusedWindow.mockReturnValue({} as Electron.BrowserWindow)
    mockShowSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: '/tmp/output.json',
    })

    const { ExportService } = await import(
      '../../src/main/services/export.service'
    )

    const payload: ExportToFilePayload = {
      data: [{ id: 1 }],
      suggestedName: 'output.json',
    }

    await expect(ExportService.toFile(payload)).rejects.toThrow(
      'Export failed: Permission denied',
    )
  })
})
