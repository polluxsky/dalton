import { contextBridge, ipcRenderer } from 'electron'

// 暴露API给渲染进程使用
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用信息
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  
  // 新建连接事件
  onNewConnection: (callback) => ipcRenderer.on('new-connection', callback),
  
  // Redis相关操作可以在这里定义
  // 注意：所有的Redis操作应该在主进程中执行，通过IPC通信
  // 这里只定义API接口
  redis: {
    connect: (config) => ipcRenderer.invoke('redis-connect', config),
    disconnect: (connectionId) => ipcRenderer.invoke('redis-disconnect', connectionId),
    executeCommand: (connectionId, command, args) => 
      ipcRenderer.invoke('redis-execute', connectionId, command, args),
    getKeys: (connectionId, pattern = '*') => 
      ipcRenderer.invoke('redis-get-keys', connectionId, pattern),
    getValue: (connectionId, key) => 
      ipcRenderer.invoke('redis-get-value', connectionId, key),
    setValue: (connectionId, key, value, options) => 
      ipcRenderer.invoke('redis-set-value', connectionId, key, value, options),
    deleteKey: (connectionId, key) => 
      ipcRenderer.invoke('redis-delete-key', connectionId, key)
  }
})

// 监听主题切换事件
ipcRenderer.on('theme-change', (event, theme) => {
  // 广播主题变更事件给渲染进程
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: theme }))
})