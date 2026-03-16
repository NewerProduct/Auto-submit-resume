import { NextApiRequest, NextApiResponse } from 'next';
import { KVService } from '@/lib/kv';
import { RateLimitConfig } from '@/types';

// 频率限制配置
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  'api/auth/signin': { windowMs: 900000, maxRequests: 5, message: '登录尝试过于频繁，请15分钟后再试' },
  'api/auth/register': { windowMs: 900000, maxRequests: 3, message: '注册尝试过于频繁，请15分钟后再试' },
  'api/resumes/upload': { windowMs: 3600000, maxRequests: 10, message: '上传过于频繁，请1小时后再试' },
  'api/applications/batch': { windowMs: 86400000, maxRequests: 100, message: '今日投递次数已达上限' },
  'api/platforms/bind': { windowMs: 3600000, maxRequests: 5, message: '绑定平台过于频繁，请1小时后再试' },
};

export class RateLimitMiddleware {
  // 检查API频率限制
  static async checkApiRateLimit(
    req: NextApiRequest,
    res: NextApiResponse,
    endpoint: string
  ): Promise<boolean> {
    const config = RATE_LIMIT_CONFIGS[endpoint];
    
    if (!config) {
      return true; // 没有配置限制，直接通过
    }
    
    // 获取客户端IP
    const ip = this.getClientIP(req);
    
    try {
      const result = await KVService.checkApiRateLimit(ip, endpoint, config.maxRequests, config.windowMs);
      
      if (!result.allowed) {
        // 设置响应头
        res.setHeader('X-RateLimit-Limit', config.maxRequests);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime.getTime() / 1000));
        
        // 返回429状态码
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: config.message,
            details: {
              limit: config.maxRequests,
              windowMs: config.windowMs,
              resetTime: result.resetTime,
            },
          },
        });
        
        return false;
      }
      
      // 设置响应头（允许通过时也设置信息头）
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime.getTime() / 1000));
      
      return true;
    } catch (error) {
      console.error('频率限制检查失败:', error);
      // 出错时允许通过，避免影响正常使用
      return true;
    }
  }
  
  // 检查用户投递频率限制
  static async checkUserDeliveryLimit(
    userId: string,
    platform: string,
    limit: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    try {
      const rateLimitInfo = await KVService.checkRateLimit(userId, platform, limit);
      
      return {
        allowed: rateLimitInfo.remaining > 0,
        remaining: rateLimitInfo.remaining,
        resetTime: rateLimitInfo.resetTime,
      };
    } catch (error) {
      console.error('用户投递频率限制检查失败:', error);
      // 出错时允许通过
      return {
        allowed: true,
        remaining: limit,
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }
  }
  
  // 获取客户端IP
  private static getClientIP(req: NextApiRequest): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIP = req.headers['x-real-ip'] as string;
    const remoteAddr = req.connection.remoteAddress;
    
    if (forwarded) {
      // X-Forwarded-For 可能包含多个IP，取第一个
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    if (remoteAddr) {
      return remoteAddr;
    }
    
    return '127.0.0.1'; // 默认值
  }
  
  // 创建频率限制中间件
  static createRateLimitMiddleware(endpoint: string) {
    return async (req: NextApiRequest, res: NextApiResponse, next: Function) => {
      const allowed = await this.checkApiRateLimit(req, res, endpoint);
      
      if (allowed) {
        await next();
      }
      // 如果不允许，已经在checkApiRateLimit中发送了响应
    };
  }
}

// 使用装饰器模式为API路由添加频率限制
export function withRateLimit(endpoint: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (req: NextApiRequest, res: NextApiResponse) {
      const allowed = await RateLimitMiddleware.checkApiRateLimit(req, res, endpoint);
      
      if (allowed) {
        return method.call(this, req, res);
      }
    };
  };
}
