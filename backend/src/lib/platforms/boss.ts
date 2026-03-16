import { DatabaseService } from '../db';
import { KVService } from '../kv';
import { Job, JobSearchParams, PlatformAccount } from '@/types';

export class BossPlatformService {
  private static readonly BASE_URL = process.env.BOSS_API_BASE_URL || 'https://www.zhipin.com';
  private static readonly USER_AGENT = process.env.BOSS_USER_AGENT || 
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // 绑定平台账户
  static async bindAccount(userId: string, authCookie: string, platformUserId?: string): Promise<PlatformAccount> {
    try {
      // 验证Cookie有效性
      const isValid = await this.validateCookie(authCookie);
      if (!isValid) {
        throw new Error('Cookie已失效，请重新获取');
      }

      // 获取用户信息
      const userInfo = await this.getUserInfo(authCookie);
      
      const accountData = {
        userId,
        platform: 'boss' as const,
        platformUserId: userInfo.userId || platformUserId,
        authCookie,
        expiresAt: this.getCookieExpiry(authCookie),
      };

      return await DatabaseService.bindPlatformAccount(accountData);
    } catch (error) {
      console.error('绑定Boss直聘账户失败:', error);
      throw new Error('绑定Boss直聘账户失败');
    }
  }

  // 验证Cookie有效性
  private static async validateCookie(authCookie: string): Promise<boolean> {
    try {
      // 发送请求到Boss直聘验证Cookie
      const response = await fetch(`${this.BASE_URL}/web/user/info`, {
        method: 'GET',
        headers: {
          'Cookie': authCookie,
          'User-Agent': this.USER_AGENT,
          'Referer': this.BASE_URL,
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.code === 0 && data.data;
    } catch (error) {
      console.error('验证Cookie失败:', error);
      return false;
    }
  }

  // 获取用户信息
  private static async getUserInfo(authCookie: string): Promise<{ userId: string; name: string }> {
    try {
      const response = await fetch(`${this.BASE_URL}/web/user/info`, {
        method: 'GET',
        headers: {
          'Cookie': authCookie,
          'User-Agent': this.USER_AGENT,
          'Referer': this.BASE_URL,
        },
      });

      if (!response.ok) {
        throw new Error('获取用户信息失败');
      }

      const data = await response.json();
      if (data.code !== 0 || !data.data) {
        throw new Error('用户信息获取失败');
      }

      return {
        userId: data.data.userId,
        name: data.data.name,
      };
    } catch (error) {
      console.error('获取Boss直聘用户信息失败:', error);
      throw new Error('获取用户信息失败');
    }
  }

  // 获取Cookie过期时间
  private static getCookieExpiry(authCookie: string): Date {
    // 简单解析Cookie获取过期时间
    const cookieMatch = authCookie.match(/expires=([^;]+)/i);
    if (cookieMatch) {
      const expiryDate = new Date(cookieMatch[1]);
      // Boss直聘Cookie通常有效期为30天
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      return expiryDate > thirtyDaysLater ? expiryDate : thirtyDaysLater;
    }
    
    // 默认30天后过期
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    return thirtyDaysLater;
  }

  // 搜索岗位
  static async searchJobs(userId: string, searchParams: JobSearchParams): Promise<{ items: Job[]; total: number }> {
    try {
      // 获取用户绑定的平台账户
      const account = await DatabaseService.getPlatformAccount(userId, 'boss');
      if (!account || !account.authCookie) {
        throw new Error('请先绑定Boss直聘账户');
      }

      // 构建搜索参数
      const params = new URLSearchParams();
      if (searchParams.keyword) params.append('keyword', searchParams.keyword);
      if (searchParams.location) params.append('city', searchParams.location);
      if (searchParams.salaryMin) params.append('salaryMin', searchParams.salaryMin.toString());
      if (searchParams.salaryMax) params.append('salaryMax', searchParams.salaryMax.toString());
      if (searchParams.experience) params.append('experience', searchParams.experience);
      if (searchParams.education) params.append('education', searchParams.education);
      params.append('page', (searchParams.page || 1).toString());
      params.append('limit', (searchParams.limit || 20).toString());

      // 发送搜索请求
      const response = await fetch(`${this.BASE_URL}/web/geek/job?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Cookie': account.authCookie,
          'User-Agent': this.USER_AGENT,
          'Referer': `${this.BASE_URL}/`,
        },
      });

      if (!response.ok) {
        throw new Error('搜索岗位失败');
      }

      const data = await response.json();
      if (data.code !== 0) {
        throw new Error(data.message || '搜索岗位失败');
      }

      // 转换岗位数据格式
      const jobs: Job[] = (data.data.zpData.jobList || []).map((job: any) => ({
        jobId: job.encryptJobId,
        title: job.jobName,
        companyName: job.brandName,
        location: job.cityDistrict || job.cityName,
        salary: job.salaryDesc,
        salaryMin: this.parseSalary(job.salaryDesc)?.min,
        salaryMax: this.parseSalary(job.salaryDesc)?.max,
        experience: job.jobExperience,
        education: job.jobDegree,
        description: job.jobDesc,
        publishTime: new Date(job.lastModifyTime),
        isApplied: false, // 需要查询投递记录
      }));

      // 检查每个岗位是否已投递
      const jobsWithApplicationStatus = await Promise.all(
        jobs.map(async (job) => {
          const isApplied = await DatabaseService.checkApplicationExists(userId, 'boss', job.jobId);
          return { ...job, isApplied };
        })
      );

      return {
        items: jobsWithApplicationStatus,
        total: data.data.zpData.totalCount || 0,
      };
    } catch (error) {
      console.error('搜索Boss直聘岗位失败:', error);
      throw new Error('搜索岗位失败');
    }
  }

  // 解析薪资范围
  private static parseSalary(salaryDesc: string): { min: number; max: number } | null {
    if (!salaryDesc) return null;

    // 匹配薪资范围，如 "15-25K", "15-25千/月"
    const match = salaryDesc.match(/(\d+)-(\d+)[kK千]/);
    if (match) {
      return {
        min: parseInt(match[1]) * 1000,
        max: parseInt(match[2]) * 1000,
      };
    }

    // 匹配固定薪资，如 "15K"
    const singleMatch = salaryDesc.match(/(\d+)[kK千]/);
    if (singleMatch) {
      const salary = parseInt(singleMatch[1]) * 1000;
      return {
        min: salary,
        max: salary,
      };
    }

    return null;
  }

  // 投递简历
  static async submitApplication(userId: string, resumeId: string, jobId: string): Promise<void> {
    try {
      // 获取用户绑定的平台账户
      const account = await DatabaseService.getPlatformAccount(userId, 'boss');
      if (!account || !account.authCookie) {
        throw new Error('请先绑定Boss直聘账户');
      }

      // 获取简历信息
      const resume = await DatabaseService.getResumeById(resumeId, userId);
      if (!resume) {
        throw new Error('简历不存在');
      }

      // 检查是否已投递
      const isApplied = await DatabaseService.checkApplicationExists(userId, 'boss', jobId);
      if (isApplied) {
        throw new Error('该岗位已投递');
      }

      // 获取岗位详情
      const jobDetail = await this.getJobDetail(jobId, account.authCookie);
      
      // 发送投递请求
      const response = await fetch(`${this.BASE_URL}/web/geek/submit`, {
        method: 'POST',
        headers: {
          'Cookie': account.authCookie,
          'User-Agent': this.USER_AGENT,
          'Referer': `${this.BASE_URL}/job_detail/${jobId}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: jobId,
          securityId: jobDetail.securityId,
          expectedSalary: '',
          introduce: '',
        }),
      });

      if (!response.ok) {
        throw new Error('投递请求失败');
      }

      const data = await response.json();
      if (data.code !== 0) {
        throw new Error(data.message || '投递失败');
      }

      // 创建投递记录
      await DatabaseService.createApplication({
        userId,
        resumeId,
        platform: 'boss',
        jobId,
        jobTitle: jobDetail.jobName,
        companyName: jobDetail.brandName,
        location: jobDetail.cityDistrict || jobDetail.cityName,
        salary: jobDetail.salaryDesc,
        salaryMin: this.parseSalary(jobDetail.salaryDesc)?.min,
        salaryMax: this.parseSalary(jobDetail.salaryDesc)?.max,
        status: 'submitted',
        submittedAt: new Date(),
      });

    } catch (error) {
      console.error('Boss直聘投递失败:', error);
      throw new Error(error instanceof Error ? error.message : '投递失败');
    }
  }

