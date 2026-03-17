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
    
    const { batchId } = req.query;
    
    if (!batchId || typeof batchId !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '批量投递ID不能为空',
        },
      });
    }
    
    // 获取批量投递状态
    const status = await DeliveryService.getBatchDeliveryStatus(batchId, session.user.id);
    
    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('获取批量投递状态失败:', error);
    
    if (error instanceof Error) {
      if (error.message === '批量投递任务不存在') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取批量投递状态失败',
      },
    });
  }
}
