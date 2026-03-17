import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 处理 OPTIONS 请求 (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_URL: process.env.VERCEL_URL,
      },
      database: {
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
        SUPABASE_URL: process.env.SUPABASE_URL || 'MISSING',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? `EXISTS (${process.env.SUPABASE_ANON_KEY.length} chars)` : 'MISSING',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? `EXISTS (${process.env.SUPABASE_SERVICE_ROLE_KEY.length} chars)` : 'MISSING',
      },
      auth: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'MISSING',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? `EXISTS (${process.env.NEXTAUTH_SECRET.length} chars)` : 'MISSING',
      },
      connectivity: {
        canReachSupabase: false,
        supabaseError: null as string | null,
      }
    };

    // 测试Supabase连接
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      try {
        const testUrl = `${process.env.SUPABASE_URL}/rest/v1/`;
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'apikey': process.env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
            'Accept': 'application/json'
          }
        });
        
        diagnostics.connectivity.canReachSupabase = response.ok;
        diagnostics.connectivity.supabaseError = response.ok ? null : `HTTP ${response.status}: ${response.statusText}`;
      } catch (error) {
        diagnostics.connectivity.supabaseError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // 检查关键问题
    const issues = [];
    
    if (!process.env.DATABASE_URL) {
      issues.push('DATABASE_URL 未设置');
    }
    
    if (!process.env.SUPABASE_URL) {
      issues.push('SUPABASE_URL 未设置');
    }
    
    if (!process.env.SUPABASE_ANON_KEY) {
      issues.push('SUPABASE_ANON_KEY 未设置');
    }
    
    if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
      issues.push('NEXTAUTH_SECRET 未设置或长度不足32字符');
    }
    
    if (!diagnostics.connectivity.canReachSupabase) {
      issues.push(`无法连接到Supabase: ${diagnostics.connectivity.supabaseError}`);
    }

    const status = issues.length === 0 ? 'healthy' : 'error';

    res.status(200).json({
      status,
      diagnostics,
      issues,
      recommendations: issues.length > 0 ? [
        '检查Vercel项目环境变量配置',
        '确保Supabase项目正常运行',
        '验证数据库连接字符串格式',
        '检查API密钥权限'
      ] : []
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
