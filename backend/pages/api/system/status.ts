import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { DatabaseService } from '@/lib/db';
import { KVService } from '@/lib/kv';
import { BossPlatformService } from '@/lib/platforms/boss';
import { ApiResponse, SystemStatus } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: '请求方法不允许',
      },
    });
  }
  
  try {
    // 获取用户会话（可选）
    const session = await getSession({ req });
    const userId = session?.user?.id;
    
    // 检查各服务状态
    const [databaseStatus, cacheStatus, storageStatus] = await Promise.all([
      checkDatabaseStatus(),
      checkCacheStatus(),
      checkStorageStatus(),
    ]);
    
    // 检查平台状态
    const platforms = await checkPlatformStatuses();
    
    // 获取频率限制信息
    const rateLimits = userId ? await getRateLimits(userId) : {};
    
    const systemStatus: SystemStatus = {
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: databaseStatus,
      cache: cacheStatus,
      storage: storageStatus,
      platforms,
      rateLimits,
    };
    
    res.status(200).json({
      success: true,
      data: systemStatus,
    });
  } catch (error) {
    console.error('获取系统状态失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取系统状态失败',
      },
    });
  }
}

async function checkDatabaseStatus(): Promise<'connected' | 'disconnected'> {
  try {
    // 简单的数据库连接测试
    await DatabaseService.getUserResumes('test-connection');
    return 'connected';
  } catch (error) {
    console.error('数据库连接检查失败:', error);
    return 'disconnected';
  }
}

async function checkCacheStatus(): Promise<'connected' | 'disconnected'> {
  try {
    // 简单的缓存连接测试
    await KVService.setCache('health-check', 'test', 10);
    await KVService.deleteCache('health-check');
    return 'connected';
  } catch (error) {
    console.error('缓存连接检查失败:', error);
    return 'disconnected';
  }
}

async function checkStorageStatus(): Promise<'connected' | 'disconnected'> {
  try {
    // 检查存储服务状态
    // 这里可以添加对Vercel Blob的连接检查
    return 'connected';
  } catch (error) {
    console.error('存储连接检查失败:', error);
    return 'disconnected';
  }
}

async function checkPlatformStatuses(): Promise<Record<string, { status: 'available' | 'unavailable'; lastCheck: Date }>> {
  const platforms: Record<string, { status: 'available' | 'unavailable'; lastCheck: Date }> = {};
  
  try {
    // 检查Boss直聘状态
    const bossAvailable = await BossPlatformService.checkPlatformStatus();
    platforms.boss = {
      status: bossAvailable ? 'available' : 'unavailable',
      lastCheck: new Date(),
    };
  } catch (error) {
    console.error('Boss直聘状态检查失败:', error);
    platforms.boss = {
      status: 'unavailable',
      lastCheck: new Date(),
    };
  }
  
  // 其他平台状态检查
  platforms.zhilian = {
    status: 'unavailable', // 暂未实现
    lastCheck: new Date(),
  };
  
  platforms.liepin = {
    status: 'unavailable', // 暂未实现
    lastCheck: new Date(),
  };
  
  return platforms;
}

async function getRateLimits(userId: string): Promise<Record<string, any>> {
  try {
    const rateLimits: Record<string, any> = {};
    
    // 获取Boss直聘频率限制
    const bossLimits = BossPlatformService.getDeliveryLimits();
    const bossRateLimit = await KVService.getRateLimitInfo(userId, 'boss', bossLimits.dailyLimit);
    
    rateLimits.boss = bossRateLimit;
    
    // 其他平台频率限制
    rateLimits.zhilian = {
      platform: 'zhilian',
      dailyLimit: 50,
      usedToday: 0,
      remaining: 50,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
    
    rateLimits.liepin = {
      platform: 'liepin',
      dailyLimit: 30,
      usedToday: 0,
      remaining: 30,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
    
    return rateLimits;
  } catch (error) {
    console.error('获取频率限制信息失败:', error);
    return {};
  }
}
