import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { DeliveryService } from '@/lib/delivery-service';
import { BossPlatformService } from '@/lib/platforms/boss';
import { ApiResponse, DeliveryConfig } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
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
  
  try {
    switch (req.method) {
      case 'GET':
        return handleGetDeliveryConfig(req, res);
      case 'PUT':
        return handleUpdateDeliveryConfig(req, res, session.user.id);
      default:
        return res.status(405).json({
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: '请求方法不允许',
          },
        });
    }
  } catch (error) {
    console.error('投递配置操作失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '投递配置操作失败',
      },
    });
  }
}

async function handleGetDeliveryConfig(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    // 获取默认投递策略
    const defaultStrategy = {
      type: 'balanced' as const,
      dailyLimit: 50,
      intervalMs: 30000,
      skipDuplicates: true,
    };
    
    // 获取各平台的限制配置
    const platformLimits = {
      boss: BossPlatformService.getDeliveryLimits(),
      zhilian: {
        dailyLimit: 50,
        intervalMs: 60000,
      },
      liepin: {
        dailyLimit: 30,
        intervalMs: 120000,
      },
    };
    
    const deliveryConfig: DeliveryConfig = {
      defaultStrategy,
      platformLimits,
    };
    
    res.status(200).json({
      success: true,
      data: deliveryConfig,
    });
  } catch (error) {
    console.error('获取投递配置失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取投递配置失败',
      },
    });
  }
}

async function handleUpdateDeliveryConfig(req: NextApiRequest, res: NextApiResponse<ApiResponse>, userId: string) {
  try {
    const { defaultStrategy } = req.body;
    
    if (!defaultStrategy) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '投递策略不能为空',
        },
      });
    }
    
    // 验证策略参数
    const strategy = {
      type: defaultStrategy.type || 'balanced',
      dailyLimit: defaultStrategy.dailyLimit || 50,
      intervalMs: defaultStrategy.intervalMs || 30000,
      skipDuplicates: defaultStrategy.skipDuplicates !== false,
    };
    
    if (!['aggressive', 'conservative', 'balanced'].includes(strategy.type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '无效的投递策略类型',
        },
      });
    }
    
    if (strategy.dailyLimit < 1 || strategy.dailyLimit > 200) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '每日投递限制必须在1-200之间',
        },
      });
    }
    
    if (strategy.intervalMs < 10000 || strategy.intervalMs > 300000) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '投递间隔必须在10秒-5分钟之间',
        },
      });
    }
    
    // 这里可以将用户自定义配置保存到数据库
    // 目前返回更新后的配置
    const updatedConfig = {
      defaultStrategy: strategy,
      platformLimits: {
        boss: BossPlatformService.getDeliveryLimits(),
        zhilian: {
          dailyLimit: 50,
          intervalMs: 60000,
        },
        liepin: {
          dailyLimit: 30,
          intervalMs: 120000,
        },
      },
    };
    
    res.status(200).json({
      success: true,
      data: updatedConfig,
      message: '投递配置更新成功',
    });
  } catch (error) {
    console.error('更新投递配置失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '更新投递配置失败',
      },
    });
  }
}
