import type { MockForgeAPI } from './ipc.types'

declare global {
  interface Window {
    mockforge: MockForgeAPI
  }
}
