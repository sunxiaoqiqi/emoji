# WeMoji Maker - AI 表情包制作工具

一个强大的微信表情包制作工具，支持AI生成和切图导入两种模式。

## 功能特性

- 🤖 **AI生成模式**：使用 Gemini API 自动生成表情包
- ✂️ **切图模式**：上传图片，自动切割成多个表情
- 🎨 **内置编辑器**：支持魔棒抠图、橡皮擦、文字添加等功能
- 🎭 **多种字体**：内置10+种好看好玩的字体，轻松更换
- ⚙️ **本地设置**：API密钥保存在浏览器本地，安全可靠
- 📦 **一键打包**：自动生成微信表情包格式的ZIP文件

## 快速开始

### 方式一：直接使用构建版本（推荐）

1. 下载项目后，进入项目目录
2. 安装依赖：
   ```bash
   npm install
   ```
3. 构建项目：
   ```bash
   npm run build
   ```
4. 构建完成后，打开 `dist/index.html` 文件即可使用
   - 可以直接双击 `dist/index.html` 在浏览器中打开
   - 或者使用本地服务器：`npm run preview`

### 方式二：开发模式

1. 安装依赖：
   ```bash
   npm install
   ```
2. 启动开发服务器：
   ```bash
   npm run dev
   ```
3. 浏览器访问 `http://localhost:3000`

## 使用说明

### 设置 API 密钥

1. 点击右上角的设置图标（⚙️）
2. 在设置页面输入您的 Gemini API Key
3. 点击"保存"按钮
4. API密钥会保存在浏览器本地，不会上传到任何服务器

**如何获取 API Key：**
1. 访问 [Google AI Studio](https://aistudio.google.com/apikey)
2. 登录您的 Google 账号
3. 点击 "Create API Key" 创建新的密钥
4. 复制密钥并粘贴到设置页面

### AI 生成模式

1. 切换到"AI 生成"模式
2. 输入角色描述（例如：一只吃竹子的可爱熊猫）
3. 选择艺术风格（扁平/3D立体/手绘）
4. 添加表情文案列表
5. 点击"生成全部"按钮
6. 等待生成完成后，可以编辑单个表情或重新生成
7. 点击"打包下载"导出为ZIP文件

### 切图模式

1. 切换到"切图制作"模式
2. 点击"导入切图"按钮
3. 上传一张包含多个表情的图片
4. 设置行数和列数
5. 拖拽调整图片位置和缩放
6. 点击"切割并导入"完成

### 编辑表情

- 点击任意表情卡片，打开编辑器
- **移动/缩放工具**：拖拽移动图片，滚动缩放
- **魔棒工具**：点击颜色区域去除背景
- **橡皮擦工具**：拖拽擦除不需要的部分
- **文字工具**：添加文字，支持多种字体和样式

### 字体选择

在文字编辑器中，可以选择以下字体：
- 默认黑体
- 快乐体
- 毛笔书法
- 可爱圆体
- 手写体
- 创意体
- 粗体
- 优雅体
- 科技体
- Arial

## 项目结构

```
wemoji-maker/
├── components/          # React 组件
│   ├── ImageEditor.tsx # 图片编辑器
│   ├── GridImporter.tsx # 切图导入器
│   └── SettingsModal.tsx # 设置模态框
├── services/           # 服务层
│   └── geminiService.ts # Gemini API 服务
├── utils/              # 工具函数
│   └── imageProcessor.ts # 图片处理工具
├── App.tsx            # 主应用组件
├── constants.ts       # 常量定义
├── types.ts           # TypeScript 类型定义
└── index.html         # HTML 入口文件
```

## 技术栈

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Google Gemini API
- JSZip

## 注意事项

1. **API密钥安全**：API密钥仅保存在浏览器本地，不会上传到任何服务器
2. **网络要求**：首次使用需要网络连接来加载字体和样式（Tailwind CSS）
3. **浏览器兼容性**：建议使用 Chrome、Edge 或 Firefox 最新版本
4. **文件大小**：生成的表情包会自动优化为 240x240px 透明 PNG 格式

## 许可证

MIT License
