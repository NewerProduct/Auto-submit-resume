import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { DatabaseService } from '@/lib/db';
import { BossPlatformService } from '@/lib/platforms/boss';
import { ApiResponse } from '@/types';

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
    
    // 获取平台账户绑定状态
    const account = await DatabaseService.getPlatformAccount(session.user.id, platform);
    
    if (!account) {
      return res.status(200).json({
        success: true,
        data: {
          platform,
          isBound: false,
        },
      });
    }
    
    // 检查Cookie是否过期
    const isExpired = account.expiresAt && new Date() > account.expiresAt;
    
    // 检查平台可用性
    let platformAvailable = false;
    try {
      switch (platform) {
        case 'boss':
          platformAvailable = await BossPlatformService.checkPlatformStatus();
          break;
        default:
          platformAvailable = false;
      }
    } catch (error) {
      console.error(`检查${platform}平台状态失败:`, error);
      platformAvailable = false;
    }
    
    res.status(200).json({
      success: true,
      data: {
        platform,
        isBound: true,
        platformUserId: account.platformUserId,
        expiresAt: account.expiresAt,
        isExpired,
        platformAvailable,
        lastSyncAt: account.updatedAt,
      },
    });
  } catch (error) {
    console.error('获取平台状态失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取平台状态失败',
      },
    });
  }
}
