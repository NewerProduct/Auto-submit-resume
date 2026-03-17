# 简历海投助手 - 前端应用

这是简历海投助手的前端应用，基于 Next.js 14 开发，提供用户友好的简历批量投递功能。

## 功能特性

- 🔐 **用户认证** - 手机号注册登录
- 📄 **简历管理** - 上传、预览、设置默认简历
- 🔗 **平台对接** - 支持 Boss直聘等招聘平台绑定
- 🔍 **岗位搜索** - 智能搜索和筛选合适岗位
- 📤 **批量投递** - 一键批量投递简历
- 📊 **数据统计** - 投递历史和成功率统计
- 📱 **响应式设计** - 完美适配桌面端和移动端

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI组件**: Headless UI + Heroicons
- **状态管理**: React Context
- **认证**: NextAuth.js
- **部署**: Vercel

## 项目结构

```
frontend/
├── src/
│   ├── app/                 # Next.js App Router 页面
│   │   ├── dashboard/       # 仪表板页面
│   │   ├── login/          # 登录页面
│   │   ├── register/       # 注册页面
│   │   └── page.tsx        # 首页
│   ├── components/          # React 组件
│   │   ├── ui/             # 基础 UI 组件
│   │   └── layout/         # 布局组件
│   ├── contexts/           # React Context
│   ├── lib/               # 工具库和 API
│   └── types/             # TypeScript 类型定义
├── public/                # 静态资源
└── package.json
```

## 环境要求

- Node.js >= 20.9.0
- npm >= 9.0.0

## 快速开始

1. 安装依赖：
```bash
npm install
```

2. 配置环境变量：
```bash
cp .env.local.example .env.local
```

编辑 `.env.local` 文件，配置以下变量：
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

3. 启动开发服务器：
```bash
npm run dev
```

4. 打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 构建部署

1. 构建生产版本：
```bash
npm run build
```

2. 启动生产服务器：
```bash
npm start
```

### Vercel 部署

本项目专为 Vercel 部署优化：

1. 推送代码到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 自动部署

## 主要页面

- **首页** (`/`) - 产品介绍和快速入口
- **登录** (`/login`) - 用户登录
- **注册** (`/register`) - 用户注册
- **仪表板** (`/dashboard`) - 数据概览和快速操作
- **简历管理** (`/dashboard/resumes`) - 简历上传和管理
- **平台对接** (`/dashboard/platforms`) - 招聘平台账户绑定
- **岗位搜索** (`/dashboard/jobs`) - 搜索和批量投递
- **投递历史** (`/dashboard/history`) - 投递记录和统计

## API 接口

前端通过 `/api` 路径与后端通信，主要接口包括：

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/signin` - 用户登录
- `GET /api/resumes` - 获取简历列表
- `POST /api/resumes/upload` - 上传简历
- `POST /api/platforms/bind` - 绑定平台账户
- `GET /api/platforms/:platform/jobs` - 获取岗位列表
- `POST /api/applications/batch` - 批量投递
- `GET /api/applications/history` - 投递历史

## 开发规范

### 代码风格
- 使用 TypeScript 严格模式
- 遵循 ESLint 和 Prettier 配置
- 组件名使用 PascalCase
- 函数名使用 camelCase

### 提交规范
- feat: 新功能
- fix: 修复问题
- docs: 文档更新
- style: 代码格式调整
- refactor: 代码重构
- test: 测试相关

## 性能优化

- 使用 Next.js 自动代码分割
- 图片优化和懒加载
- 响应式设计减少移动端流量
- 组件懒加载
- API 请求缓存

## 浏览器支持

- Chrome >= 88
- Firefox >= 85
- Safari >= 14
- Edge >= 88

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。
