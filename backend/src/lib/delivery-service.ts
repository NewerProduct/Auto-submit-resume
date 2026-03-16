import { DatabaseService } from './db';
import { KVService } from './kv';
import { BossPlatformService } from './platforms/boss';
import { 
  DeliveryStrategy, 
  BatchDelivery, 
  CreateBatchDeliveryParams, 
  Application,
  RateLimitInfo 
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class DeliveryService {
  // 创建批量投递任务
  static async createBatchDelivery(params: CreateBatchDeliveryParams): Promise<BatchDelivery> {
    try {
      // 验证用户权限和简历
      const resume = await DatabaseService.getResumeById(params.resumeId, params.userId);
      if (!resume) {
        throw new Error('简历不存在');
      }

      // 验证平台绑定状态
      const account = await DatabaseService.getPlatformAccount(params.userId, params.platform);
      if (!account) {
        throw new Error(`请先绑定${params.platform}平台账户`);
      }

      // 检查频率限制
      const rateLimitInfo = await this.checkRateLimit(params.userId, params.platform, params.strategy.dailyLimit);
      if (rateLimitInfo.remaining < params.jobIds.length) {
        throw new Error(`今日投递次数已达上限，剩余${rateLimitInfo.remaining}次`);
      }

      // 过滤已投递的岗位
      const validJobIds = await this.filterAppliedJobs(params.userId, params.platform, params.jobIds);
      if (validJobIds.length === 0) {
        throw new Error('所选岗位均已投递');
      }

      // 创建批量投递记录
      const batchData: CreateBatchDeliveryParams = {
        ...params,
        jobIds: validJobIds,
      };

      const batchDelivery = await DatabaseService.createBatchDelivery(batchData);

      // 启动异步投递任务
      this.processBatchDelivery(batchDelivery.id).catch(error => {
        console.error('处理批量投递任务失败:', error);
      });

      return batchDelivery;
    } catch (error) {
      console.error('创建批量投递任务失败:', error);
      throw error;
    }
  }

  // 处理批量投递任务
  private static async processBatchDelivery(batchId: string): Promise<void> {
    try {
      // 获取批量投递任务
      const batchDelivery = await DatabaseService.getBatchDelivery(batchId, '');
      if (!batchDelivery) {
        throw new Error('批量投递任务不存在');
      }

      // 获取平台服务
      const platformService = this.getPlatformService(batchDelivery.platform);
      if (!platformService) {
        throw new Error(`不支持的平台: ${batchDelivery.platform}`);
      }

      // 获取投递限制
      const limits = platformService.getDeliveryLimits();

      let completedCount = 0;
      let failedCount = 0;

      // 逐个投递
      for (let i = 0; i < batchDelivery.jobIds.length; i++) {
        const jobId = batchDelivery.jobIds[i];
        
        try {
          // 检查频率限制
          const rateLimitInfo = await this.checkRateLimit(
            batchDelivery.userId, 
            batchDelivery.platform, 
            batchDelivery.strategy.dailyLimit
          );

          if (rateLimitInfo.remaining <= 0) {
            // 达到限制，停止投递
            await DatabaseService.updateBatchDelivery(batchId, batchDelivery.userId, {
              status: 'completed',
              completedJobs: completedCount,
              failedJobs: failedCount,
              completedAt: new Date(),
            });
            break;
          }

          // 执行投递
          await platformService.submitApplication(
            batchDelivery.userId,
            batchDelivery.resumeId,
            jobId
          );

          completedCount++;

          // 更新进度
          await DatabaseService.updateBatchDelivery(batchId, batchDelivery.userId, {
            completedJobs: completedCount,
            failedJobs: failedCount,
          });

          // 缓存进度状态
          await KVService.setBatchDeliveryStatus(batchId, {
            status: 'processing',
            progress: {
              total: batchDelivery.jobIds.length,
              completed: completedCount,
              failed: failedCount,
              pending: batchDelivery.jobIds.length - completedCount - failedCount,
            },
            lastUpdate: new Date(),
          });

          // 投递间隔
          if (i < batchDelivery.jobIds.length - 1) {
            await this.sleep(batchDelivery.strategy.intervalMs);
          }

        } catch (error) {
          console.error(`投递岗位${jobId}失败:`, error);
          failedCount++;

          // 更新失败计数
          await DatabaseService.updateBatchDelivery(batchId, batchDelivery.userId, {
            completedJobs: completedCount,
            failedJobs: failedCount,
          });
        }
      }

      // 标记任务完成
      await DatabaseService.updateBatchDelivery(batchId, batchDelivery.userId, {
        status: 'completed',
        completedJobs: completedCount,
        failedJobs: failedCount,
        completedAt: new Date(),
      });

      // 清理缓存
      await KVService.deleteBatchDeliveryStatus(batchId);

    } catch (error) {
      console.error('处理批量投递任务失败:', error);
      
      // 标记任务失败
      await DatabaseService.updateBatchDelivery(batchId, '', {
        status: 'failed',
        completedAt: new Date(),
      });

      // 清理缓存
      await KVService.deleteBatchDeliveryStatus(batchId);
    }
  }

  // 获取批量投递状态
  static async getBatchDeliveryStatus(batchId: string, userId: string): Promise<any> {
    try {
      // 先从缓存获取
      const cachedStatus = await KVService.getBatchDeliveryStatus(batchId);
      if (cachedStatus) {
        return cachedStatus;
      }

      // 从数据库获取
      const batchDelivery = await DatabaseService.getBatchDelivery(batchId, userId);
      if (!batchDelivery) {
        throw new Error('批量投递任务不存在');
      }

      return {
        batchId: batchDelivery.id,
        status: batchDelivery.status,
        progress: {
          total: batchDelivery.totalJobs,
          completed: batchDelivery.completedJobs,
          failed: batchDelivery.failedJobs,
          pending: batchDelivery.totalJobs - batchDelivery.completedJobs - batchDelivery.failedJobs,
        },
        startedAt: batchDelivery.startedAt,
        completedAt: batchDelivery.completedAt,
      };
    } catch (error) {
      console.error('获取批量投递状态失败:', error);
      throw error;
    }
  }

  // 取消批量投递任务
  static async cancelBatchDelivery(batchId: string, userId: string): Promise<void> {
    try {
      const batchDelivery = await DatabaseService.getBatchDelivery(batchId, userId);
      if (!batchDelivery) {
        throw new Error('批量投递任务不存在');
      }

      if (batchDelivery.status !== 'processing') {
        throw new Error('只能取消正在处理的任务');
      }

      // 标记为已取消
      await DatabaseService.updateBatchDelivery(batchId, userId, {
        status: 'cancelled',
        completedAt: new Date(),
      });

      // 清理缓存
      await KVService.deleteBatchDeliveryStatus(batchId);
    } catch (error) {
      console.error('取消批量投递任务失败:', error);
      throw error;
    }
  }

  // 检查频率限制
  static async checkRateLimit(userId: string, platform: string, dailyLimit: number): Promise<RateLimitInfo> {
    return await KVService.checkRateLimit(userId, platform, dailyLimit);
  }

  // 过滤已投递的岗位
  private static async filterAppliedJobs(userId: string, platform: string, jobIds: string[]): Promise<string[]> {
    const validJobIds: string[] = [];

    for (const jobId of jobIds) {
      const isApplied = await DatabaseService.checkApplicationExists(userId, platform, jobId);
      if (!isApplied) {
        validJobIds.push(jobId);
      }
    }

    return validJobIds;
  }

  // 获取平台服务
  private static getPlatformService(platform: string) {
    switch (platform) {
      case 'boss':
        return BossPlatformService;
      default:
        return null;
    }
  }

  // 延迟函数
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 获取用户投递历史
  static async getApplicationHistory(
    userId: string,
    options: {
      status?: string;
      platform?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ items: Application[]; total: number }> {
    try {
      return await DatabaseService.getUserApplications(userId, options);
    } catch (error) {
      console.error('获取投递历史失败:', error);
      throw error;
    }
  }

  // 获取投递统计
  static async getApplicationStats(userId: string, period: string = '7d'): Promise<any> {
    try {
      const stats = await DatabaseService.getApplicationStats(userId, period);
      
      // 处理统计数据
      const summary = {
        totalApplications: stats.length,
        submittedApplications: stats.filter((app: any) => app.status === 'submitted').length,
        viewedApplications: stats.filter((app: any) => app.status === 'viewed').length,
        rejectedApplications: stats.filter((app: any) => app.status === 'rejected').length,
        successRate: 0,
      };

      summary.successRate = summary.totalApplications > 0 
        ? (summary.submittedApplications / summary.totalApplications) 
        : 0;

      // 按平台分组统计
      const byPlatform = stats.reduce((acc: any, app: any) => {
        const platform = app.platform || 'unknown';
        if (!acc[platform]) {
          acc[platform] = {
            platform: platform,
            total: 0,
            submitted: 0,
            viewed: 0,
            rejected: 0,
          };
        }
        
        acc[platform].total++;
        const status = app.status || 'pending';
        if (status === 'submitted' || status === 'viewed' || status === 'rejected') {
          acc[platform][status]++;
        }
        
        return acc;
      }, {});

      // 按日期分组统计
      const byDate = stats.reduce((acc: any, app: any) => {
        const date = new Date(app.submitted_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            count: 0,
            success: 0,
          };
        }
        
        acc[date].count++;
        if (app.status === 'submitted' || app.status === 'viewed') {
          acc[date].success++;
        }
        
        return acc;
      }, {});

      // 获取频率限制信息
      const rateLimit = await this.checkRateLimit(userId, 'boss', 100);

      return {
        summary,
        byPlatform: Object.values(byPlatform),
        byDate: Object.values(byDate).sort((a: any, b: any) => a.date.localeCompare(b.date)),
        rateLimit,
      };
    } catch (error) {
      console.error('获取投递统计失败:', error);
      throw error;
    }
  }
}
