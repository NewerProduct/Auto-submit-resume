import { createClient } from '@supabase/supabase-js';
import {
  User,
  CreateUserParams,
  UpdateUserParams,
  Resume,
  CreateResumeParams,
  PlatformAccount,
  CreatePlatformAccountParams,
  Application,
  CreateApplicationParams,
  BatchDelivery,
  CreateBatchDeliveryParams,
} from '@/types';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// 环境变量验证
if (!supabaseUrl) {
  throw new Error('SUPABASE_URL 环境变量未设置');
}

if (!supabaseAnonKey) {
  throw new Error('SUPABASE_ANON_KEY 环境变量未设置');
}

// 调试信息
console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key exists:', !!supabaseAnonKey);
console.log('Anon Key length:', supabaseAnonKey?.length);

// 客户端实例（用于API调用）
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'Accept': 'application/json',
    },
  },
});

// 服务端实例（使用 service_role key）
export const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'Accept': 'application/json',
    },
  },
});

export class DatabaseService {
  // 用户相关操作
  static async createUser(userData: CreateUserParams): Promise<User> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      console.error('创建用户失败:', error);
      throw new Error('创建用户失败');
    }

    return data;
  }

  static async getUserByPhone(phone: string): Promise<User | null> {
    console.log('getUserByPhone called with phone:', phone);
    
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();

      console.log('getUserByPhone result:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('获取用户失败 - Supabase错误:', error);
        throw new Error(`获取用户失败: ${error.message} (代码: ${error.code || 'UNKNOWN'})`);
      }

      return data;
    } catch (err) {
      console.error('getUserByPhone 意外错误:', {
        error: err,
        errorMessage: err instanceof Error ? err.message : '未知错误',
        errorStack: err instanceof Error ? err.stack : undefined,
        phone
      });
      
      // 如果是网络相关错误，提供更具体的错误信息
      if (err instanceof Error && (
        err.message.includes('fetch failed') || 
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('ENOTFOUND')
      )) {
        throw new Error('数据库连接失败，请检查网络连接和数据库配置');
      }
      
      throw new Error('获取用户失败');
    }
  }

  static async getUserById(id: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('获取用户失败:', error);
      throw new Error('获取用户失败');
    }

    return data;
  }

  static async updateUser(id: string, userData: UpdateUserParams): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({ ...userData, updatedAt: new Date() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('更新用户失败:', error);
      throw new Error('更新用户失败');
    }

    return data;
  }

  static async deleteUser(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('删除用户失败:', error);
      throw new Error('删除用户失败');
    }
  }

  // 简历相关操作
  static async createResume(resumeData: CreateResumeParams): Promise<Resume> {
    const { data, error } = await supabase
      .from('resumes')
      .insert(resumeData)
      .select()
      .single();

    if (error) {
      console.error('创建简历失败:', error);
      throw new Error('创建简历失败');
    }

    return data;
  }

  static async getUserResumes(userId: string): Promise<Resume[]> {
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取简历列表失败:', error);
      throw new Error('获取简历列表失败');
    }

    return data || [];
  }

  static async getResumeById(id: string, userId?: string): Promise<Resume | null> {
    let query = supabaseAdmin.from('resumes').select('*').eq('id', id);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      console.error('获取简历失败:', error);
      throw new Error('获取简历失败');
    }

    return data;
  }

  static async updateResume(id: string, userId: string, resumeData: Partial<CreateResumeParams>): Promise<Resume> {
    const { data, error } = await supabase
      .from('resumes')
      .update(resumeData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('更新简历失败:', error);
      throw new Error('更新简历失败');
    }

    return data;
  }

  static async deleteResume(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('resumes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('删除简历失败:', error);
      throw new Error('删除简历失败');
    }
  }

  static async setDefaultResume(userId: string, resumeId: string): Promise<void> {
    // 先取消所有默认简历
    await supabase
      .from('resumes')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true);

    // 设置新的默认简历
    const { error } = await supabase
      .from('resumes')
      .update({ is_default: true })
      .eq('id', resumeId)
      .eq('user_id', userId);

    if (error) {
      console.error('设置默认简历失败:', error);
      throw new Error('设置默认简历失败');
    }
  }

  static async getDefaultResume(userId: string): Promise<Resume | null> {
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('获取默认简历失败:', error);
      throw new Error('获取默认简历失败');
    }

    return data;
  }

  // 平台账户相关操作
  static async bindPlatformAccount(accountData: CreatePlatformAccountParams): Promise<PlatformAccount> {
    const { data, error } = await supabase
      .from('platform_accounts')
      .insert(accountData)
      .select()
      .single();

    if (error) {
      console.error('绑定平台账户失败:', error);
      throw new Error('绑定平台账户失败');
    }

    return data;
  }

  static async getUserPlatformAccounts(userId: string): Promise<PlatformAccount[]> {
    const { data, error } = await supabase
      .from('platform_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取平台账户失败:', error);
      throw new Error('获取平台账户失败');
    }

    return data || [];
  }

  static async getPlatformAccount(userId: string, platform: string): Promise<PlatformAccount | null> {
    const { data, error } = await supabase
      .from('platform_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('获取平台账户失败:', error);
      throw new Error('获取平台账户失败');
    }

    return data;
  }

  static async updatePlatformAccount(id: string, userId: string, accountData: Partial<CreatePlatformAccountParams>): Promise<PlatformAccount> {
    const { data, error } = await supabase
      .from('platform_accounts')
      .update({ ...accountData, updatedAt: new Date() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('更新平台账户失败:', error);
      throw new Error('更新平台账户失败');
    }

    return data;
  }

  static async unbindPlatformAccount(userId: string, platform: string): Promise<void> {
    const { error } = await supabase
      .from('platform_accounts')
      .delete()
      .eq('user_id', userId)
      .eq('platform', platform);

    if (error) {
      console.error('解绑平台账户失败:', error);
      throw new Error('解绑平台账户失败');
    }
  }

  // 投递记录相关操作
  static async createApplication(applicationData: CreateApplicationParams): Promise<Application> {
    const { data, error } = await supabase
      .from('applications')
      .insert(applicationData)
      .select()
      .single();

    if (error) {
      console.error('创建投递记录失败:', error);
      throw new Error('创建投递记录失败');
    }

    return data;
  }

  static async getUserApplications(
    userId: string,
    options: {
      status?: string;
      platform?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
      resumeId?: string;
    } = {}
  ): Promise<{ items: Application[]; total: number }> {
    let query = supabase
      .from('applications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // 添加筛选条件
    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.platform) {
      query = query.eq('platform', options.platform);
    }
    if (options.startDate) {
      query = query.gte('submitted_at', options.startDate);
    }
    if (options.endDate) {
      query = query.lte('submitted_at', options.endDate);
    }
    if (options.resumeId) {
      query = query.eq('resume_id', options.resumeId);
    }

    // 排序和分页
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    query = query
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('获取投递记录失败:', error);
      throw new Error('获取投递记录失败');
    }

    return {
      items: data || [],
      total: count || 0,
    };
  }

  static async updateApplicationStatus(id: string, userId: string, status: Application['status']): Promise<Application> {
    const { data, error } = await supabase
      .from('applications')
      .update({ status, updatedAt: new Date() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('更新投递状态失败:', error);
      throw new Error('更新投递状态失败');
    }

    return data;
  }

  static async checkApplicationExists(userId: string, platform: string, jobId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('applications')
      .select('id')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('job_id', jobId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('检查投递记录失败:', error);
      throw new Error('检查投递记录失败');
    }

    return !!data;
  }

  // 批量投递相关操作
  static async createBatchDelivery(batchData: CreateBatchDeliveryParams): Promise<BatchDelivery> {
    const { data, error } = await supabase
      .from('batch_deliveries')
      .insert(batchData)
      .select()
      .single();

    if (error) {
      console.error('创建批量投递失败:', error);
      throw new Error('创建批量投递失败');
    }

    return data;
  }

  static async getBatchDelivery(id: string, userId: string): Promise<BatchDelivery | null> {
    const { data, error } = await supabase
      .from('batch_deliveries')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('获取批量投递失败:', error);
      throw new Error('获取批量投递失败');
    }

    return data;
  }

  static async updateBatchDelivery(id: string, userId: string, updateData: Partial<BatchDelivery>): Promise<BatchDelivery> {
    const { data, error } = await supabase
      .from('batch_deliveries')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('更新批量投递失败:', error);
      throw new Error('更新批量投递失败');
    }

    return data;
  }

  // 统计相关操作
  static async getApplicationStats(userId: string, period: string = '7d'): Promise<any> {
    const startDate = new Date();
    const days = parseInt(period.replace('d', ''));
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('applications')
      .select('status, platform, submitted_at')
      .eq('user_id', userId)
      .gte('submitted_at', startDate.toISOString());

    if (error) {
      console.error('获取投递统计失败:', error);
      throw new Error('获取投递统计失败');
    }

    return data || [];
  }
}
