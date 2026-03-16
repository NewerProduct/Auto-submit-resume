import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { DatabaseService } from '@/lib/db';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'PUT') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: '请求方法不允许',
      },
    });
  }
  
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
  
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '简历ID不能为空',
      },
    });
  }
  
  try {
    // 检查简历是否存在
    const resume = await DatabaseService.getResumeById(id, session.user.id);
    
    if (!resume) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '简历不存在',
        },
      });
    }
    
    // 设置为默认简历
    await DatabaseService.setDefaultResume(session.user.id, id);
    
    res.status(200).json({
      success: true,
      message: '默认简历设置成功',
    });
  } catch (error) {
    console.error('设置默认简历失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '设置默认简历失败',
      },
    });
  }
}
