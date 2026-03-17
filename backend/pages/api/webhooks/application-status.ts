import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseService } from '@/lib/db';
import { ApiResponse, WebhookPayload } from '@/types';
import crypto from 'crypto';

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
    // 验证Webhook签名
    const signature = req.headers['x-webhook-signature'] as string;
    if (!signature) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '缺少签名验证',
        },
      });
    }
    
    // 验证签名（这里简化处理，实际项目中需要更严格的验证）
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET || 'default-secret')
      .update(payload)
      .digest('hex');
    
    if (!signature.includes(expectedSignature)) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '签名验证失败',
        },
      });
    }
    
    const webhookPayload: WebhookPayload = req.body;
    
    // 验证必填字段
    if (!webhookPayload.platform || !webhookPayload.applicationId || !webhookPayload.jobId || !webhookPayload.status) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Webhook数据格式不正确',
        },
      });
    }
    
    // 验证状态值
    const validStatuses = ['pending', 'submitted', 'viewed', 'rejected'];
    if (!validStatuses.includes(webhookPayload.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '无效的状态值',
        },
      });
    }
    
    // 根据平台和岗位ID查找投递记录
    const { items: applications } = await DatabaseService.getUserApplications('', {
      platform: webhookPayload.platform,
      jobId: webhookPayload.jobId,
    } as any);
    
    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '未找到对应的投递记录',
        },
      });
    }
    
    // 更新投递状态
    const application = applications[0];
    await DatabaseService.updateApplicationStatus(
      application.id,
      application.userId,
      webhookPayload.status as any
    );
    
    // 记录Webhook日志
    console.log('Webhook处理成功:', {
      platform: webhookPayload.platform,
      applicationId: webhookPayload.applicationId,
      jobId: webhookPayload.jobId,
      status: webhookPayload.status,
      updatedAt: webhookPayload.updatedAt,
    });
    
    res.status(200).json({
      success: true,
      message: '状态更新成功',
    });
  } catch (error) {
    console.error('Webhook处理失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Webhook处理失败',
      },
    });
  }
}
