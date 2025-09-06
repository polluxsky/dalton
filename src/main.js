import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'

// 创建Vue应用实例
const app = createApp(App)

// 注册Element Plus组件库
app.use(ElementPlus)

// 挂载应用
app.mount('#app')