// 这是一个临时修复版本，用于解决Electron应用白屏问题
const { app, BrowserWindow } = require('electron')
const path = require('path')

// 确保应用是单例模式
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// 主窗口引用
let mainWindow

function createMainWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // 开发模式加载开发服务器，生产模式加载本地HTML
  const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL
  
  if (isDev) {
    // 开发模式
    const url = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000'
    mainWindow.loadURL(url)
    mainWindow.webContents.openDevTools()
  } else {
    // 生产模式 - 使用绝对路径
    const appPath = app.getAppPath()
    // 尝试多种可能的路径
    const possiblePaths = [
      path.join(appPath, 'dist/index.html'),
      path.join(__dirname, '../../dist/index.html'),
      path.resolve(__dirname, '../../dist/index.html')
    ]
    
    // 找到存在的路径
    let htmlPath = possiblePaths[0]
    try {
      const fs = require('fs')
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          htmlPath = p
          break
        }
      }
    } catch (e) {
      console.error('Error checking file paths:', e)
    }
    
    console.log('Loading HTML from:', htmlPath)
    mainWindow.loadFile(htmlPath)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createMainWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})