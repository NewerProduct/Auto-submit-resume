import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {},
    connectionTests: {} as {
      anonKey?: { success: boolean; error?: string };
      serviceKey?: { success: boolean; error?: string };
      ping?: { success: boolean; status?: number; statusText?: string; error?: string };
    }
  };

  // 检查环境变量
  diagnostics.environment = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    ENCRYPTION_KEY: !!process.env.ENCRYPTION_KEY,
  };

  try {
    // 测试不同的客户端配置
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // 测试1: 使用 anon key
    try {
      const client1 = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await client1.from('users').select('count').limit(1);
      diagnostics.connectionTests.anonKey = { success: !error, error: error?.message };
    } catch (err) {
      diagnostics.connectionTests.anonKey = { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      };
    }

    // 测试2: 使用 service role key
    try {
      const client2 = createClient(supabaseUrl, supabaseServiceKey);
      const { data, error } = await client2.from('users').select('count').limit(1);
      diagnostics.connectionTests.serviceKey = { success: !error, error: error?.message };
    } catch (err) {
      diagnostics.connectionTests.serviceKey = { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      };
    }

    // 测试3: 尝试简单的 ping
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });
      diagnostics.connectionTests.ping = { 
        success: response.ok, 
        status: response.status,
        statusText: response.statusText 
      };
    } catch (err) {
      diagnostics.connectionTests.ping = { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      };
    }

  } catch (err) {
    diagnostics.error = err instanceof Error ? err.message : 'Unknown error';
  }

  res.status(200).json(diagnostics);
}
