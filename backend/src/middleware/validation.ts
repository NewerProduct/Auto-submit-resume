import { NextApiRequest, NextApiResponse } from 'next';
import { ErrorHandlerMiddleware, ValidationError } from './error-handler';
import Joi from 'joi';

export class ValidationMiddleware {
  // 通用验证中间件
  static validateBody(schema: Joi.ObjectSchema) {
    return async (req: NextApiRequest, res: NextApiResponse, next: Function) => {
      try {
        const { error, value } = schema.validate(req.body, {
          abortEarly: false, // 返回所有验证错误
          stripUnknown: true, // 移除未知字段
        });
        
        if (error) {
          const errorMessage = error.details
            .map(detail => detail.message)
            .join('; ');
          throw new ValidationError(errorMessage);
        }
        
        // 将验证后的值替换原始请求体
        req.body = value;
        await next();
      } catch (error) {
        ErrorHandlerMiddleware.handleGlobalError(error as Error, req, res);
      }
    };
  }
  
  // 验证查询参数
  static validateQuery(schema: Joi.ObjectSchema) {
    return async (req: NextApiRequest, res: NextApiResponse, next: Function) => {
      try {
        const { error, value } = schema.validate(req.query, {
          abortEarly: false,
          stripUnknown: true,
        });
        
        if (error) {
          const errorMessage = error.details
            .map(detail => detail.message)
            .join('; ');
          throw new ValidationError(errorMessage);
        }
        
        // 将验证后的值替换原始查询参数
        req.query = value;
        await next();
      } catch (error) {
        ErrorHandlerMiddleware.handleGlobalError(error as Error, req, res);
      }
    };
  }
  
  // 验证路径参数
  static validateParams(schema: Joi.ObjectSchema) {
    return async (req: NextApiRequest, res: NextApiResponse, next: Function) => {
      try {
        const params = req.query as any; // Next.js API路由中params在query中
        const { error, value } = schema.validate(params, {
          abortEarly: false,
          stripUnknown: true,
        });
        
        if (error) {
          const errorMessage = error.details
            .map(detail => detail.message)
            .join('; ');
          throw new ValidationError(errorMessage);
        }
        
        // 将验证后的值替换原始路径参数
        req.query = value;
        await next();
      } catch (error) {
        ErrorHandlerMiddleware.handleGlobalError(error as Error, req, res);
      }
    };
  }
}

