# Dalton - Redis客户端

一个基于Vue 3和Electron的Redis桌面客户端，完全模拟Another-Redis-Desktop-Manager的功能。

## 功能特性

- 支持多Redis连接管理
- 可视化查看和编辑Redis键值
- 支持多种数据类型：String、List、Hash、Set、ZSet
- 支持数据库切换和键搜索
- 支持明亮/黑暗主题切换
- 跨平台支持（macOS、Windows）

## 技术栈

- Vue 3
- Electron
- Element Plus
- Vite

## 开发环境准备

### 安装依赖

```bash
npm install
```

### 开发模式

启动Electron开发模式：

```bash
npm run electron:dev
```

## 构建应用

### 构建用于生产环境的应用

```bash
npm run electron:build
```

### 生成安装包

```bash
npm run electron:package
```

这将生成适用于macOS的dmg安装包和Windows的msi安装包。

## 目录结构

```
├── electron/           # Electron相关代码
│   ├── main/           # 主进程代码
│   └── preload/        # 预加载脚本
├── public/             # 静态资源
│   └── icons/          # 应用图标
├── src/                # Vue源代码
│   ├── main.js         # Vue应用入口
│   └── App.vue         # 根组件
├── index.html          # HTML入口文件
├── package.json        # 项目配置和依赖
├── vite.config.js      # Vite配置
└── electron-vite.config.js  # Electron Vite配置
```

## 开发者信息

- 开发者：Pollux.Qu
- 版本：0.0.1

## 许可证

MIT