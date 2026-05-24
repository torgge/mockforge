import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/main',
    },
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: resolve('src/preload/index.ts'),
      },
    },
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
      },
    },
  },
  renderer: {
    root: resolve('src/renderer'),
    build: {
      outDir: resolve('out/renderer'),
      rollupOptions: {
        input: resolve('src/renderer/index.html'),
      },
    },
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
      },
    },
    plugins: [react(), tailwindcss()],
  },
})
