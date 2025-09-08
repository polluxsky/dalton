// 简化的预加载脚本，确保与主进程兼容
const { contextBridge, ipcRenderer } = require('electron')

// 暴露给渲染进程的API
const electronAPI = {
  // 基本的应用信息和事件
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  onNewConnection: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('new-connection', handler)
    return () => ipcRenderer.removeListener('new-connection', handler)
  },
  onThemeChange: (callback) => {
    const handler = (event, theme) => callback(theme)
    ipcRenderer.on('theme-change', handler)
    return () => ipcRenderer.removeListener('theme-change', handler)
  },
  // Redis操作的模拟实现，以便在修复主进程功能前让UI正常显示
  connect: async (config) => {
    console.log('Simulating Redis connect:', config)
    return { success: true, connectionId: 'mock-' + Date.now() }
  },
  disconnect: async (connectionId) => {
    console.log('Simulating Redis disconnect:', connectionId)
    return { success: true }
  },
  getKeys: async (connectionId, pattern = '*') => {
    console.log('Simulating Redis get keys:', pattern)
    return { 
      success: true, 
      keys: [], 
      count: 0 
    }
  },
  // 其他Redis操作的模拟实现
  execute: async (connectionId, command, args) => {
    console.log('Simulating Redis command:', command, args)
    return { success: true, result: 'Mock result' }
  },
  getValue: async (connectionId, key) => {
    console.log('Simulating Redis get value:', key)
    return { success: true, name: key, type: 'string', value: 'Mock value' }
  },
  setValue: async (connectionId, key, value, options) => {
    console.log('Simulating Redis set value:', key, value)
    return { success: true }
  },
  deleteKey: async (connectionId, key) => {
    console.log('Simulating Redis delete key:', key)
    return { success: true }
  },
  selectDb: async (connectionId, dbIndex) => {
    console.log('Simulating Redis select DB:', dbIndex)
    return { success: true }
  }
}

// 使用contextBridge暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

console.log('Preload script loaded successfully')