import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { DatabaseService } from '@/lib/db';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
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
    switch (req.method) {
      case 'GET':
        return handleGetResume(req, res, id, session.user.id);
      case 'PUT':
        return handleUpdateResume(req, res, id, session.user.id);
      case 'DELETE':
        return handleDeleteResume(req, res, id, session.user.id);
      default:
        return res.status(405).json({
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: '请求方法不允许',
          },
        });
    }
  } catch (error) {
    console.error('简历操作失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '简历操作失败',
      },
    });
  }
}

async function handleGetResume(req: NextApiRequest, res: NextApiResponse<ApiResponse>, resumeId: string, userId: string) {
  try {
    // 获取简历详情
    const resume = await DatabaseService.getResumeById(resumeId, userId);
    
    if (!resume) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '简历不存在',
        },
      });
    }
    
    // 获取投递数量
    const { items: applications } = await DatabaseService.getUserApplications(userId, {
      resumeId: resume.id,
    });
    
    res.status(200).json({
      success: true,
      data: {
        ...resume,
        applicationCount: applications.length,
      },
    });
  } catch (error) {
    console.error('获取简历详情失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取简历详情失败',
      },
    });
  }
}

async function handleUpdateResume(req: NextApiRequest, res: NextApiResponse<ApiResponse>, resumeId: string, userId: string) {
  try {
    const { name, isDefault } = req.body;
    
    // 验证必填字段
    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '简历名称不能为空',
        },
      });
    }
    
    // 检查简历是否存在
    const existingResume = await DatabaseService.getResumeById(resumeId, userId);
    if (!existingResume) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '简历不存在',
        },
      });
    }
    
    // 如果设置为默认简历，先取消其他默认简历
    if (isDefault === true) {
      await DatabaseService.setDefaultResume(userId, resumeId);
    }
    
    // 更新简历信息
    const updatedResume = await DatabaseService.updateResume(resumeId, userId, {
      name,
      isDefault,
    });
    
    res.status(200).json({
      success: true,
      data: updatedResume,
      message: '简历更新成功',
    });
  } catch (error) {
    console.error('更新简历失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '更新简历失败',
      },
    });
  }
}

async function handleDeleteResume(req: NextApiRequest, res: NextApiResponse<ApiResponse>, resumeId: string, userId: string) {
  try {
    // 检查简历是否存在
    const existingResume = await DatabaseService.getResumeById(resumeId, userId);
    if (!existingResume) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '简历不存在',
        },
      });
    }
    
    // 检查是否有相关的投递记录
    const { items: applications } = await DatabaseService.getUserApplications(userId, {
      resumeId: resumeId,
    });
    
    if (applications.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'HAS_APPLICATIONS',
          message: '该简历已有投递记录，无法删除',
        },
      });
    }
    
    // 删除简历
    await DatabaseService.deleteResume(resumeId, userId);
    
    res.status(200).json({
      success: true,
      message: '简历删除成功',
    });
  } catch (error) {
    console.error('删除简历失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '删除简历失败',
      },
    });
  }
}