  // 获取岗位详情
  private static async getJobDetail(jobId: string, authCookie: string): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/web/geek/job?jobId=${jobId}`, {
        method: 'GET',
        headers: {
          'Cookie': authCookie,
          'User-Agent': this.USER_AGENT,
          'Referer': `${this.BASE_URL}/`,
        },
      });

      if (!response.ok) {
        throw new Error('获取岗位详情失败');
      }

      const data = await response.json();
      if (data.code !== 0 || !data.data) {
        throw new Error('岗位详情获取失败');
      }

      return data.data.zpData.jobDetail;
    } catch (error) {
      console.error('获取Boss直聘岗位详情失败:', error);
      throw new Error('获取岗位详情失败');
    }
  }

  // 检查平台状态
  static async checkPlatformStatus(): Promise<boolean> {
    try {
      const cacheKey = 'boss_platform_status';
      const cachedStatus = await KVService.getPlatformStatus('boss');
      
      if (cachedStatus) {
        // 缓存5分钟内有效
        const now = new Date();
        const cacheTime = new Date(cachedStatus.timestamp);
        if ((now.getTime() - cacheTime.getTime()) < 5 * 60 * 1000) {
          return cachedStatus.status === 'available';
        }
      }

      // 检查平台可访问性
      const response = await fetch(`${this.BASE_URL}/`, {
        method: 'GET',
        headers: {
          'User-Agent': this.USER_AGENT,
        },
      });

      const isAvailable = response.ok;
      
      // 缓存状态
      await KVService.setPlatformStatus('boss', isAvailable ? 'available' : 'unavailable', 300);
      
      return isAvailable;
    } catch (error) {
      console.error('检查Boss直聘平台状态失败:', error);
      await KVService.setPlatformStatus('boss', 'unavailable', 300);
      return false;
    }
  }

  // 获取投递限制
  static getDeliveryLimits(): { dailyLimit: number; intervalMs: number } {
    return {
      dailyLimit: 100, // Boss直聘每日限制100次
      intervalMs: 30000, // 间隔30秒
    };
  }
}
