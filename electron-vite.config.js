import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

// 定义一个帮助函数，用于解析路径
function pathResolve(dir) {
  return resolve(process.cwd(), '.', dir)
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/electron/main',
      rollupOptions: {
        input: {
          index: pathResolve('electron/main/index.js')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/electron/preload',
      rollupOptions: {
        input: {
          index: pathResolve('electron/preload/index.js')
        }
      }
    }
  },
  renderer: {
    plugins: [],
    resolve: {
      alias: {
        '@': pathResolve('src')
      }
    }
  }
})