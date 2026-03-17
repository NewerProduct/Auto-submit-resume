import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { BossPlatformService } from '@/lib/platforms/boss';
import { ApiResponse } from '@/types';

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
    
    const { platform, authCookie, platformUserId } = req.body;
    
    // 验证必填字段
    if (!platform || !authCookie) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '平台和Cookie不能为空',
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
    
    // 根据平台类型进行绑定
    let account;
    switch (platform) {
      case 'boss':
        account = await BossPlatformService.bindAccount(session.user.id, authCookie, platformUserId);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'PLATFORM_NOT_SUPPORTED',
            message: '暂不支持该平台',
          },
        });
    }
    
    res.status(201).json({
      success: true,
      data: {
        id: account.id,
        platform: account.platform,
        platformUserId: account.platformUserId,
        isBound: true,
        expiresAt: account.expiresAt,
      },
      message: '平台绑定成功',
    });
  } catch (error) {
    console.error('平台绑定失败:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Cookie已失效，请重新获取') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'COOKIE_EXPIRED',
            message: error.message,
          },
        });
      }
      
      if (error.message === '获取用户信息失败') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COOKIE',
            message: 'Cookie无效，请检查后重试',
          },
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '平台绑定失败，请稍后重试',
      },
    });
  }
}
