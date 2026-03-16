# 简历海投助手后端API

基于 Next.js 14 + TypeScript + Supabase + Vercel 的简历批量投递工具后端服务。

## 技术栈

- **框架**: Next.js 14 (API Routes)
- **语言**: TypeScript
- **数据库**: Supabase (PostgreSQL)
- **缓存**: Vercel KV (Redis)
- **文件存储**: Vercel Blob
- **认证**: NextAuth.js
- **部署**: Vercel Serverless Functions

## 项目结构

```
backend/
├── pages/api/                    # API路由
│   ├── auth/                     # 认证相关
│   ├── resumes/                  # 简历管理
│   ├── platforms/                # 平台对接
│   ├── applications/             # 投递管理
│   ├── settings/                 # 系统配置
│   ├── system/                   # 系统状态
│   ├── export/                   # 数据导出
│   └── webhooks/                 # Webhook回调
├── src/
│   ├── lib/                      # 工具库
│   │   ├── db.ts                 # 数据库操作
│   │   ├── kv.ts                 # 缓存操作
│   │   ├── auth.ts               # 认证服务
│   │   ├── upload.ts             # 文件上传
│   │   ├── resume-parser.ts      # 简历解析
│   │   ├── delivery-service.ts   # 投递服务
│   │   └── platforms/            # 平台对接
│   │       └── boss.ts           # Boss直聘
│   ├── middleware/               # 中间件
│   │   ├── auth.ts               # 认证中间件
│   │   ├── rate-limit.ts         # 频率限制
│   │   ├── error-handler.ts      # 错误处理
│   │   └── validation.ts         # 参数验证
│   └── types/                    # 类型定义
│       └── index.ts
├── .env.local.example            # 环境变量示例
├── package.json                  # 依赖配置
├── tsconfig.json                 # TypeScript配置
├── next.config.js                # Next.js配置
└── vercel.json                   # Vercel部署配置
```

## 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone <repository-url>
cd backend

# 安装依赖
npm install
```

### 2. 环境变量配置

复制 `.env.local.example` 为 `.env.local` 并配置以下变量：

```bash
# 数据库配置 (Supabase)
DATABASE_URL=postgresql://username:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# NextAuth.js 配置
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-key

# Vercel KV (Redis) 配置
VERCEL_KV_URL=your-kv-url
VERCEL_KV_REST_API_TOKEN=your-kv-token
VERCEL_KV_REST_API_URL=your-kv-rest-url

# Vercel Blob 配置
BLOB_READ_WRITE_TOKEN=your-blob-read-write-token

# 加密配置
ENCRYPTION_KEY=your-32-character-encryption-key

# Boss直聘配置
BOSS_API_BASE_URL=https://www.zhipin.com
BOSS_USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36

# 应用配置
NODE_ENV=development
APP_VERSION=1.0.0
```

### 3. 数据库初始化

在 Supabase 中创建以下表结构：

```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 简历表
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    content TEXT,
    parsed_data JSONB,
    is_default BOOLEAN DEFAULT FALSE,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 平台账户绑定表
CREATE TABLE platform_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('boss', 'zhilian', 'liepin')),
    platform_user_id VARCHAR(100),
    auth_token TEXT,
    auth_cookie TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 投递记录表
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    job_id VARCHAR(100) NOT NULL,
    job_title VARCHAR(255),
    company_name VARCHAR(255),
    location VARCHAR(255),
    salary VARCHAR(255),
    salary_min INTEGER,
    salary_max INTEGER,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'viewed', 'rejected')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (platform, job_id)
);

-- 批量投递表
CREATE TABLE batch_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    job_ids TEXT[] NOT NULL,
    strategy JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
    total_jobs INTEGER NOT NULL,
    completed_jobs INTEGER DEFAULT 0,
    failed_jobs INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 索引
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_applications_user_status ON applications(user_id, status);
CREATE INDEX idx_applications_platform ON applications(platform);
CREATE INDEX idx_resumes_user_default ON resumes(user_id, is_default);
CREATE INDEX idx_platform_accounts_user_platform ON platform_accounts(user_id, platform);
```

### 4. 本地开发

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 5. 构建部署

```bash
# 构建项目
npm run build

# 启动生产服务器
npm start
```

## API文档

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/signin` - 用户登录
- `GET /api/auth/me` - 获取用户信息
- `POST /api/auth/change-password` - 修改密码

### 简历管理

- `POST /api/resumes/upload` - 上传简历
- `GET /api/resumes` - 获取简历列表
- `GET /api/resumes/[id]` - 获取简历详情
- `PUT /api/resumes/[id]` - 更新简历
- `DELETE /api/resumes/[id]` - 删除简历
- `PUT /api/resumes/[id]/default` - 设置默认简历

### 平台对接

- `POST /api/platforms/bind` - 绑定平台账户
- `GET /api/platforms/[platform]/status` - 获取绑定状态
- `DELETE /api/platforms/[platform]/unbind` - 解绑平台账户
- `GET /api/platforms/[platform]/jobs` - 获取岗位列表

### 投递管理

- `POST /api/applications/batch` - 批量投递
- `GET /api/applications/[batchId]/status` - 获取投递状态
- `POST /api/applications/[batchId]/cancel` - 取消投递
- `GET /api/applications/history` - 获取投递历史
- `GET /api/applications/stats` - 获取投递统计

### 系统配置

- `GET /api/settings/delivery` - 获取投递配置
- `PUT /api/settings/delivery` - 更新投递配置
- `GET /api/system/status` - 获取系统状态

### 数据导出

- `GET /api/export/applications` - 导出投递记录

### Webhook

- `POST /api/webhooks/application-status` - 投递状态回调

## 🚀 部署到Vercel

### 快速部署

1. **安装 Vercel CLI**
```bash
npm i -g vercel
```

2. **登录 Vercel**
```bash
vercel login
```

3. **配置环境变量**
```bash
# 检查环境变量
node check-env.js

# 或手动配置 .env.local
cp .env.local.example .env.local
```

4. **一键部署**
```bash
# Windows
deploy.bat

# Linux/Mac  
./deploy.sh

# 或手动部署
npm run build
vercel --prod
```

### 环境变量配置

**必需变量**:
```bash
DATABASE_URL=postgresql://username:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your-32-character-secret
ENCRYPTION_KEY=your-32-character-key
```

**可选变量**:
```bash
VERCEL_KV_URL=redis://username:password@host:port
VERCEL_KV_REST_API_TOKEN=your-kv-token
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_token
BOSS_API_BASE_URL=https://www.zhipin.com
```

### 数据库初始化

1. 创建 [Supabase](https://supabase.com) 项目
2. 运行 `scripts/setup-database.sql` 脚本
3. 配置数据库连接字符串

📖 详细部署指南请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 安全考虑

- 所有API都需要用户认证
- 实现了频率限制机制
- 敏感数据加密存储
- 输入参数严格验证
- 错误信息脱敏处理

## 监控和日志

- 实现了完整的错误处理机制
- 支持结构化日志输出
- 可集成外部监控服务

## 开发规范

- 使用TypeScript严格模式
- 遵循ESLint和Prettier规范
- 编写单元测试
- 使用语义化版本控制

## 许可证

MIT License
