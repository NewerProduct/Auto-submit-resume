// 用户相关类型
export interface User {
  id: string;
  phone: string;
  email?: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserParams {
  phone: string;
  email?: string;
  passwordHash: string;
}

export interface UpdateUserParams {
  email?: string;
  passwordHash?: string;
  updatedAt?: Date;
}

// 简历相关类型
export interface Resume {
  id: string;
  userId: string;
  name: string;
  fileUrl: string;
  content?: string;
  parsedData?: ParsedResumeData;
  isDefault: boolean;
  createdAt: Date;
  fileSize: number;
}

export interface ParsedResumeData {
  name?: string;
  phone?: string;
  email?: string;
  education?: string;
  experience?: string;
  skills?: string[];
  location?: string;
  expectedSalary?: string;
}

export interface CreateResumeParams {
  userId: string;
  name: string;
  fileUrl: string;
  content?: string;
  parsedData?: ParsedResumeData;
  isDefault?: boolean;
  fileSize: number;
}

// 平台相关类型
export interface PlatformAccount {
  id: string;
  userId: string;
  platform: 'boss' | 'zhilian' | 'liepin';
  platformUserId?: string;
  authToken?: string;
  authCookie?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlatformAccountParams {
  userId: string;
  platform: 'boss' | 'zhilian' | 'liepin';
  platformUserId?: string;
  authToken?: string;
  authCookie?: string;
  expiresAt?: Date;
}

// 投递相关类型
export interface Application {
  id: string;
  userId: string;
  resumeId: string;
  platform: string;
  jobId: string;
  jobTitle?: string;
  companyName?: string;
  location?: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  status: 'pending' | 'submitted' | 'viewed' | 'rejected';
  submittedAt?: Date;
  updatedAt: Date;
}

export interface CreateApplicationParams {
  userId: string;
  resumeId: string;
  platform: string;
  jobId: string;
  jobTitle?: string;
  companyName?: string;
  location?: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  status?: 'pending' | 'submitted' | 'viewed' | 'rejected';
  submittedAt?: Date;
}

// 批量投递相关类型
export interface DeliveryStrategy {
  type: 'aggressive' | 'conservative' | 'balanced';
  dailyLimit: number;
  intervalMs: number;
  skipDuplicates: boolean;
}

export interface BatchDelivery {
  id: string;
  userId: string;
  resumeId: string;
  platform: string;
  jobIds: string[];
  strategy: DeliveryStrategy;
  status: 'processing' | 'completed' | 'failed' | 'cancelled';
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface CreateBatchDeliveryParams {
  userId: string;
  resumeId: string;
  platform: string;
  jobIds: string[];
  strategy: DeliveryStrategy;
}

// 岗位相关类型
export interface Job {
  jobId: string;
  title: string;
  companyName: string;
  location: string;
  salary: string;
  salaryMin?: number;
  salaryMax?: number;
  experience?: string;
  education?: string;
  description?: string;
  publishTime?: Date;
  isApplied?: boolean;
}

export interface JobSearchParams {
  keyword?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  experience?: string;
  education?: string;
  page?: number;
  limit?: number;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 统计相关类型
export interface ApplicationStats {
  summary: {
    totalApplications: number;
    submittedApplications: number;
    viewedApplications: number;
    rejectedApplications: number;
    successRate: number;
  };
  byPlatform: Array<{
    platform: string;
    total: number;
    submitted: number;
    viewed: number;
    rejected: number;
  }>;
  byDate: Array<{
    date: string;
    count: number;
    success: number;
  }>;
  rateLimit: {
    platform: string;
    dailyLimit: number;
    usedToday: number;
    remaining: number;
  };
}

// 频率限制类型
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

export interface RateLimitInfo {
  platform: string;
  dailyLimit: number;
  usedToday: number;
  remaining: number;
  resetTime: Date;
}

// 系统状态类型
export interface SystemStatus {
  version: string;
  environment: string;
  database: 'connected' | 'disconnected';
  cache: 'connected' | 'disconnected';
  storage: 'connected' | 'disconnected';
  platforms: Record<string, {
    status: 'available' | 'unavailable';
    lastCheck: Date;
  }>;
  rateLimits: Record<string, RateLimitInfo>;
}

// 错误日志类型
export interface ErrorLog {
  error: Error;
  endpoint: string;
  method: string;
  userId?: string;
  requestBody?: any;
  stackTrace: string;
  timestamp: Date;
}

// API指标类型
export interface ApiMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userId?: string;
  timestamp: Date;
  userAgent: string;
  ipAddress: string;
}

// 导出相关类型
export interface ExportRequest {
  format: 'csv' | 'json' | 'xlsx';
  startDate?: string;
  endDate?: string;
  platform?: string;
  status?: string;
  resumeId?: string;
}

export interface ExportResponse {
  downloadUrl: string;
  filename: string;
  fileSize: number;
  expiresAt: Date;
}

// Webhook类型
export interface WebhookPayload {
  platform: string;
  applicationId: string;
  jobId: string;
  status: string;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// 配置类型
export interface DeliveryConfig {
  defaultStrategy: DeliveryStrategy;
  platformLimits: Record<string, {
    dailyLimit: number;
    intervalMs: number;
  }>;
}
