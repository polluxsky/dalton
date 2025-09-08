// 直接启动Electron并加载修改后的代码
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 确保dist目录存在
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ dist目录不存在，无法启动应用');
  process.exit(1);
}

// 检查HTML文件是否存在
const htmlPath = path.join(distPath, 'index.html');
if (!fs.existsSync(htmlPath)) {
  console.error('❌ HTML文件不存在:', htmlPath);
  process.exit(1);
}

console.log('✅ 检测到dist目录和HTML文件');

// 安装必要的依赖
try {
  require('electron');
  console.log('✅ Electron已安装');
} catch (e) {
  console.log('⚠️ Electron未安装，尝试全局安装兼容当前Node.js版本的旧版...');
  // 安装与Node.js v12.14.1兼容的Electron版本
  const installElectron = spawn('npm', ['install', '-g', 'electron@22.0.0'], {
    stdio: 'inherit',
    shell: true
  });
  
  installElectron.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Electron安装成功，正在启动应用...');
      startElectronApp();
    } else {
      console.error('❌ Electron安装失败，请手动安装: npm install -g electron');
      process.exit(1);
    }
  });
  
  return;
}

// 启动Electron应用
function startElectronApp() {
  console.log('🚀 正在启动Electron应用...');
  
  // 设置环境变量，强制使用开发模式加载本地文件
  process.env.NODE_ENV = 'production';
  
  const electronProcess = spawn('electron', ['.'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      // 确保我们的修改被加载
      ELECTRON_START_URL: `file://${htmlPath}`
    }
  });
  
  electronProcess.on('close', (code) => {
    console.log(`Electron应用已关闭，退出码: ${code}`);
  });
}

// 运行应用
startElectronApp();