const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
const path = require('path')
const { createClient } = require('redis')

// 确保应用程序是单例模式
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 当运行第二个实例时，聚焦到主窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// 禁用Electron的安全警告
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

// 主窗口引用
let mainWindow

// 创建主窗口
function createMainWindow() {
  const windowOptions = {
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Dalton - Redis客户端',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
    icon: path.join(__dirname, '../../public/icons/icon.png')
  }

  mainWindow = new BrowserWindow(windowOptions)

  // 设置菜单
  const menuTemplate = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建连接',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('new-connection')
        },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        {
          label: '复制',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: '粘贴',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        }
      ]
    },
    {
      label: '视图',
      submenu: [
        {
          label: '刷新',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow.webContents.reload()
        },
        {
          label: '开发者工具',
          accelerator: 'CmdOrCtrl+Alt+I',
          click: () => mainWindow.webContents.toggleDevTools()
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              title: '关于 Dalton',
              message: 'Dalton - Redis客户端',
              detail: '版本: 0.0.1\n开发者: Pollux.Qu\n完全模拟Another-Redis-Desktop-Manager的Redis客户端应用',
              buttons: ['确定']
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)

  // 加载应用
  if (process.env.VITE_DEV_SERVER_URL) {
    // 开发环境加载开发服务器
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    // 开发环境下默认打开开发者工具
    // mainWindow.webContents.openDevTools()
  } else {
    // 生产环境加载本地HTML
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  // 窗口关闭时的处理
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 应用就绪后创建窗口
app.whenReady().then(createMainWindow)

// 所有窗口关闭时退出应用（macOS除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// macOS下点击Dock图标时重新创建窗口
app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow()
  }
})

// 存储活跃的Redis连接
const redisConnections = new Map()

// 创建Redis客户端连接
function createRedisClient(config) {
  try {
    const client = createClient({
      url: `redis://${config.host}:${config.port}`,
      password: config.password || undefined,
      database: config.database || 0
    })

    client.on('error', (err) => {
      console.error('Redis client error:', err)
    })

    client.on('connect', () => {
      console.log(`Connected to Redis at ${config.host}:${config.port}`)
    })

    client.on('end', () => {
      console.log(`Disconnected from Redis at ${config.host}:${config.port}`)
    })

    return client
  } catch (error) {
    console.error('Failed to create Redis client:', error)
    throw error
  }
}

// IPC通信处理
ipcMain.on('get-app-info', (event) => {
  event.reply('app-info-reply', {
    version: app.getVersion(),
    developer: 'Pollux.Qu'
  })
})

// Redis连接处理
ipcMain.handle('redis-connect', async (event, config) => {
  try {
    const connectionId = config.id || Date.now().toString()
    
    // 如果已有连接，则先断开
    if (redisConnections.has(connectionId)) {
      const existingClient = redisConnections.get(connectionId)
      if (existingClient.isOpen) {
        await existingClient.disconnect()
      }
    }

    const client = createRedisClient(config)
    await client.connect()
    
    // 存储连接
    redisConnections.set(connectionId, client)
    
    return { success: true, connectionId }
  } catch (error) {
    console.error('Redis connection failed:', error)
    return { success: false, error: error.message }
  }
})

// Redis断开连接处理
ipcMain.handle('redis-disconnect', async (event, connectionId) => {
  try {
    if (redisConnections.has(connectionId)) {
      const client = redisConnections.get(connectionId)
      if (client.isOpen) {
        await client.disconnect()
      }
      redisConnections.delete(connectionId)
    }
    return { success: true }
  } catch (error) {
    console.error('Redis disconnection failed:', error)
    return { success: false, error: error.message }
  }
})

// 执行Redis命令
ipcMain.handle('redis-execute', async (event, connectionId, command, args) => {
  try {
    if (!redisConnections.has(connectionId)) {
      throw new Error('No active connection found')
    }

    const client = redisConnections.get(connectionId)
    const result = await client[command](...args)
    return { success: true, result }
  } catch (error) {
    console.error('Redis command execution failed:', error)
    return { success: false, error: error.message }
  }
})

