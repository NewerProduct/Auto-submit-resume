import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { BossPlatformService } from '@/lib/platforms/boss';
import { ApiResponse, PaginatedResponse, JobSearchParams, Job } from '@/types';

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
    
    // 解析查询参数
    const searchParams: JobSearchParams = {
      keyword: req.query.keyword as string,
      location: req.query.location as string,
      salaryMin: req.query.salaryMin ? parseInt(req.query.salaryMin as string) : undefined,
      salaryMax: req.query.salaryMax ? parseInt(req.query.salaryMax as string) : undefined,
      experience: req.query.experience as string,
      education: req.query.education as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    };
    
    // 验证分页参数
    if (searchParams.page! < 1 || searchParams.page! > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '页码必须在1-100之间',
        },
      });
    }
    
    if (searchParams.limit! < 1 || searchParams.limit! > 50) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '每页数量必须在1-50之间',
        },
      });
    }
    
    // 根据平台类型搜索岗位
    let result: { items: any[]; total: number };
    
    switch (platform) {
      case 'boss':
        result = await BossPlatformService.searchJobs(session.user.id, searchParams);
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
    
    // 计算分页信息
    const totalPages = Math.ceil(result.total / searchParams.limit!);
    
    const paginatedResponse: PaginatedResponse<Job> = {
      items: result.items,
      pagination: {
        page: searchParams.page!,
        limit: searchParams.limit!,
        total: result.total,
        totalPages,
      },
    };
    
    res.status(200).json({
      success: true,
      data: paginatedResponse,
    });
  } catch (error) {
    console.error('搜索岗位失败:', error);
    
    if (error instanceof Error) {
      if (error.message === '请先绑定Boss直聘账户') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PLATFORM_NOT_BOUND',
            message: error.message,
          },
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '搜索岗位失败，请稍后重试',
      },
    });
  }
}
