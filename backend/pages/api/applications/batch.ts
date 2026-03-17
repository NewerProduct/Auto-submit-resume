import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { DeliveryService } from '@/lib/delivery-service';
import { ApiResponse, CreateBatchDeliveryParams, DeliveryStrategy } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  // 处理 OPTIONS 请求 (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
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
    
    const { resumeId, platform, jobIds, strategy } = req.body;
    
    // 验证必填字段
    if (!resumeId || !platform || !jobIds || !Array.isArray(jobIds) || !strategy) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '必填字段不能为空',
        },
      });
    }
    
    // 验证岗位数量
    if (jobIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请选择要投递的岗位',
        },
      });
    }
    
    if (jobIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '单次最多投递50个岗位',
        },
      });
    }
    
    // 验证平台类型
    if (!['boss', 'zhilian', 'liepin'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '不支持的平台类型',
        },
      });
    }
    
    // 验证投递策略
    const deliveryStrategy: DeliveryStrategy = {
      type: strategy.type || 'balanced',
      dailyLimit: strategy.dailyLimit || 50,
      intervalMs: strategy.intervalMs || 30000,
      skipDuplicates: strategy.skipDuplicates !== false,
    };
    
    // 验证策略参数
    if (!['aggressive', 'conservative', 'balanced'].includes(deliveryStrategy.type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '无效的投递策略类型',
        },
      });
    }
    
    if (deliveryStrategy.dailyLimit < 1 || deliveryStrategy.dailyLimit > 200) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '每日投递限制必须在1-200之间',
        },
      });
    }
    
    if (deliveryStrategy.intervalMs < 10000 || deliveryStrategy.intervalMs > 300000) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '投递间隔必须在10秒-5分钟之间',
        },
      });
    }
    
    // 创建批量投递参数
    const batchParams: CreateBatchDeliveryParams = {
      userId: session.user.id,
      resumeId,
      platform,
      jobIds,
      strategy: deliveryStrategy,
    };
    
    // 创建批量投递任务
    const batchDelivery = await DeliveryService.createBatchDelivery(batchParams);
    
    // 估算执行时间
    const estimatedDuration = Math.ceil(
      (batchDelivery.jobIds.length * deliveryStrategy.intervalMs) / 1000 / 60
    );
    
    res.status(201).json({
      success: true,
      data: {
        batchId: batchDelivery.id,
        totalJobs: batchDelivery.totalJobs,
        status: batchDelivery.status,
        estimatedDuration: `${estimatedDuration}分钟`,
        jobs: batchDelivery.jobIds.map((jobId, index) => ({
          jobId,
          status: 'pending',
          priority: index + 1,
        })),
      },
      message: '批量投递任务已创建',
    });
  } catch (error) {
    console.error('创建批量投递任务失败:', error);
    
    if (error instanceof Error) {
      if (error.message === '简历不存在') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESUME_NOT_FOUND',
            message: error.message,
          },
        });
      }
      
      if (error.message.includes('请先绑定')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PLATFORM_NOT_BOUND',
            message: error.message,
          },
        });
      }
      
      if (error.message.includes('今日投递次数已达上限')) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: error.message,
          },
        });
      }
      
      if (error.message === '所选岗位均已投递') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ALL_JOBS_APPLIED',
            message: error.message,
          },
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '创建批量投递任务失败，请稍后重试',
      },
    });
  }
}
