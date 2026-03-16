# Vercel 部署指南

## 🚀 快速部署到Vercel

### 前置条件

1. **Vercel账号**: 注册 [Vercel](https://vercel.com) 账号
2. **GitHub账号**: 将代码推送到GitHub仓库
3. **Supabase项目**: 创建Supabase数据库项目
4. **Vercel KV**: 创建Redis缓存（可选）

---

## 📋 部署步骤

### 1. 推送代码到GitHub

```bash
# 初始化Git仓库
git init
git add .
git commit -m "Initial commit: HelpYouJob Backend API"

# 推送到GitHub
git branch -M main
git remote add origin https://github.com/yourusername/helpyoujob-backend.git
git push -u origin main
```

### 2. 连接Vercel到GitHub

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "New Project"
3. 导入GitHub仓库 `helpyoujob-backend`
4. 选择 "Next.js" 框架

### 3. 配置环境变量

在Vercel项目设置中添加以下环境变量：

#### 🔑 必需的环境变量

```bash
# 数据库配置
DATABASE_URL=postgresql://username:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# NextAuth.js配置
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-key-at-least-32-characters

# 加密配置
ENCRYPTION_KEY=your-32-character-encryption-key
```

#### 🔧 可选的环境变量

```bash
# Vercel KV (Redis) - 用于缓存和频率限制
VERCEL_KV_URL=your-kv-url
VERCEL_KV_REST_API_TOKEN=your-kv-token
VERCEL_KV_REST_API_URL=your-kv-rest-url

# Vercel Blob - 用于文件存储
BLOB_READ_WRITE_TOKEN=your-blob-read-write-token

# Boss直聘配置
BOSS_API_BASE_URL=https://www.zhipin.com
BOSS_USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36

# 应用配置
NODE_ENV=production
APP_NAME=HelpYouJob
APP_VERSION=1.0.0
```

### 4. 配置数据库

#### 4.1 创建Supabase项目

1. 访问 [Supabase](https://supabase.com)
2. 创建新项目
3. 获取项目URL和API密钥

#### 4.2 初始化数据库表

在Supabase SQL编辑器中运行 `scripts/setup-database.sql` 中的SQL脚本：

```sql
-- 创建用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ... 其他表结构
```

### 5. 配置Vercel KV (可选但推荐)

#### 5.1 创建KV存储

1. 在Vercel项目中点击 "Storage"
2. 创建新的KV数据库
3. 获取连接信息

#### 5.2 配置环境变量

```bash
VERCEL_KV_URL=redis://username:password@host:port
VERCEL_KV_REST_API_TOKEN=your-kv-token
VERCEL_KV_REST_API_URL=https://your-kv-url
```

### 6. 配置Vercel Blob (可选)

#### 6.1 创建Blob存储

1. 在Vercel项目中点击 "Storage"
2. 创建新的Blob存储
3. 获取读写令牌

#### 6.2 配置环境变量

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_your-token
```

### 7. 部署配置

项目已包含 `vercel.json` 配置文件，包含：

- **构建配置**: Next.js自动构建
- **函数超时**: API路由30-60秒超时
- **区域部署**: 新加坡区域 (sin1)
- **定时任务**: 每日2点清理过期数据

### 8. 部署项目

1. 点击 "Deploy" 按钮
2. 等待构建完成
3. 测试部署的API

---

## 🧪 部署后测试

### 基础测试

```bash
# 测试健康检查
curl https://your-app-name.vercel.app/api/auth/me

# 测试用户注册
curl -X POST https://your-app-name.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"123456","email":"test@example.com"}'
```

### API文档测试

参考 `接口设计文档.md` 中的完整API列表进行测试。

---

## 🔧 故障排除

### 常见问题

#### 1. 构建失败
- 检查环境变量是否正确配置
- 确认所有依赖包版本兼容

#### 2. 数据库连接失败
- 验证Supabase URL和密钥
- 检查数据库表是否创建

#### 3. 认证失败
- 确保 `NEXTAUTH_SECRET` 至少32字符
- 检查 `NEXTAUTH_URL` 是否正确

#### 4. 文件上传失败
- 配置Vercel Blob存储
- 检查文件大小限制

### 调试方法

1. **查看构建日志**: 在Vercel Dashboard查看详细日志
2. **函数日志**: 查看API函数执行日志
3. **环境变量检查**: 确认所有必需变量已配置

---

## 📊 监控和维护

### 性能监控

- Vercel Analytics: 访问量和使用统计
- Supabase Dashboard: 数据库性能
- Vercel Logs: 错误日志和调试信息

### 定期维护

1. **数据库备份**: 定期备份Supabase数据
2. **依赖更新**: 定期更新npm包
3. **安全检查**: 定期检查安全漏洞

---

## 🚀 生产环境优化

### 性能优化

1. **启用缓存**: 使用Vercel KV缓存频繁访问的数据
2. **数据库优化**: 添加适当的数据库索引
3. **CDN配置**: Vercel自动提供全球CDN

### 安全增强

1. **环境变量安全**: 使用Vercel的环境变量加密
2. **API限流**: 已内置频率限制机制
3. **数据验证**: 所有API输入都经过严格验证

---

## 📞 支持和帮助

### 文档资源

- [Vercel文档](https://vercel.com/docs)
- [Supabase文档](https://supabase.com/docs)
- [Next.js文档](https://nextjs.org/docs)

### 联系支持

如遇到部署问题，可以：

1. 查看Vercel构建日志
2. 检查本文档的故障排除部分
3. 提交GitHub Issue

---

## 🎉 部署完成

部署成功后，你的后端API将在以下地址可用：

```
https://your-app-name.vercel.app
```

主要API端点：

- 用户认证: `/api/auth/*`
- 简历管理: `/api/resumes/*`
- 平台对接: `/api/platforms/*`
- 投递管理: `/api/applications/*`
- 系统配置: `/api/settings/*`

恭喜！你的简历海投助手后端API现在已经成功部署到Vercel！🎉
