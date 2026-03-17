import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { DatabaseService } from '@/lib/db';
import { ApiResponse, User } from '@/types';

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
    
    // 获取用户详细信息
    const user = await DatabaseService.getUserById(session.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: '用户不存在',
        },
      });
    }
    
    // 获取用户统计信息
    const [resumeCount, applicationCount] = await Promise.all([
      DatabaseService.getUserResumes(user.id).then(resumes => resumes.length),
      DatabaseService.getUserApplications(user.id).then(apps => apps.total),
    ]);
    
    // 返回用户信息（不包含密码哈希）
    const userInfo: Partial<User> = {
      id: user.id,
      phone: user.phone,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    
    res.status(200).json({
      success: true,
      data: {
        ...userInfo,
        resumeCount,
        applicationCount,
      },
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取用户信息失败',
      },
    });
  }
}