// 常用验证模式
export const ValidationSchemas = {
  // 用户注册验证
  userRegister: Joi.object({
    phone: Joi.string()
      .pattern(/^1[3-9]\d{9}$/)
      .required()
      .messages({
        'string.pattern.base': '手机号格式不正确',
        'any.required': '手机号不能为空',
      }),
    password: Joi.string()
      .min(6)
      .max(50)
      .required()
      .messages({
        'string.min': '密码长度至少6位',
        'string.max': '密码长度不能超过50位',
        'any.required': '密码不能为空',
      }),
    email: Joi.string()
      .email()
      .optional()
      .messages({
        'string.email': '邮箱格式不正确',
      }),
  }),
  
  // 用户登录验证
  userLogin: Joi.object({
    phone: Joi.string()
      .pattern(/^1[3-9]\d{9}$/)
      .required()
      .messages({
        'string.pattern.base': '手机号格式不正确',
        'any.required': '手机号不能为空',
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': '密码不能为空',
      }),
  }),
  
  // 修改密码验证
  changePassword: Joi.object({
    oldPassword: Joi.string()
      .required()
      .messages({
        'any.required': '旧密码不能为空',
      }),
    newPassword: Joi.string()
      .min(6)
      .max(50)
      .required()
      .messages({
        'string.min': '新密码长度至少6位',
        'string.max': '新密码长度不能超过50位',
        'any.required': '新密码不能为空',
      }),
  }),
  
  // 平台绑定验证
  platformBind: Joi.object({
    platform: Joi.string()
      .valid('boss', 'zhilian', 'liepin')
      .required()
      .messages({
        'any.only': '不支持的平台类型',
        'any.required': '平台不能为空',
      }),
    authCookie: Joi.string()
      .required()
      .messages({
        'any.required': 'Cookie不能为空',
      }),
    platformUserId: Joi.string()
      .optional(),
  }),
  
  // 批量投递验证
  batchDelivery: Joi.object({
    resumeId: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': '简历ID格式不正确',
        'any.required': '简历ID不能为空',
      }),
    platform: Joi.string()
      .valid('boss', 'zhilian', 'liepin')
      .required()
      .messages({
        'any.only': '不支持的平台类型',
        'any.required': '平台不能为空',
      }),
    jobIds: Joi.array()
      .items(Joi.string().required())
      .min(1)
      .max(50)
      .required()
      .messages({
        'array.min': '请选择要投递的岗位',
        'array.max': '单次最多投递50个岗位',
        'any.required': '岗位列表不能为空',
      }),
    strategy: Joi.object({
      type: Joi.string()
        .valid('aggressive', 'conservative', 'balanced')
        .default('balanced'),
      dailyLimit: Joi.number()
        .integer()
        .min(1)
        .max(200)
        .default(50),
      intervalMs: Joi.number()
        .integer()
        .min(10000)
        .max(300000)
        .default(30000),
      skipDuplicates: Joi.boolean()
        .default(true),
    }).required(),
  }),
  
  // 岗位搜索验证
  jobSearch: Joi.object({
    keyword: Joi.string()
      .optional()
      .max(100),
    location: Joi.string()
      .optional()
      .max(50),
    salaryMin: Joi.number()
      .integer()
      .min(0)
      .optional(),
    salaryMax: Joi.number()
      .integer()
      .min(0)
      .optional(),
    experience: Joi.string()
      .optional(),
    education: Joi.string()
      .optional(),
    page: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(1),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .default(20),
  }),
  
  // 投递历史查询验证
  applicationHistory: Joi.object({
    status: Joi.string()
      .valid('pending', 'submitted', 'viewed', 'rejected')
      .optional(),
    platform: Joi.string()
      .valid('boss', 'zhilian', 'liepin')
      .optional(),
    startDate: Joi.date()
      .optional(),
    endDate: Joi.date()
      .optional(),
    page: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(1),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .default(20),
  }),
  
  // UUID参数验证
  uuidParam: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'ID格式不正确',
        'any.required': 'ID不能为空',
      }),
  }),
  
  // 平台参数验证
  platformParam: Joi.object({
    platform: Joi.string()
      .valid('boss', 'zhilian', 'liepin')
      .required()
      .messages({
        'any.only': '不支持的平台类型',
        'any.required': '平台不能为空',
      }),
  }),
  
  // 分页参数验证
  pagination: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(1),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .default(20),
  }),
  
  // 日期范围验证
  dateRange: Joi.object({
    startDate: Joi.date()
      .optional(),
    endDate: Joi.date()
      .optional()
      .when('startDate', {
        is: Joi.exist(),
        then: Joi.date().min(Joi.ref('startDate')),
        otherwise: Joi.date(),
      }),
  }),
};

// 装饰器模式支持
export function validateBody(schema: Joi.ObjectSchema) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (req: NextApiRequest, res: NextApiResponse) {
      try {
        const { error, value } = schema.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
        });
        
        if (error) {
          const errorMessage = error.details
            .map(detail => detail.message)
            .join('; ');
          throw new ValidationError(errorMessage);
        }
        
        req.body = value;
        return method.call(this, req, res);
      } catch (error) {
        ErrorHandlerMiddleware.handleGlobalError(error as Error, req, res);
      }
    };
  };
}

export function validateQuery(schema: Joi.ObjectSchema) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (req: NextApiRequest, res: NextApiResponse) {
      try {
        const { error, value } = schema.validate(req.query, {
          abortEarly: false,
          stripUnknown: true,
        });
        
        if (error) {
          const errorMessage = error.details
            .map(detail => detail.message)
            .join('; ');
          throw new ValidationError(errorMessage);
        }
        
        req.query = value;
        return method.call(this, req, res);
      } catch (error) {
        ErrorHandlerMiddleware.handleGlobalError(error as Error, req, res);
      }
    };
  };
}
