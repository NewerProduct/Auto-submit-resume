import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { DeliveryService } from '@/lib/delivery-service';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  // 处理 OPTIONS 请求 (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

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
    // 获取用户会话
    const session = await getSession({ req });
    
    if (!session || !session.user?.id) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: '请先登录',
        },
      });
    }
    
    const { period = '7d', platform } = req.query;
    
    // 验证时间周期参数
    if (period && typeof period === 'string') {
      const validPeriods = ['1d', '7d', '30d', '90d'];
      if (!validPeriods.includes(period)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '无效的时间周期参数',
          },
        });
      }
    }
    
    // 验证平台参数
    if (platform && typeof platform === 'string') {
      if (!['boss', 'zhilian', 'liepin'].includes(platform)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '不支持的平台类型',
          },
        });
      }
    }
    
    // 获取投递统计
    const stats = await DeliveryService.getApplicationStats(
      session.user.id, 
      period as string
    );
    
    // 如果指定了平台，过滤统计数据
    if (platform && typeof platform === 'string') {
      stats.byPlatform = stats.byPlatform.filter((p: any) => p.platform === platform);
      stats.rateLimit = stats.rateLimit.platform === platform ? stats.rateLimit : null;
    }
    
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('获取投递统计失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取投递统计失败',
      },
    });
  }
}
