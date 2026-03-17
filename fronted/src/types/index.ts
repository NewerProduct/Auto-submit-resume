export interface User {
  id: string
  phone: string
  email?: string
  createdAt: string
  resumeCount?: number
  applicationCount?: number
}

export interface Resume {
  id: string
  name: string
  fileUrl: string
  content?: string
  isDefault: boolean
  createdAt: string
  fileSize: number
  applicationCount?: number
  parsedData?: {
    name: string
    phone: string
    email: string
    education: string
    experience: string
    skills: string[]
  }
}

export interface PlatformAccount {
  id: string
  platform: 'boss' | 'zhilian' | 'liepin'
  platformUserId?: string
  isBound: boolean
  expiresAt?: string
  lastSyncAt?: string
}

export interface Job {
  jobId: string
  title: string
  companyName: string
  location: string
  salary: string
  salaryMin?: number
  salaryMax?: number
  experience: string
  education: string
  description: string
  publishTime: string
  isApplied: boolean
}

export interface Application {
  id: string
  resumeId: string
  resumeName: string
  platform: string
  jobId: string
  jobTitle: string
  companyName: string
  location: string
  salary: string
  status: 'pending' | 'submitted' | 'viewed' | 'rejected'
  submittedAt: string
  updatedAt: string
}

export interface DeliveryStrategy {
  type: 'aggressive' | 'conservative' | 'balanced'
  dailyLimit: number
  intervalMs: number
  skipDuplicates: boolean
}

export interface BatchApplication {
  batchId: string
  totalJobs: number
  status: 'processing' | 'completed' | 'failed'
  estimatedDuration?: string
  progress?: {
    completed: number
    failed: number
    pending: number
  }
  jobs: {
    jobId: string
    status: 'pending' | 'submitted' | 'failed'
    priority: number
  }[]
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
    details?: any
  }
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: Pagination
}

export interface ExportData {
  downloadUrl: string
  filename: string
}

export interface ApplicationStats {
  summary: {
    totalApplications: number
    submittedApplications: number
    viewedApplications: number
    rejectedApplications: number
    successRate: number
  }
  period: string
}
