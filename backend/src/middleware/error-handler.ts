import { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse, ErrorLog } from '@/types';

export class ErrorHandlerMiddleware {
  // 全局错误处理中间件
  static handleGlobalError(
    error: Error,
    req: NextApiRequest,
    res: NextApiResponse
  ): void {
    console.error('API错误:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      headers: req.headers,
      body: req.body,
    });
    
    // 记录错误日志
    this.logError(error, req);
    
    // 根据错误类型返回不同的响应
    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
      return;
    }
    
    if (error.name === 'UnauthorizedError') {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: '请先登录',
        },
      });
      return;
    }
    
    if (error.name === 'ForbiddenError') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '权限不足',
        },
      });
      return;
    }
    
    if (error.name === 'NotFoundError') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message || '资源不存在',
        },
      });
      return;
    }
    
    if (error.name === 'RateLimitError') {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: error.message || '请求过于频繁',
        },
      });
      return;
    }
    
    // 默认服务器错误
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
      },
    });
  }
  
  // 记录错误日志
  private static async logError(error: Error, req: NextApiRequest): Promise<void> {
    try {
      const errorLog: ErrorLog = {
        error,
        endpoint: req.url || '',
        method: req.method || '',
        userId: this.extractUserId(req),
        requestBody: req.body,
        stackTrace: error.stack || '',
        timestamp: new Date(),
      };
      
      // 这里可以将错误日志保存到数据库或日志服务
      console.error('错误日志:', JSON.stringify(errorLog, null, 2));
      
      // 在生产环境中，可以将错误发送到监控服务
      if (process.env.NODE_ENV === 'production') {
        // 例如：发送到Sentry、LogRocket等
        // Sentry.captureException(error, { extra: { request: req } });
      }
    } catch (logError) {
      console.error('记录错误日志失败:', logError);
    }
  }
  
  // 从请求中提取用户ID
  private static extractUserId(req: NextApiRequest): string | undefined {
    // 从会话中提取用户ID
    if (req.headers.cookie) {
      // 这里可以解析cookie获取用户信息
      // 简化处理，实际项目中需要更安全的解析方式
      return undefined;
    }
    
    return undefined;
  }
  
  // 创建错误处理包装器
  static withErrorHandler(handler: Function) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      try {
        await handler(req, res);
      } catch (error) {
        this.handleGlobalError(error as Error, req, res);
      }
    };
  }
  
  // 自定义错误类
  static createError(code: string, message: string, statusCode: number = 500): Error {
    const error = new Error(message) as any;
    error.code = code;
    error.statusCode = statusCode;
    return error;
  }
}

// 常用错误类型
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = '请先登录') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = '权限不足') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = '资源不存在') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string = '请求过于频繁') {
    super(message);
    this.name = 'RateLimitError';
  }
}

// API响应工具类
export class ResponseHelper {
  static success<T>(res: NextApiResponse, data?: T, message?: string): void {
    res.status(200).json({
      success: true,
      data,
      message,
    });
  }
  
  static created<T>(res: NextApiResponse, data?: T, message?: string): void {
    res.status(201).json({
      success: true,
      data,
      message,
    });
  }
  
  static badRequest(res: NextApiResponse, message: string, code: string = 'VALIDATION_ERROR'): void {
    res.status(400).json({
      success: false,
      error: {
        code,
        message,
      },
    });
  }
  
  static unauthorized(res: NextApiResponse, message: string = '请先登录'): void {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message,
      },
    });
  }
  
  static forbidden(res: NextApiResponse, message: string = '权限不足'): void {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message,
      },
    });
  }
  
  static notFound(res: NextApiResponse, message: string = '资源不存在'): void {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message,
      },
    });
  }
  
  static rateLimit(res: NextApiResponse, message: string = '请求过于频繁'): void {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
      },
    });
  }
  
  static internalError(res: NextApiResponse, message: string = '服务器内部错误'): void {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message,
      },
    });
  }
}
