import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { DatabaseService } from '@/lib/db';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'DELETE') {
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
    
    const { platform } = req.query;
    
    if (!platform || typeof platform !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '平台参数不能为空',
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
    
    // 检查是否有正在进行的批量投递任务
    // 这里可以添加检查逻辑，如果有进行中的任务则不允许解绑
    
    // 解绑平台账户
    await DatabaseService.unbindPlatformAccount(session.user.id, platform);
    
    res.status(200).json({
      success: true,
      message: '平台解绑成功',
    });
  } catch (error) {
    console.error('平台解绑失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '平台解绑失败，请稍后重试',
      },
    });
  }
}
