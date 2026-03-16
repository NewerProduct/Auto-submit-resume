-- 简历海投助手数据库初始化脚本
-- 适用于 Supabase PostgreSQL

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 简历表
CREATE TABLE IF NOT EXISTS resumes (
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
CREATE TABLE IF NOT EXISTS platform_accounts (
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
CREATE TABLE IF NOT EXISTS applications (
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
CREATE TABLE IF NOT EXISTS batch_deliveries (
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_platform ON applications(platform);
CREATE INDEX IF NOT EXISTS idx_applications_user_platform_job ON applications(user_id, platform, job_id);
CREATE INDEX IF NOT EXISTS idx_resumes_user_default ON resumes(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_accounts_user_platform ON platform_accounts(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_batch_deliveries_user_id ON batch_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_deliveries_status ON batch_deliveries(status);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表创建更新时间触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_accounts_updated_at BEFORE UPDATE ON platform_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建RLS (Row Level Security) 策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_deliveries ENABLE ROW LEVEL SECURITY;

-- 用户表RLS策略
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- 简历表RLS策略
CREATE POLICY "Users can view own resumes" ON resumes
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own resumes" ON resumes
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own resumes" ON resumes
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own resumes" ON resumes
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- 平台账户表RLS策略
CREATE POLICY "Users can view own platform accounts" ON platform_accounts
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own platform accounts" ON platform_accounts
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own platform accounts" ON platform_accounts
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own platform accounts" ON platform_accounts
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- 投递记录表RLS策略
CREATE POLICY "Users can view own applications" ON applications
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own applications" ON applications
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own applications" ON applications
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- 批量投递表RLS策略
CREATE POLICY "Users can view own batch deliveries" ON batch_deliveries
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own batch deliveries" ON batch_deliveries
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own batch deliveries" ON batch_deliveries
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- 创建一些有用的视图
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.phone,
    u.email,
    u.created_at,
    COUNT(DISTINCT r.id) as resume_count,
    COUNT(DISTINCT a.id) as application_count,
    COUNT(DISTINCT CASE WHEN a.status = 'submitted' THEN a.id END) as submitted_count,
    COUNT(DISTINCT CASE WHEN a.status = 'viewed' THEN a.id END) as viewed_count,
    COUNT(DISTINCT CASE WHEN a.status = 'rejected' THEN a.id END) as rejected_count
FROM users u
LEFT JOIN resumes r ON u.id = r.user_id
LEFT JOIN applications a ON u.id = a.user_id
GROUP BY u.id, u.phone, u.email, u.created_at;

-- 创建平台统计视图
CREATE OR REPLACE VIEW platform_stats AS
SELECT 
    platform,
    COUNT(*) as total_applications,
    COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_count,
    COUNT(CASE WHEN status = 'viewed' THEN 1 END) as viewed_count,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
    ROUND(COUNT(CASE WHEN status = 'submitted' THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate
FROM applications
GROUP BY platform;

-- 插入一些示例数据（可选）
-- 注意：在生产环境中应该删除这些示例数据

-- 示例用户（密码：123456）
INSERT INTO users (phone, email, password_hash) VALUES 
('13800138000', 'demo@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJw/2Ej7W')
ON CONFLICT (phone) DO NOTHING;

-- 创建一些有用的函数
CREATE OR REPLACE FUNCTION get_user_delivery_limits(user_id_param UUID, platform_param VARCHAR)
RETURNS TABLE(
    daily_limit INTEGER,
    used_today INTEGER,
    remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN platform_param = 'boss' THEN 100
            WHEN platform_param = 'zhilian' THEN 50
            WHEN platform_param = 'liepin' THEN 30
            ELSE 50
        END as daily_limit,
        COALESCE(
            (SELECT COUNT(*) 
             FROM applications 
             WHERE user_id = user_id_param 
               AND platform = platform_param 
               AND DATE(submitted_at) = CURRENT_DATE), 
            0
        ) as used_today,
        CASE 
            WHEN platform_param = 'boss' THEN 100 - COALESCE((SELECT COUNT(*) FROM applications WHERE user_id = user_id_param AND platform = platform_param AND DATE(submitted_at) = CURRENT_DATE), 0)
            WHEN platform_param = 'zhilian' THEN 50 - COALESCE((SELECT COUNT(*) FROM applications WHERE user_id = user_id_param AND platform = platform_param AND DATE(submitted_at) = CURRENT_DATE), 0)
            WHEN platform_param = 'liepin' THEN 30 - COALESCE((SELECT COUNT(*) FROM applications WHERE user_id = user_id_param AND platform = platform_param AND DATE(submitted_at) = CURRENT_DATE), 0)
            ELSE 50 - COALESCE((SELECT COUNT(*) FROM applications WHERE user_id = user_id_param AND platform = platform_param AND DATE(submitted_at) = CURRENT_DATE), 0)
        END as remaining;
END;
$$ LANGUAGE plpgsql;

-- 创建清理过期数据的函数
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- 删除过期的平台账户绑定
    DELETE FROM platform_accounts 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    -- 删除30天前的批量投递记录（已完成或失败的）
    DELETE FROM batch_deliveries 
    WHERE status IN ('completed', 'failed') 
      AND completed_at < NOW() - INTERVAL '30 days';
    
    -- 可选：删除90天前的投递记录
    -- DELETE FROM applications 
    -- WHERE submitted_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- 创建定时清理任务（需要pg_cron扩展）
-- SELECT cron.schedule('cleanup-expired-data', '0 2 * * *', 'SELECT cleanup_expired_data();');

COMMENT ON TABLE users IS '用户表';
COMMENT ON TABLE resumes IS '简历表';
COMMENT ON TABLE platform_accounts IS '平台账户绑定表';
COMMENT ON TABLE applications IS '投递记录表';
COMMENT ON TABLE batch_deliveries IS '批量投递表';

COMMENT ON COLUMN users.phone IS '手机号，用于登录';
COMMENT ON COLUMN users.email IS '邮箱地址';
COMMENT ON COLUMN users.password_hash IS '密码哈希值';
COMMENT ON COLUMN resumes.parsed_data IS '简历解析后的JSON数据';
COMMENT ON COLUMN resumes.is_default IS '是否为默认简历';
COMMENT ON COLUMN platform_accounts.auth_cookie IS '平台认证Cookie';
COMMENT ON COLUMN platform_accounts.expires_at IS '认证过期时间';
COMMENT ON COLUMN applications.status IS '投递状态：pending-待处理，submitted-已投递，viewed-已查看，rejected-已拒绝';
COMMENT ON COLUMN batch_deliveries.strategy IS '投递策略JSON配置';
