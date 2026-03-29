import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const __dirname_esm = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  main: {
    resolve: {
      alias: [
        { find: '@shared', replacement: resolve(__dirname_esm, 'src/shared') }
      ]
    },
    plugins: [
      externalizeDepsPlugin({
        exclude: ['fluent-ffmpeg', 'uuid', '@google/generative-ai']
      })
    ]
  },
  preload: {
    resolve: {
      alias: [
        { find: '@shared', replacement: resolve(__dirname_esm, 'src/shared') }
      ]
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    worker: {
      format: 'es'
    },
    resolve: {
      alias: [
        { find: '@shared', replacement: resolve(__dirname_esm, 'src/shared') },
        { find: '@', replacement: resolve(__dirname_esm, 'src/renderer/src') }
      ]
    },
    plugins: [react()]
  }
})
