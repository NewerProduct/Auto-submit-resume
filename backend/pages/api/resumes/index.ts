import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { DatabaseService } from '@/lib/db';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  // 处理 OPTIONS 请求 (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
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
  
  try {
    switch (req.method) {
      case 'GET':
        return handleGetResumes(req, res, session.user.id);
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
    console.error('获取简历列表失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取简历列表失败',
      },
    });
  }
}

async function handleGetResumes(req: NextApiRequest, res: NextApiResponse<ApiResponse>, userId: string) {
  try {
    // 获取用户简历列表
    const resumes = await DatabaseService.getUserResumes(userId);
    
    // 获取每个简历的投递数量
    const resumesWithStats = await Promise.all(
      resumes.map(async (resume) => {
        const { items: applications } = await DatabaseService.getUserApplications(userId, {
          resumeId: resume.id,
        });
        
        return {
          id: resume.id,
          name: resume.name,
          fileUrl: resume.fileUrl,
          isDefault: resume.isDefault,
          createdAt: resume.createdAt,
          fileSize: resume.fileSize,
          applicationCount: applications.length,
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: resumesWithStats,
    });
  } catch (error) {
    console.error('获取简历列表失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取简历列表失败',
      },
    });
  }
}
