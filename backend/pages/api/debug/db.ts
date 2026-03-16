import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 测试数据库连接
    console.log('Testing database connection...');
    
    // 尝试查询用户表
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1);

    console.log('Database test result:', { data, error });

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DB_CONNECTION_ERROR',
          message: '数据库连接失败',
          details: error.message
        }
      });
    }

    // 测试表结构
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(0);

    if (tableError) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'TABLE_ACCESS_ERROR',
          message: '用户表访问失败',
          details: tableError.message
        }
      });
    }

    res.status(200).json({
      success: true,
      message: '数据库连接正常',
      data: {
        connected: true,
        tableAccessible: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '数据库测试失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    });
  }
}
