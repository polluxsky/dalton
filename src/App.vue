<template>
  <div class="app-container" :class="theme">
    <!-- 主界面布局 -->
    <div class="main-layout">
      <!-- 左侧连接面板 -->
      <div class="sidebar">
        <div class="sidebar-header">
          <h3>Redis连接</h3>
          <el-button 
            type="primary" 
            size="small" 
            @click="showConnectionDialog = true"
            icon="el-icon-plus"
          >
            新建
          </el-button>
        </div>
        
        <div class="connection-list">
          <div 
            v-for="connection in connections" 
            :key="connection.id"
            class="connection-item" 
            :class="{ active: activeConnectionId === connection.id }"
            @click="connectToRedis(connection)"
          >
            <div class="connection-info">
              <span class="connection-name">{{ connection.name }}</span>
              <span class="connection-status" :class="connection.connected ? 'connected' : ''">
                {{ connection.connected ? '✓' : '○' }}
              </span>
            </div>
            <div class="connection-host">{{ connection.host }}:{{ connection.port }}</div>
          </div>
        </div>
      </div>

      <!-- 主内容区 -->
      <div class="content-area">
        <!-- 顶部工具栏 -->
        <div class="toolbar">
          <div class="connection-detail" v-if="activeConnection">
            <span class="connection-title">{{ activeConnection.name }}</span>
            <span class="connection-host">{{ activeConnection.host }}:{{ activeConnection.port }}</span>
            <el-button 
              v-if="activeConnection.connected" 
              type="danger" 
              size="small" 
              @click="disconnectRedis"
              style="margin-left: 10px;"
            >
              断开连接
            </el-button>
          </div>
          <div class="toolbar-actions">
            <el-select 
              v-model="selectedDatabase" 
              size="small" 
              @change="switchDatabase"
              :disabled="!activeConnection || !activeConnection.connected"
            >
              <el-option 
                v-for="db in databases" 
                :key="db.index" 
                :label="`数据库 ${db.index}`" 
                :value="db.index"
              ></el-option>
            </el-select>
            <el-button 
              size="small" 
              @click="refreshKeys" 
              :disabled="!activeConnection || !activeConnection.connected"
              icon="el-icon-refresh"
            >
              刷新
            </el-button>
            <el-button 
              size="small" 
              @click="showAddKeyDialog = true" 
              :disabled="!activeConnection || !activeConnection.connected"
              icon="el-icon-plus"
            >
              添加键
            </el-button>
            <el-select v-model="theme" size="small" @change="changeTheme">
              <el-option label="明亮" value="light"></el-option>
              <el-option label="黑暗" value="dark"></el-option>
            </el-select>
          </div>
        </div>

        <!-- 键值列表 -->
        <div class="keys-section">
          <div class="search-box">
            <el-input 
              v-model="searchPattern" 
              placeholder="搜索键名..." 
              size="small"
              prefix-icon="el-icon-search"
              @keyup.enter.native="searchKeys"
            ></el-input>
            <el-button 
              type="primary" 
              size="small" 
              @click="searchKeys"
              :disabled="!activeConnection || !activeConnection.connected"
            >
              搜索
            </el-button>
          </div>
          
          <div class="keys-list" v-if="keys.length > 0">
            <div 
              v-for="key in keys" 
              :key="key.name"
              class="key-item" 
              :class="{ active: selectedKey === key.name }"
              @click="selectKey(key)"
            >
              <span class="key-type" :class="`type-${key.type}`">{{ key.type }}</span>
              <span class="key-name">{{ key.name }}</span>
              <el-button 
                type="danger" 
                size="mini" 
                @click.stop="deleteKey(key.name)"
                icon="el-icon-delete"
              ></el-button>
            </div>
          </div>
          
          <div class="empty-state" v-else-if="activeConnection && activeConnection.connected">
            <p>当前数据库中没有键</p>
          </div>
          
          <div class="empty-state" v-else>
            <p>请连接到Redis服务器</p>
          </div>
        </div>

        <!-- 值详情 -->
        <div class="value-section" v-if="selectedKey && selectedKeyValue">
          <div class="value-header">
            <h3>{{ selectedKey }} <span class="key-type">({{ selectedKeyValue.type }})</span></h3>
          </div>
          <div class="value-content">
            <pre>{{ formattedValue }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="status-bar">
      <div class="status-item">
        键总数: {{ keyCount }}
      </div>
      <div class="status-item" v-if="activeConnection && activeConnection.connected">
        连接状态: <span class="connected">已连接</span>
      </div>
      <div class="status-item" v-else-if="activeConnection">
        连接状态: <span class="disconnected">未连接</span>
      </div>
      <div class="status-item" v-if="activeConnection && activeConnection.connected">
        数据库: {{ selectedDatabase }}/{{ databases.length - 1 }}
      </div>
    </div>

    <!-- 新建连接对话框 -->
    <el-dialog 
      v-model="showConnectionDialog" 
      title="新建Redis连接" 
      width="400px"
    >
      <el-form :model="newConnection" :rules="connectionRules" ref="connectionForm">
        <el-form-item label="连接名称" prop="name">
          <el-input v-model="newConnection.name" placeholder="请输入连接名称"></el-input>
        </el-form-item>
        <el-form-item label="主机" prop="host">
          <el-input v-model="newConnection.host" placeholder="请输入主机地址"></el-input>
        </el-form-item>
        <el-form-item label="端口" prop="port">
          <el-input v-model.number="newConnection.port" placeholder="请输入端口号"></el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="newConnection.password" type="password" placeholder="请输入密码（可选）"></el-input>
        </el-form-item>
        <el-form-item label="数据库" prop="database">
          <el-input v-model.number="newConnection.database" placeholder="请输入数据库索引（默认0）"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showConnectionDialog = false">取消</el-button>
        <el-button type="primary" @click="saveConnection">确定</el-button>
      </template>
    </el-dialog>

    <!-- 添加键对话框 -->
    <el-dialog 
      v-model="showAddKeyDialog" 
      title="添加新键" 
      width="500px"
    >
      <el-form :model="newKey" :rules="keyRules" ref="keyForm">
        <el-form-item label="键名" prop="name">
          <el-input v-model="newKey.name" placeholder="请输入键名"></el-input>
        </el-form-item>
        <el-form-item label="键类型" prop="type">
          <el-select v-model="newKey.type" placeholder="请选择键类型">
            <el-option label="String" value="string"></el-option>
            <el-option label="List" value="list"></el-option>
            <el-option label="Hash" value="hash"></el-option>
            <el-option label="Set" value="set"></el-option>
            <el-option label="ZSet" value="zset"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="值" prop="value">
          <el-input 
            v-model="newKey.value" 
            type="textarea" 
            placeholder="请输入值" 
            :rows="4"
          ></el-input>
        </el-form-item>
        <el-form-item label="过期时间（秒）" prop="expire">
          <el-input v-model.number="newKey.expire" placeholder="留空表示永不过期"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddKeyDialog = false">取消</el-button>
        <el-button type="primary" @click="addKey">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

// 模拟Redis连接管理
const connections = ref([])
const activeConnectionId = ref(null)
const activeConnection = computed(() => 
  connections.value.find(conn => conn.id === activeConnectionId.value)
)

// 数据库和键相关
const databases = ref([])
const selectedDatabase = ref(0)
const keys = ref([])
const selectedKey = ref(null)
const selectedKeyValue = ref(null)
const keyCount = ref(0)

// 对话框状态
const showConnectionDialog = ref(false)
const showAddKeyDialog = ref(false)

// 表单数据
const newConnection = reactive({
  name: '',
  host: 'localhost',
  port: 6379,
  password: '',
  database: 0
})

const newKey = reactive({
  name: '',
  type: 'string',
  value: '',
  expire: null
})

// 表单验证规则
const connectionRules = {
  name: [{ required: true, message: '请输入连接名称', trigger: 'blur' }],
  host: [{ required: true, message: '请输入主机地址', trigger: 'blur' }],
  port: [
    { required: true, message: '请输入端口号', trigger: 'blur' },
    { type: 'number', min: 1, max: 65535, message: '端口号必须在1-65535之间', trigger: 'blur' }
  ],
  database: [
    { type: 'number', min: 0, message: '数据库索引必须大于等于0', trigger: 'blur' }
  ]
}

const keyRules = {
  name: [{ required: true, message: '请输入键名', trigger: 'blur' }],
  type: [{ required: true, message: '请选择键类型', trigger: 'change' }],
  value: [{ required: true, message: '请输入值', trigger: 'blur' }],
  expire: [
    { type: 'number', min: 1, message: '过期时间必须大于0', trigger: 'blur' }
  ]
}

// 搜索相关
const searchPattern = ref('*')

// 主题设置
const theme = ref('light')

// 格式化显示值
const formattedValue = computed(() => {
  if (!selectedKeyValue.value) return ''
  try {
    // 尝试以JSON格式解析和显示值
    return JSON.stringify(JSON.parse(selectedKeyValue.value.value), null, 2)
  } catch {
    // 如果不是JSON格式，直接返回原始值
    return selectedKeyValue.value.value
  }
})

// 连接到Redis
async function connectToRedis(connection) {
  try {
    activeConnectionId.value = connection.id
    
    // 调用electronAPI连接到Redis
    const result = await window.electronAPI?.redis.connect(connection)
    
    if (result?.success) {
      connection.connected = true
      
      // 加载数据库列表（Redis默认有16个数据库）
      databases.value = Array.from({ length: 16 }, (_, i) => ({ index: i }))
      selectedDatabase.value = connection.database || 0
      
      // 加载键列表
      await loadKeys()
      
      ElMessage.success(`已连接到 ${connection.name}`)
    } else {
      throw new Error(result?.error || '连接失败')
    }
  } catch (error) {
    ElMessage.error(`连接失败: ${error.message}`)
    connection.connected = false
  }
}

// 断开Redis连接
async function disconnectRedis() {
  try {
    if (activeConnection.value) {
      // 调用electronAPI断开连接
      await window.electronAPI?.redis.disconnect(activeConnection.value.id)
      
      activeConnection.value.connected = false
      keys.value = []
      selectedKey.value = null
      selectedKeyValue.value = null
      keyCount.value = 0
      ElMessage.info(`已断开连接`)
    }
  } catch (error) {
    ElMessage.error(`断开连接失败: ${error.message}`)
  }
}

// 切换数据库
async function switchDatabase(dbIndex) {
  try {
    if (activeConnection.value && activeConnection.value.connected) {
      // 调用electronAPI切换数据库
      const result = await window.electronAPI?.redis.executeCommand(
        activeConnection.value.id, 
        'select', 
        [dbIndex]
      )
      
      if (result?.success) {
        selectedDatabase.value = dbIndex
        await loadKeys()
      } else {
        throw new Error(result?.error || '切换数据库失败')
      }
    }
  } catch (error) {
    ElMessage.error(`切换数据库失败: ${error.message}`)
  }
}

// 加载键列表
async function loadKeys() {
  try {
    if (activeConnection.value && activeConnection.value.connected) {
      // 调用electronAPI获取键列表
      const result = await window.electronAPI?.redis.getKeys(
        activeConnection.value.id,
        searchPattern.value
      )
      
      if (result?.success) {
        keys.value = result.keys || []
        keyCount.value = result.count || 0
        selectedKey.value = null
        selectedKeyValue.value = null
      } else {
        throw new Error(result?.error || '加载键列表失败')
      }
    }
  } catch (error) {
    ElMessage.error(`加载键列表失败: ${error.message}`)
  }
}

// 刷新键列表
async function refreshKeys() {
  try {
    await loadKeys()
    ElMessage.info('已刷新键列表')
  } catch (error) {
    // 错误已在loadKeys中处理
  }
}

// 搜索键
async function searchKeys() {
  try {
    await loadKeys()
    ElMessage.info(`搜索键: ${searchPattern.value}`)
  } catch (error) {
    // 错误已在loadKeys中处理
  }
}

// 选择键
async function selectKey(key) {
  try {
    if (activeConnection.value && activeConnection.value.connected) {
      selectedKey.value = key.name
      
      // 调用electronAPI获取键值
      const result = await window.electronAPI?.redis.getValue(
        activeConnection.value.id,
        key.name
      )
      
      if (result?.success) {
        selectedKeyValue.value = result
      } else {
        throw new Error(result?.error || '获取键值失败')
      }
    }
  } catch (error) {
    ElMessage.error(`获取键值失败: ${error.message}`)
  }
}

// 添加键
async function addKey() {
  try {
    if (activeConnection.value && activeConnection.value.connected) {
      // 验证表单
      if (!newKey.name || !newKey.type || !newKey.value) {
        ElMessage.error('请填写必填字段')
        return
      }
      
      // 解析值（针对不同类型）
      let parsedValue = newKey.value
      try {
        if (newKey.type !== 'string') {
          parsedValue = JSON.parse(newKey.value)
        }
      } catch (error) {
        ElMessage.error('值格式不正确，请检查JSON格式')
        return
      }
      
      // 调用electronAPI设置键值
      const result = await window.electronAPI?.redis.setValue(
        activeConnection.value.id,
        newKey.name,
        parsedValue,
        {
          type: newKey.type,
          expire: newKey.expire || undefined
        }
      )
      
      if (result?.success) {
        // 重新加载键列表
        await loadKeys()
        
        // 清空表单
        newKey.name = ''
        newKey.type = 'string'
        newKey.value = ''
        newKey.expire = null
        
        showAddKeyDialog.value = false
        ElMessage.success('键添加成功')
      } else {
        throw new Error(result?.error || '添加键失败')
      }
    }
  } catch (error) {
    ElMessage.error(`添加键失败: ${error.message}`)
  }
}

// 删除键
async function deleteKey(keyName) {
  try {
    if (activeConnection.value && activeConnection.value.connected) {
      // 调用electronAPI删除键
      const result = await window.electronAPI?.redis.deleteKey(
        activeConnection.value.id,
        keyName
      )
      
      if (result?.success) {
        // 更新本地键列表
        keys.value = keys.value.filter(k => k.name !== keyName)
        keyCount.value--
        
        if (selectedKey.value === keyName) {
          selectedKey.value = null
          selectedKeyValue.value = null
        }
        
        ElMessage.success('键删除成功')
      } else {
        throw new Error(result?.error || '删除键失败')
      }
    }
  } catch (error) {
    ElMessage.error(`删除键失败: ${error.message}`)
  }
}

// 保存连接
function saveConnection() {
  // 验证表单
  const connectionForm = document.querySelector('form')
  if (!newConnection.name || !newConnection.host || !newConnection.port) {
    ElMessage.error('请填写必填字段')
    return
  }
  
  // 生成连接ID
  const connectionId = Date.now().toString()
  
  // 添加连接
  connections.value.push({
    id: connectionId,
    ...{...newConnection},
    connected: false
  })
  
  // 保存到本地存储
  saveConnectionsToStorage()
  
  // 清空表单
  newConnection.name = ''
  newConnection.host = 'localhost'
  newConnection.port = 6379
  newConnection.password = ''
  newConnection.database = 0
  
  showConnectionDialog.value = false
  ElMessage.success('连接保存成功')
}

// 保存连接到本地存储
function saveConnectionsToStorage() {
  localStorage.setItem('redis-connections', JSON.stringify(connections.value))
}

// 从本地存储加载连接
function loadConnectionsFromStorage() {
  const savedConnections = localStorage.getItem('redis-connections')
  if (savedConnections) {
    connections.value = JSON.parse(savedConnections)
  }
}

// 切换主题
function changeTheme(newTheme) {
  theme.value = newTheme
  document.documentElement.setAttribute('data-theme', newTheme)
  localStorage.setItem('app-theme', newTheme)
}

// 组件挂载时
onMounted(() => {
  // 加载保存的连接
  loadConnectionsFromStorage()
  
  // 加载保存的主题
  const savedTheme = localStorage.getItem('app-theme')
  if (savedTheme) {
    theme.value = savedTheme
    document.documentElement.setAttribute('data-theme', savedTheme)
  }
  
  // 监听新建连接事件
  if (window.electronAPI?.onNewConnection) {
    window.electronAPI.onNewConnection(() => {
      showConnectionDialog.value = true
    })
  }
})

// 组件卸载时
onUnmounted(() => {
  // 清理操作
})

export default {
  name: 'App',
  setup() {
    return {
      // 数据
      connections,
      activeConnectionId,
      activeConnection,
      databases,
      selectedDatabase,
      keys,
      selectedKey,
      selectedKeyValue,
      keyCount,
      showConnectionDialog,
      showAddKeyDialog,
      newConnection,
      newKey,
      connectionRules,
      keyRules,
      searchPattern,
      theme,
      formattedValue,
      
      // 方法
      connectToRedis,
      disconnectRedis,
      switchDatabase,
      loadKeys,
      refreshKeys,
      searchKeys,
      selectKey,
      addKey,
      deleteKey,
      saveConnection,
      changeTheme
    }
  }
}
</script>

<style>
/* 基础样式 */
:root {
  --primary-color: #409eff;
  --success-color: #67c23a;
  --warning-color: #e6a23c;
  --danger-color: #f56c6c;
  --info-color: #909399;
  --text-color-primary: #303133;
  --text-color-regular: #606266;
  --text-color-secondary: #909399;
  --text-color-placeholder: #c0c4cc;
  --border-color-base: #dcdfe6;
  --border-color-light: #e4e7ed;
  --border-color-lighter: #ebeef5;
  --border-color-extra-light: #f2f6fc;
  --background-color-page: #f5f7fa;
  --background-color: #ffffff;
  --background-color-modal: #ffffff;
  --background-color-hover: #f5f7fa;
}

/* 暗黑主题 */
:root.dark {
  --primary-color: #409eff;
  --success-color: #67c23a;
  --warning-color: #e6a23c;
  --danger-color: #f56c6c;
  --info-color: #909399;
  --text-color-primary: #ffffff;
  --text-color-regular: #dcdfe6;
  --text-color-secondary: #c0c4cc;
  --text-color-placeholder: #a8abb2;
  --border-color-base: #4e5969;
  --border-color-light: #4e5969;
  --border-color-lighter: #4e5969;
  --border-color-extra-light: #4e5969;
  --background-color-page: #1a1a1a;
  --background-color: #2c3e50;
  --background-color-modal: #34495e;
  --background-color-hover: #3e5060;
}

/* 应用容器 */
.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--background-color-page);
  color: var(--text-color-primary);
  overflow: hidden;
}