// 获取键列表
ipcMain.handle('redis-get-keys', async (event, connectionId, pattern = '*') => {
  try {
    if (!redisConnections.has(connectionId)) {
      throw new Error('No active connection found')
    }

    const client = redisConnections.get(connectionId)
    const keys = await client.keys(pattern)
    
    // 获取每个键的类型
    const keysWithType = []
    for (const key of keys) {
      try {
        const type = await client.type(key)
        keysWithType.push({ name: key, type })
      } catch (err) {
        console.warn(`Failed to get type for key ${key}:`, err)
        keysWithType.push({ name: key, type: 'unknown' })
      }
    }

    return { success: true, keys: keysWithType, count: keys.length }
  } catch (error) {
    console.error('Failed to get keys:', error)
    return { success: false, error: error.message }
  }
})

// 获取键值
ipcMain.handle('redis-get-value', async (event, connectionId, key) => {
  try {
    if (!redisConnections.has(connectionId)) {
      throw new Error('No active connection found')
    }

    const client = redisConnections.get(connectionId)
    const type = await client.type(key)
    let value = null

    switch (type) {
      case 'string':
        value = await client.get(key)
        break
      case 'list':
        value = await client.lrange(key, 0, -1)
        break
      case 'hash':
        value = await client.hgetall(key)
        break
      case 'set':
        value = await client.smembers(key)
        break
      case 'zset':
        value = await client.zrangeWithScores(key, 0, -1)
        break
      default:
        value = `Unsupported type: ${type}`
    }

    return { success: true, name: key, type, value }
  } catch (error) {
    console.error(`Failed to get value for key ${key}:`, error)
    return { success: false, error: error.message }
  }
})

// 设置键值
ipcMain.handle('redis-set-value', async (event, connectionId, key, value, options = {}) => {
  try {
    if (!redisConnections.has(connectionId)) {
      throw new Error('No active connection found')
    }

    const client = redisConnections.get(connectionId)
    
    // 根据类型设置值
    if (options.type === 'string') {
      if (options.expire) {
        await client.set(key, value, { EX: options.expire })
      } else {
        await client.set(key, value)
      }
    } else if (options.type === 'list') {
      // 先清空列表
      await client.del(key)
      // 然后添加所有元素
      if (Array.isArray(value)) {
        for (const item of value) {
          await client.rpush(key, item)
        }
      }
    } else if (options.type === 'hash') {
      if (typeof value === 'object') {
        await client.hset(key, value)
      } else {
        throw new Error('Hash value must be an object')
      }
    } else if (options.type === 'set') {
      // 先清空集合
      await client.del(key)
      // 然后添加所有元素
      if (Array.isArray(value)) {
        await client.sadd(key, value)
      }
    } else if (options.type === 'zset') {
      // 先清空有序集合
      await client.del(key)
      // 然后添加所有元素和分数
      if (Array.isArray(value)) {
        const zaddArgs = []
        for (const item of value) {
          if (item.score !== undefined && item.value !== undefined) {
            zaddArgs.push(item.score, item.value)
          }
        }
        if (zaddArgs.length > 0) {
          await client.zadd(key, zaddArgs)
        }
      }
    } else {
      throw new Error(`Unsupported type: ${options.type}`)
    }

    return { success: true }
  } catch (error) {
    console.error(`Failed to set value for key ${key}:`, error)
    return { success: false, error: error.message }
  }
})

// 删除键
ipcMain.handle('redis-delete-key', async (event, connectionId, key) => {
  try {
    if (!redisConnections.has(connectionId)) {
      throw new Error('No active connection found')
    }

    const client = redisConnections.get(connectionId)
    await client.del(key)

    return { success: true }
  } catch (error) {
    console.error(`Failed to delete key ${key}:`, error)
    return { success: false, error: error.message }
  }
})

// 切换数据库
ipcMain.handle('redis-select-db', async (event, connectionId, dbIndex) => {
  try {
    if (!redisConnections.has(connectionId)) {
      throw new Error('No active connection found')
    }

    const client = redisConnections.get(connectionId)
    await client.select(dbIndex)

    return { success: true }
  } catch (error) {
    console.error(`Failed to select database ${dbIndex}:`, error)
    return { success: false, error: error.message }
  }
})