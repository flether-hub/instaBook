InstaBook Builder (AI 智能写书平台)

本项目是一个利用 AI 大语言模型自动从一句话要求，生成一整本带有章节和排版小说的在线全栈应用程序。
它支持直接生成精美的类似真实纸质书排版效果的页面，并支持导出免排版的 PDF 以及 EPUB 格式电子书。

该应用程序的前两部分功能是“Web端应用”与“Serverless 函数后端”，无缝兼容 Cloudflare Pages 与 Cloudflare Pages Functions 环境。

## 目录结构与核心代码文件说明

为了方便在 GitHub 上开源以及让开发者二次开发，下面详细解释项目中各个源码文件及其具体作用。

### 1. 前端（React + Vite）
前端代码主要存放在 `src/` 目录下：

- **`src/main.tsx`**
  React 前端应用的入口文件。它负责挂载 React 根节点并渲染整个应用，引入全局的 Tailwind CSS 样式文件（`index.css`）。

- **`src/App.tsx`** 
  整个应用的主页面组件。这里包含了大量的核心控制逻辑，包括：
  - 用户的操作交互（输入提示词、书籍主题配置、设置界面）。
  - 连接 AI 大模型 API 以串行执行大纲生成和逐章生成的功能。
  - PDF 导出、保存、重新生成的控制状态管理。
  - Web 页面的在线渲染、分上下册/页码的精确计算、书籍动态版式预览的主入口。

- **`src/index.css`** 
  存放基于 Tailwind 的全局样式，包括用于页面打断的打印样式（`page-break`）、电子书在线预览模式和页面滚动等特定的响应式 CSS 配置。

- **`src/components/` (UI 组件)**
  - **`BookCover.tsx`**: 生成书籍横幅/封面的组件。
  - **`BookContent.tsx`**: 基本的文章内容展示组件，主要负责呈现通过 AI 返回 Markdown 文本的无分页完整段落形式。
  - **`PaginatedSection.tsx`**: 这个是很重要的核心组件，专门用于处理并展示类似真实纸质书的**分页效果**，包括引言、生成小说的正文排版，并在页面底部或者旁边展示页眉、页脚和计算出来的准确页码。

- **`src/lib/` (功能与工具库)**
  - **`api.ts`**: 前端请求到后端的核心 API 库。实现了生成大纲 (`generateBookOutline`)、生成内容 (`generateChapterContent`) 和连接测试（`testConnection`）的封装逻辑。其中对 AI 输出的 JSON 或 Markdown 会进行拦截处理和清洗。
  - **`epub.ts`**: 基于前端的 JSZip 在浏览器内原生地动态生成 `.epub` 纯文本电子书并下载。
  - **`qwen.ts`**: （或其余兼容库）早期集成的一些针对不同模型适配的前端通用模型接口规范包装。

### 2. 后端（Cloudflare Pages Functions）
后端代码主要存放在 `functions/api/` 目录下，部署在 Cloudflare 时，这部分会自动编译为服务端无服务器函数。

- **`functions/api/generate.ts`**
  AI 模型转发中枢。前端会将提示词交给该接口，接口会去环境变量中读取 `QWEN_API_KEY` 或 `ALIYUN_API_KEY` 并且调用对应的兼容 OpenAI API 的在线大模型生成返回流式文本 (Server-Sent Events) 到前端。由于是在服务端请求，可以非常安全地保护 API 密钥不被泄露给客户端浏览器。
  
- **`functions/api/login.ts`**
  极其简单轻量的登陆凭证校验模块。前端提交用户填写的密码给这个 API，它校验一下是否和服务器内部设置的环境变量 `ADMIN_PASSWORD` 匹配，匹配则返回成功放行。

- **`functions/api/test-key.ts`**
  用于界面里“测试不同模型 API 接口连接性”的小型测试辅助路由（校验 API 连通可用性与密钥正确性）。

### 3. 项目配置
- **`vite.config.ts`**: Vite 打包配置文件，预设了 React 和 Tailwind 插件，打包输出在 `dist` 目录。
- **`.env.example` / `server.ts`**: 本地调试开发环境提供的一些 Express 服务端兼容中间件。
- **`package.json`**: NPM 包依赖描述，包括 React核心依赖（`lucide-react`, `jspdf`, `file-saver`, `jszip`，`html-to-image` 等）。

---

## 平台功能特点

- **AI 智能大纲与章节策划**：输入书籍主题、作者，一键生成详细大纲目录。
- **自动化全书生成与追踪**：实时逐章生成小说内容，动态追踪估算的页码信息。
- **高还原度的模拟排版**：页面利用 React 在线渲染模拟实体书质感、双栏布局和仿真页码。
- **高级导出机制**：一键在浏览器端合并打包全书生成 PDF 及构建 EPUB。
- **私密访问控制**：支持管理员密码校验（通过简单的后台接口和 sessionStorage 保护访问）。

## 在 Cloudflare Pages + Functions 上的部署步骤详述

本项目使用 React + Vite 构建，后端采用 Cloudflare Pages Functions（即根目录中 `/functions` 文件夹）。部署至 Cloudflare 上的步骤如下：

### 1. 准备代码仓库
请确认你已将整个项目文件（包含 `package.json`, `src/`, `functions/` 目录）推送到你的 GitHub 或 GitLab 仓库。

### 2. 在 Cloudflare Dashboard 创建项目
1. 登录 Cloudflare（https://dash.cloudflare.com/）。
2. 在左侧边栏找到并点击 **Workers & Pages**。
3. 点击 **Pages** 选项卡中的“Create (创建 / 连接至 Git)”，选择相应的代码仓库，允许 Cloudflare 拉取你的代码。

### 3. 配置构建和部署 (Build Settings)
在部署设置面板中，按照以下参数进行配置：

- **Framework preset (框架预设)**: 选择 `None` 或 `Vite`。
- **Build command (构建命令)**: `npm run build`
- **Build output directory (输出目录)**: `dist`

推荐在下面的环境变量 (Environment variables) 设置中，添加 `NODE_VERSION` = `20` 或更高版本，以确保使用最新的 Node 环境打包前端。

### 4. 设置运行时环境变量 (Environment Variables)
我们的 Cloudflare Functions 后端代码依赖于几个核心环境变量运行，请务必在“部署界面”或项目部署后的“Settings (设置) -> Environment variables”中，设置以下变量并将配置存为加密（Encrypt）或纯文本格式：

- `QWEN_API_KEY` 或 `ALIYUN_API_KEY`：填入你的大模型 API 密钥。建议配合使用阿里云百炼平台的高性价比模型（例如通义千问等）。
- `API_BASE_URL`：（可选）如果你使用的是第三方的 API 兼容网关，可以填入请求的基础 URL。（默认为阿里云百炼网关）
- `ADMIN_PASSWORD`：填入你自设的一个访问密码，用于网站界面的统一准入控制拦截。不设置则自动跳过验证。

（注：系统自动读取这些环境变量并在服务端的 Functions / Node backend 内部使用，API 密钥绝不会泄露给前端，保障安全。）

### 5. 开始部署
1. 点击并确认 **Save and Deploy**（保存并部署）。
2. Pages 会自动执行构建。只需约一两分钟时间，打包完成后，系统会为你生成一个包含 `pages.dev` 的预览链接。
3. 在浏览器中打开并访问你的网站。首次进入若设置了密码，会弹出访问密码的输入框，输入你在环境中配置的 `ADMIN_PASSWORD` ，开始创作吧！

若要绑定你自己的域名，可以在站点的 **Custom domains (自定义域)** 这里操作，由 CF 提供全自动免费 SSL 证书及内容分发缓存加速功能。