/* 主布局 */
.main-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 侧边栏 */
.sidebar {
  width: 280px;
  background-color: var(--background-color);
  border-right: 1px solid var(--border-color-base);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color-base);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.connection-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.connection-item {
  padding: 12px;
  margin-bottom: 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  border: 1px solid transparent;
}

.connection-item:hover {
  background-color: var(--background-color-hover);
}

.connection-item.active {
  background-color: var(--primary-color) !important;
  color: white;
}

.connection-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.connection-name {
  font-weight: 500;
}

.connection-status {
  font-size: 14px;
}

.connection-status.connected {
  color: var(--success-color);
}

.connection-host {
  font-size: 12px;
  color: var(--text-color-secondary);
}

.connection-item.active .connection-host {
  color: rgba(255, 255, 255, 0.8);
}

/* 内容区域 */
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 工具栏 */
.toolbar {
  padding: 12px 16px;
  background-color: var(--background-color);
  border-bottom: 1px solid var(--border-color-base);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.connection-detail {
  display: flex;
  align-items: center;
}

.connection-title {
  font-weight: 500;
  margin-right: 12px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 键列表区域 */
.keys-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-box {
  padding: 12px 16px;
  background-color: var(--background-color);
  border-bottom: 1px solid var(--border-color-base);
  display: flex;
  gap: 8px;
}

.search-box .el-input {
  flex: 1;
}

.keys-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
}

.key-item {
  padding: 10px;
  margin-bottom: 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--border-color-light);
  background-color: var(--background-color);
}

