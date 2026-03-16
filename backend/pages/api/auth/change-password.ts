import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { AuthService } from '@/lib/auth';
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
    
    const { oldPassword, newPassword } = req.body;
    
    // 验证必填字段
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '旧密码和新密码不能为空',
        },
      });
    }
    
    // 验证新密码强度
    const passwordValidation = AuthService.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: passwordValidation.message || '新密码格式不正确',
        },
      });
    }
    
    // 检查新旧密码是否相同
    if (oldPassword === newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '新密码不能与旧密码相同',
        },
      });
    }
    
    // 修改密码
    await AuthService.changePassword(session.user.id, oldPassword, newPassword);
    
    res.status(200).json({
      success: true,
      message: '密码修改成功',
    });
  } catch (error) {
    console.error('修改密码失败:', error);
    
    if (error instanceof Error) {
      if (error.message === '用户不存在') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: error.message,
          },
        });
      }
      
      if (error.message === '旧密码错误') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_OLD_PASSWORD',
            message: error.message,
          },
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '修改密码失败，请稍后重试',
      },
    });
  }
}
