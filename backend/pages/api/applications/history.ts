import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { DeliveryService } from '@/lib/delivery-service';
import { ApiResponse, PaginatedResponse } from '@/types';

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
    
    // 解析查询参数
    const {
      status,
      platform,
      startDate,
      endDate,
      page = '1',
      limit = '20',
    } = req.query;
    
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    };
    
    // 添加筛选条件
    if (status && typeof status === 'string') {
      options.status = status;
    }
    
    if (platform && typeof platform === 'string') {
      options.platform = platform;
    }
    
    if (startDate && typeof startDate === 'string') {
      options.startDate = startDate;
    }
    
    if (endDate && typeof endDate === 'string') {
      options.endDate = endDate;
    }
    
    // 验证分页参数
    if (options.page < 1 || options.page > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '页码必须在1-100之间',
        },
      });
    }
    
    if (options.limit < 1 || options.limit > 50) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '每页数量必须在1-50之间',
        },
      });
    }
    
    // 验证状态参数
    if (status && !['pending', 'submitted', 'viewed', 'rejected'].includes(status as string)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '无效的状态参数',
        },
      });
    }
    
    // 验证平台参数
    if (platform && !['boss', 'zhilian', 'liepin'].includes(platform as string)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '不支持的平台类型',
        },
      });
    }
    
    // 验证日期格式
    if (startDate && !isValidDate(startDate as string)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '开始日期格式不正确',
        },
      });
    }
    
    if (endDate && !isValidDate(endDate as string)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '结束日期格式不正确',
        },
      });
    }
    
    // 获取投递历史
    const { items, total } = await DeliveryService.getApplicationHistory(session.user.id, options);
    
    // 计算分页信息
    const totalPages = Math.ceil(total / options.limit);
    
    const paginatedResponse: PaginatedResponse<any> = {
      items: items.map(app => ({
        id: app.id,
        resumeId: app.resumeId,
        resumeName: '简历名称', // 这里需要关联查询简历名称
        platform: app.platform,
        jobId: app.jobId,
        jobTitle: app.jobTitle,
        companyName: app.companyName,
        location: app.location,
        salary: app.salary,
        status: app.status,
        submittedAt: app.submittedAt,
        updatedAt: app.updatedAt,
      })),
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages,
      },
    };
    
    res.status(200).json({
      success: true,
      data: paginatedResponse,
    });
  } catch (error) {
    console.error('获取投递历史失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取投递历史失败',
      },
    });
  }
}

// 验证日期格式
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