.key-item:hover {
  background-color: var(--background-color-hover);
}

.key-item.active {
  border-color: var(--primary-color);
  background-color: rgba(64, 158, 255, 0.1);
}

.key-type {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  margin-right: 8px;
}

.key-type.type-string {
  background-color: #e6f7ff;
  color: #1890ff;
}

.key-type.type-list {
  background-color: #f6ffed;
  color: #52c41a;
}

.key-type.type-hash {
  background-color: #fff7e6;
  color: #fa8c16;
}

.key-type.type-set {
  background-color: #fff2f0;
  color: #ff4d4f;
}

.key-type.type-zset {
  background-color: #f9f0ff;
  color: #722ed1;
}

.key-name {
  flex: 1;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color-secondary);
}

/* 值详情区域 */
.value-section {
  height: 300px;
  background-color: var(--background-color);
  border-top: 1px solid var(--border-color-base);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.value-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color-base);
}

.value-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.value-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.value-content pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 状态栏 */
.status-bar {
  height: 32px;
  background-color: var(--background-color);
  border-top: 1px solid var(--border-color-base);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 24px;
  font-size: 12px;
  color: var(--text-color-secondary);
}

.status-item {
  display: flex;
  align-items: center;
}

.connected {
  color: var(--success-color);
}

.disconnected {
  color: var(--danger-color);
}

/* 暗黑主题适配 */
.dark .key-type.type-string {
  background-color: rgba(24, 144, 255, 0.2);
  color: #40a9ff;
}

.dark .key-type.type-list {
  background-color: rgba(82, 196, 26, 0.2);
  color: #73d13d;
}

.dark .key-type.type-hash {
  background-color: rgba(250, 140, 22, 0.2);
  color: #ffa940;
}

.dark .key-type.type-set {
  background-color: rgba(255, 77, 79, 0.2);
  color: #ff7875;
}

.dark .key-type.type-zset {
  background-color: rgba(114, 46, 209, 0.2);
  color: #9254de;
}

.dark .key-item.active {
  background-color: rgba(64, 158, 255, 0.15);
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--background-color-page);
}

::-webkit-scrollbar-thumb {
  background: var(--border-color-base);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-color-placeholder);
}
</style>