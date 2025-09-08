// 极简Electron测试应用，用于验证HTML文件加载
const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

console.log('=== 启动Electron测试应用 ===')
console.log('当前工作目录:', process.cwd())

// 找到dist/index.html的绝对路径
const distHtmlPath = path.resolve(__dirname, 'dist/index.html')
console.log('尝试加载HTML文件:', distHtmlPath)

// 检查文件是否存在
if (fs.existsSync(distHtmlPath)) {
  console.log('✅ HTML文件存在')
  const stats = fs.statSync(distHtmlPath)
  console.log(`  - 文件大小: ${stats.size} 字节`)
  
  // 读取文件内容的前100个字符
  const content = fs.readFileSync(distHtmlPath, 'utf8').substring(0, 100)
  console.log('  - 文件内容预览:', content)
} else {
  console.error('❌ HTML文件不存在:', distHtmlPath)
  process.exit(1)
}

// 启动简单的Electron窗口
let win

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true
    }
  })

  // 尝试加载本地HTML文件
  console.log('正在加载HTML文件...')
  win.loadFile(distHtmlPath)
  
  // 自动打开DevTools查看错误
  win.webContents.openDevTools()
  
  // 监听加载完成事件
  win.webContents.on('did-finish-load', () => {
    console.log('✅ HTML文件加载完成')
  })
  
  // 监听控制台消息
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[网页控制台] ${message}`)
  })
  
  // 监听错误事件
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error(`❌ HTML文件加载失败: ${errorDescription} (错误码: ${errorCode})`)
  })

  win.on('closed', () => {
    win = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})

console.log('应用初始化完成，等待ready事件...')

// 添加一个简单的服务器来检查dist目录的可访问性
const http = require('http')
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'})
  res.end('测试服务器运行中\n')
})

server.listen(8888, () => {
  console.log('📡 测试服务器已启动: http://localhost:8888')
})