import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { DeliveryService } from '@/lib/delivery-service';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
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
    
    // 取消批量投递任务
    await DeliveryService.cancelBatchDelivery(batchId, session.user.id);
    
    res.status(200).json({
      success: true,
      message: '批量投递任务已取消',
    });
  } catch (error) {
    console.error('取消批量投递任务失败:', error);
    
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
      
      if (error.message === '只能取消正在处理的任务') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: error.message,
          },
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '取消批量投递任务失败',
      },
    });
  }
}
