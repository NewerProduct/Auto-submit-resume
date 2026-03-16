import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { DeliveryService } from '@/lib/delivery-service';
import { UploadService } from '@/lib/upload';
import { ApiResponse, ExportRequest } from '@/types';

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
      format = 'csv',
      startDate,
      endDate,
      platform,
      status,
      resumeId,
    } = req.query;
    
    // 验证导出格式
    if (!['csv', 'json', 'xlsx'].includes(format as string)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '不支持的导出格式',
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
    
    // 构建查询参数
    const options: any = {
      page: 1,
      limit: 1000, // 导出时限制数量
    };
    
    if (startDate) options.startDate = startDate as string;
    if (endDate) options.endDate = endDate as string;
    if (platform) options.platform = platform as string;
    if (status) options.status = status as string;
    if (resumeId) options.resumeId = resumeId as string;
    
    // 获取投递记录
    const { items: applications } = await DeliveryService.getApplicationHistory(session.user.id, options);
    
    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_DATA',
          message: '没有找到符合条件的投递记录',
        },
      });
    }
    
    // 根据格式生成导出数据
    let exportData: Buffer | string;
    let filename: string;
    let contentType: string;
    
    switch (format) {
      case 'csv':
        exportData = generateCSV(applications);
        filename = `applications_${new Date().toISOString().split('T')[0]}.csv`;
        contentType = 'text/csv';
        break;
      case 'json':
        exportData = JSON.stringify(applications, null, 2);
        filename = `applications_${new Date().toISOString().split('T')[0]}.json`;
        contentType = 'application/json';
        break;
      case 'xlsx':
        // 简化的Excel导出，实际项目中可能需要使用xlsx库
        exportData = generateCSV(applications); // 暂时用CSV代替
        filename = `applications_${new Date().toISOString().split('T')[0]}.csv`;
        contentType = 'text/csv';
        break;
      default:
        throw new Error('不支持的导出格式');
    }
    
    // 上传导出文件
    const { url } = await UploadService.uploadExport(exportData, filename, session.user.id);
    
    res.status(200).json({
      success: true,
      data: {
        downloadUrl: url,
        filename,
        fileSize: Buffer.byteLength(exportData),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
      },
      message: '导出文件生成成功',
    });
  } catch (error) {
    console.error('导出投递记录失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '导出投递记录失败',
      },
    });
  }
}

function generateCSV(applications: any[]): string {
  const headers = [
    'ID',
    '简历ID',
    '平台',
    '岗位ID',
    '岗位名称',
    '公司名称',
    '地点',
    '薪资',
    '状态',
    '投递时间',
    '更新时间',
  ];
  
  const rows = applications.map(app => [
    app.id,
    app.resume_id,
    app.platform,
    app.job_id,
    app.job_title || '',
    app.company_name || '',
    app.location || '',
    app.salary || '',
    app.status,
    app.submitted_at || '',
    app.updated_at || '',
  ]);
  
  // 转换为CSV格式
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
  
  // 添加BOM以支持中文
  return '\uFEFF' + csvContent;
}

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
