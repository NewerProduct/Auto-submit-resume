import { kv } from '@vercel/kv';
import { RateLimitInfo } from '@/types';

// 检查 KV 环境变量是否可用
const isKvAvailable = () => {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
};

export class KVService {
  // 频率限制相关操作
  static async checkRateLimit(userId: string, platform: string, limit: number): Promise<RateLimitInfo> {
    if (!isKvAvailable()) {
      // 如果 KV 不可用，返回默认值（不限制）
      return {
        platform,
        dailyLimit: limit,
        usedToday: 0,
        remaining: limit,
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }

    const key = `rate_limit:${userId}:${platform}`;
    const dateKey = `rate_limit:${userId}:${platform}:${new Date().toISOString().split('T')[0]}`;
    
    // 获取今日使用次数
    const todayCount = await kv.get(dateKey) as string;
    const usedToday = todayCount ? parseInt(todayCount) : 0;
    
    // 检查是否超过限制
    if (usedToday >= limit) {
      return {
        platform,
        dailyLimit: limit,
        usedToday,
        remaining: 0,
        resetTime: this.getTomorrowMidnight(),
      };
    }
    
    // 增加使用次数
    const newCount = await kv.incr(dateKey);
    if (newCount === 1) {
      // 设置过期时间为明天午夜
      await kv.expire(dateKey, this.getSecondsUntilTomorrowMidnight());
    }
    
    return {
      platform,
      dailyLimit: limit,
      usedToday: newCount,
      remaining: Math.max(0, limit - newCount),
      resetTime: this.getTomorrowMidnight(),
    };
  }
  
  static async getRateLimitInfo(userId: string, platform: string, limit: number): Promise<RateLimitInfo> {
    if (!isKvAvailable()) {
      return {
        platform,
        dailyLimit: limit,
        usedToday: 0,
        remaining: limit,
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }

    const dateKey = `rate_limit:${userId}:${platform}:${new Date().toISOString().split('T')[0]}`;
    const todayCount = await kv.get(dateKey) as string;
    const usedToday = todayCount ? parseInt(todayCount) : 0;
    
    return {
      platform,
      dailyLimit: limit,
      usedToday,
      remaining: Math.max(0, limit - usedToday),
      resetTime: this.getTomorrowMidnight(),
    };
  }
  
  // 缓存相关操作
  static async setCache(key: string, value: any, ttl?: number): Promise<void> {
    if (!isKvAvailable()) {
      return; // 静默失败
    }
    
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await kv.setex(key, ttl, serializedValue);
    } else {
      await kv.set(key, serializedValue);
    }
  }
  
  static async getCache<T>(key: string): Promise<T | null> {
    if (!isKvAvailable()) {
      return null;
    }
    
    const value = await kv.get(key) as string;
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  
  static async deleteCache(key: string): Promise<void> {
    if (!isKvAvailable()) {
      return; // 静默失败
    }
    
    await kv.del(key);
  }
  
  static async clearCache(pattern: string): Promise<void> {
    if (!isKvAvailable()) {
      return; // 静默失败
    }
    
    const keys = await kv.keys(pattern);
    if (keys.length > 0) {
      await kv.del(...keys);
    }
  }
  
  // 用户会话相关操作
  static async setUserSession(userId: string, sessionData: any, ttl: number = 86400): Promise<void> {
    const key = `session:${userId}`;
    await this.setCache(key, sessionData, ttl);
  }
  
  static async getUserSession(userId: string): Promise<any | null> {
    const key = `session:${userId}`;
    return this.getCache(key);
  }
  
  static async deleteUserSession(userId: string): Promise<void> {
    const key = `session:${userId}`;
    await this.deleteCache(key);
  }
  
  // 平台状态缓存
  static async setPlatformStatus(platform: string, status: 'available' | 'unavailable', ttl: number = 300): Promise<void> {
    const key = `platform_status:${platform}`;
    await this.setCache(key, { status, timestamp: new Date() }, ttl);
  }
  
  static async getPlatformStatus(platform: string): Promise<{ status: 'available' | 'unavailable'; timestamp: Date } | null> {
    const key = `platform_status:${platform}`;
    return this.getCache(key);
  }
  
  // 批量操作状态缓存
  static async setBatchDeliveryStatus(batchId: string, status: any, ttl: number = 3600): Promise<void> {
    const key = `batch_delivery:${batchId}`;
    await this.setCache(key, status, ttl);
  }
  
  static async getBatchDeliveryStatus(batchId: string): Promise<any | null> {
    const key = `batch_delivery:${batchId}`;
    return this.getCache(key);
  }
  
  static async deleteBatchDeliveryStatus(batchId: string): Promise<void> {
    const key = `batch_delivery:${batchId}`;
    await this.deleteCache(key);
  }
  
  // 工具方法
  private static getTomorrowMidnight(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
  
  private static getSecondsUntilTomorrowMidnight(): number {
    const tomorrowMidnight = this.getTomorrowMidnight();
    const now = new Date();
    return Math.floor((tomorrowMidnight.getTime() - now.getTime()) / 1000);
  }
  
  // 统计数据缓存
  static async setUserStats(userId: string, stats: any, ttl: number = 300): Promise<void> {
    const key = `user_stats:${userId}`;
    await this.setCache(key, stats, ttl);
  }
  
  static async getUserStats(userId: string): Promise<any | null> {
    const key = `user_stats:${userId}`;
    return this.getCache(key);
  }
  
  // 系统状态缓存
  static async setSystemStatus(status: any, ttl: number = 60): Promise<void> {
    const key = 'system_status';
    await this.setCache(key, status, ttl);
  }
  
  static async getSystemStatus(): Promise<any | null> {
    const key = 'system_status';
    return this.getCache(key);
  }
  
  // API限流
  static async checkApiRateLimit(ip: string, endpoint: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    if (!isKvAvailable()) {
      // 如果 KV 不可用，允许所有请求
      return {
        allowed: true,
        remaining: limit,
        resetTime: new Date(Date.now() + windowMs),
      };
    }

    const key = `api_rate_limit:${ip}:${endpoint}`;
    const windowKey = `api_rate_limit:${ip}:${endpoint}:${Math.floor(Date.now() / windowMs)}`;
    
    const currentCount = await kv.get(windowKey) as string;
    const count = currentCount ? parseInt(currentCount) : 0;
    
    if (count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(Date.now() + windowMs),
      };
    }
    
    const newCount = await kv.incr(windowKey);
    if (newCount === 1) {
      await kv.expire(windowKey, Math.ceil(windowMs / 1000));
    }
    
    return {
      allowed: true,
      remaining: Math.max(0, limit - newCount),
      resetTime: new Date(Date.now() + windowMs),
    };
  }
}
