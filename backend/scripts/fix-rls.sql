-- 修复 RLS 策略，允许服务端操作
-- 这个脚本需要在 Supabase SQL 编辑器中运行

-- 禁用用户表的 RLS，允许服务端注册用户
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 或者创建允许服务端操作的政策
-- 如果需要保持 RLS 启用，请运行以下语句：

-- 删除现有的用户表 RLS 策略
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- 创建新的策略，允许服务端操作（使用 service_role key）
CREATE POLICY "Allow anonymous reads for user operations" ON users
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous inserts for user registration" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow users to update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);
