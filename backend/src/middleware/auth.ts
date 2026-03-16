import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ErrorHandlerMiddleware, UnauthorizedError, ForbiddenError } from './error-handler';

export class AuthMiddleware {
  // 验证用户认证
  static async requireAuth(req: NextApiRequest, res: NextApiResponse): Promise<string> {
    const session = await getSession({ req });
    
    if (!session || !session.user?.id) {
      throw new UnauthorizedError('请先登录');
    }
    
    return session.user.id;
  }
  
  // 验证用户权限
  static async requirePermission(userId: string, permission: string): Promise<void> {
    // 这里可以实现更复杂的权限检查逻辑
    // 目前简化处理，所有登录用户都有基础权限
    
    const basicPermissions = [
      'resume:read',
      'resume:create',
      'resume:update',
      'resume:delete',
      'application:read',
      'application:create',
      'platform:read',
      'platform:create',
      'platform:update',
      'platform:delete',
    ];
    
    if (!basicPermissions.includes(permission)) {
      throw new ForbiddenError('权限不足');
    }
  }
  
  // 验证资源所有权
  static async requireOwnership(
    userId: string,
    resourceType: string,
    resourceId: string
  ): Promise<void> {
    // 这里可以实现资源所有权检查
    // 例如检查简历、投递记录等是否属于当前用户
    
    switch (resourceType) {
      case 'resume':
        // 检查简历是否属于用户
        // const resume = await DatabaseService.getResumeById(resourceId, userId);
        // if (!resume) throw new ForbiddenError('无权访问该简历');
        break;
      case 'application':
        // 检查投递记录是否属于用户
        // const application = await DatabaseService.getApplicationById(resourceId, userId);
        // if (!application) throw new ForbiddenError('无权访问该投递记录');
        break;
      default:
        throw new ForbiddenError('无效的资源类型');
    }
  }
  
  // 创建认证中间件
  static withAuth() {
    return async (req: NextApiRequest, res: NextApiResponse, next: Function) => {
      try {
        const userId = await this.requireAuth(req, res);
        (req as any).userId = userId;
        await next();
      } catch (error) {
        ErrorHandlerMiddleware.handleGlobalError(error as Error, req, res);
      }
    };
  }
  
  // 创建权限中间件
  static withPermission(permission: string) {
    return async (req: NextApiRequest, res: NextApiResponse, next: Function) => {
      try {
        const userId = (req as any).userId || await this.requireAuth(req, res);
        await this.requirePermission(userId, permission);
        await next();
      } catch (error) {
        ErrorHandlerMiddleware.handleGlobalError(error as Error, req, res);
      }
    };
  }
  
  // 创建资源所有权中间件
  static withOwnership(resourceType: string, resourceIdParam: string = 'id') {
    return async (req: NextApiRequest, res: NextApiResponse, next: Function) => {
      try {
        const userId = (req as any).userId || await this.requireAuth(req, res);
        const resourceId = req.query[resourceIdParam] as string;
        
        if (!resourceId) {
          throw new Error('资源ID不能为空');
        }
        
        await this.requireOwnership(userId, resourceType, resourceId);
        await next();
      } catch (error) {
        ErrorHandlerMiddleware.handleGlobalError(error as Error, req, res);
      }
    };
  }
  
  // 可选认证中间件（不强制要求登录）
  static withOptionalAuth() {
    return async (req: NextApiRequest, res: NextApiResponse, next: Function) => {
      try {
        const session = await getSession({ req });
        if (session && session.user?.id) {
          (req as any).userId = session.user.id;
        }
        await next();
      } catch (error) {
        // 可选认证失败时不抛出错误，继续执行
        await next();
      }
    };
  }
}

// 装饰器模式支持
export function requireAuth(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = async function (req: NextApiRequest, res: NextApiResponse) {
    try {
      const userId = await AuthMiddleware.requireAuth(req, res);
      (req as any).userId = userId;
      return method.call(this, req, res);
    } catch (error) {
      ErrorHandlerMiddleware.handleGlobalError(error as Error, req, res);
    }
  };
}

export function requirePermission(permission: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (req: NextApiRequest, res: NextApiResponse) {
      try {
        const userId = (req as any).userId || await AuthMiddleware.requireAuth(req, res);
        await AuthMiddleware.requirePermission(userId, permission);
        return method.call(this, req, res);
      } catch (error) {
        ErrorHandlerMiddleware.handleGlobalError(error as Error, req, res);
      }
    };
  };
}

export function requireOwnership(resourceType: string, resourceIdParam: string = 'id') {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (req: NextApiRequest, res: NextApiResponse) {
      try {
        const userId = (req as any).userId || await AuthMiddleware.requireAuth(req, res);
        const resourceId = req.query[resourceIdParam] as string;
        
        if (!resourceId) {
          throw new Error('资源ID不能为空');
        }
        
        await AuthMiddleware.requireOwnership(userId, resourceType, resourceId);
        return method.call(this, req, res);
      } catch (error) {
        ErrorHandlerMiddleware.handleGlobalError(error as Error, req, res);
      }
    };
  };
}
