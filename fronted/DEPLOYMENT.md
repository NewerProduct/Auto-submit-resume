# Vercel 部署指南

## 前置条件
- 项目已推送到 GitHub 仓库
- 后端已部署完成，获取到后端 API 地址

## 部署步骤

### 1. 推送代码到 GitHub

```bash
# 添加所有更改
git add .

# 提交更改
git commit -m "fix: 修复 TypeScript 类型错误，准备部署到 Vercel"

# 推送到 GitHub
git push origin main
```

### 2. 在 Vercel 中导入项目

1. 访问 [Vercel 官网](https://vercel.com)
2. 使用 GitHub 账号登录
3. 点击 "Add New..." → "Project"
4. 选择你的 GitHub 仓库
5. 选择 `frontend` 目录作为根目录

### 3. 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.vercel.app/api
NEXTAUTH_URL=https://your-frontend-url.vercel.app
NEXTAUTH_SECRET=your-secret-key-here
```

**重要说明：**
- `NEXT_PUBLIC_API_URL`: 替换为你的后端实际部署地址
- `NEXTAUTH_URL`: 部署后会自动生成，也可以手动设置
- `NEXTAUTH_SECRET`: 生成一个随机字符串，可以用以下命令生成：
  ```bash
  openssl rand -base64 32
  ```

### 4. 部署配置

Vercel 会自动检测到 Next.js 项目并使用以下配置：

- **构建命令**: `npm run build`
- **输出目录**: `.next`
- **安装命令**: `npm install`

### 5. 部署

点击 "Deploy" 按钮开始部署。Vercel 会：
1. 安装依赖
2. 构建项目
3. 部署到全球 CDN

### 6. 验证部署

部署完成后：
1. 访问生成的 URL 检查网站是否正常运行
2. 测试登录、注册等核心功能
3. 检查与后端的 API 连接是否正常

## 常见问题

### Q: 构建失败怎么办？
A: 检查以下几点：
- 确保所有依赖都在 `package.json` 中
- 检查 TypeScript 错误
- 确认环境变量设置正确

### Q: API 请求失败？
A: 确保：
- `NEXT_PUBLIC_API_URL` 设置正确
- 后端已正确部署并可访问
- CORS 配置正确

### Q: 登录功能不工作？
A: 检查：
- `NEXTAUTH_URL` 和 `NEXTAUTH_SECRET` 是否设置
- 后端的认证接口是否正常

## 自动部署

设置完成后，每次推送代码到 GitHub 主分支，Vercel 会自动重新部署。

## 性能优化

本项目已配置：
- 自动代码分割
- 图片优化
- 静态页面预渲染
- 全球 CDN 加速

## 监控

在 Vercel 控制台可以查看：
- 访问统计
- 性能指标
- 错误日志
- 构建历史
