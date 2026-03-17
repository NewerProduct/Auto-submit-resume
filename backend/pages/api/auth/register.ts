import { NextApiRequest, NextApiResponse } from 'next';
import { AuthService } from '@/lib/auth';
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
    const { phone, password, email } = req.body;
    
    // 验证必填字段
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '手机号和密码不能为空',
        },
      });
    }
    
    // 验证手机号格式
    if (!AuthService.validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '手机号格式不正确',
        },
      });
    }
    
    // 验证密码强度
    const passwordValidation = AuthService.validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: passwordValidation.message || '密码格式不正确',
        },
      });
    }
    
    // 验证邮箱格式（如果提供）
    if (email && !AuthService.validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '邮箱格式不正确',
        },
      });
    }
    
    // 注册用户
    const user = await AuthService.register(phone, password, email);
    
    // 返回用户信息（不包含密码哈希）
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          createdAt: user.createdAt,
        },
      },
      message: '注册成功',
    });
  } catch (error) {
    console.error('注册失败:', error);
    
    if (error instanceof Error) {
      if (error.message === '手机号已被注册') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'PHONE_EXISTS',
            message: error.message,
          },
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '注册失败，请稍后重试',
      },
    });
  }
}
