import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as Array<{
      name: string;
      success: boolean;
      status?: number;
      statusText?: string;
      url?: string;
      error?: string;
      data?: any;
    }>
  };

  // 测试1: 基本连接测试
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    console.log('Testing URL:', supabaseUrl);
    
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || ''}`
      }
    });
    
    results.tests.push({
      name: 'Basic Supabase Connection',
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: supabaseUrl
    });
  } catch (error) {
    results.tests.push({
      name: 'Basic Supabase Connection',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // 测试2: 测试用户表
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/rest/v1/users?select=count`, {
      method: 'GET',
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || ''}`,
        'Accept': 'application/json'
      }
    });
    
    const data = await response.json();
    
    results.tests.push({
      name: 'Users Table Access',
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: data
    });
  } catch (error) {
    results.tests.push({
      name: 'Users Table Access',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // 测试3: 环境变量检查
  const envCheck = {
    SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    URL_LENGTH: process.env.SUPABASE_URL?.length || 0,
    ANON_KEY_LENGTH: process.env.SUPABASE_ANON_KEY?.length || 0,
    SERVICE_KEY_LENGTH: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
  };

  res.status(200).json({
    ...results,
    environment: envCheck
  });
}
