import { ApiResponse, PaginatedResponse, User, Resume, PlatformAccount, Job, Application, BatchApplication, DeliveryStrategy, ExportData, ApplicationStats } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // 支持 CORS 凭据
    ...options,
  }

  // 添加认证token
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      }
    }
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw new ApiError(
        data.error?.code || 'UNKNOWN_ERROR',
        data.error?.message || '请求失败',
        data.error?.details
      )
    }

    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('NETWORK_ERROR', '网络请求失败')
  }
}

export const api = {
  // 用户认证
  auth: {
    register: (data: { phone: string; password: string; email?: string }) =>
      request<{ user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    signin: (data: { phone: string; password: string }) =>
      request<{ user: any; expires: string }>('/auth/signin', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    signout: () =>
      request('/auth/signout', { method: 'POST' }),

    me: () =>
      request<User>('/auth/me'),
  },

  // 简历管理
  resumes: {
    upload: (formData: FormData) => {
      const token = localStorage.getItem('token')
      return fetch(`${API_BASE_URL}/resumes/upload`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: formData,
      }).then(res => res.json())
    },

    list: () =>
      request<Resume[]>('/resumes'),

    get: (id: string) =>
      request<Resume>(`/resumes/${id}`),

    setDefault: (id: string) =>
      request(`/resumes/${id}/default`, { method: 'PUT' }),

    delete: (id: string) =>
      request(`/resumes/${id}`, { method: 'DELETE' }),
  },

  // 平台对接
  platforms: {
    bind: (data: { platform: string; authCookie: string; platformUserId?: string }) =>
      request<PlatformAccount>('/platforms/bind', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getStatus: (platform: string) =>
      request<PlatformAccount>(`/platforms/${platform}/status`),

    unbind: (platform: string) =>
      request(`/platforms/${platform}/unbind`, { method: 'DELETE' }),

    getJobs: (platform: string, params: {
      keyword?: string
      location?: string
      salaryMin?: number
      salaryMax?: number
      page?: number
      limit?: number
    }) => {
      const searchParams = new URLSearchParams(params as any).toString()
      return request<PaginatedResponse<Job>>(`/platforms/${platform}/jobs?${searchParams}`)
    },
  },

  // 投递管理
  applications: {
    batch: (data: {
      resumeId: string
      platform: string
      jobIds: string[]
      strategy: any
    }) =>
      request<BatchApplication>('/applications/batch', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getStatus: (batchId: string) =>
      request<BatchApplication>(`/applications/${batchId}/status`),

    getHistory: (params: {
      status?: string
      platform?: string
      startDate?: string
      endDate?: string
      page?: number
      limit?: number
    }) => {
      const searchParams = new URLSearchParams(params as any).toString()
      return request<PaginatedResponse<Application>>(`/applications/history?${searchParams}`)
    },

    getStats: (params?: { period?: string; platform?: string }) => {
      const searchParams = new URLSearchParams(params as any).toString()
      return request(`/applications/stats?${searchParams}`)
    },
  },

  // 系统配置
  settings: {
    getDelivery: () =>
      request('/settings/delivery'),

    updateDelivery: (data: { defaultStrategy: any }) =>
      request('/settings/delivery', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    getSystemStatus: () =>
      request('/system/status'),
  },

  // 数据导出
  export: {
    applications: (params: {
      format: 'csv' | 'json' | 'xlsx'
      startDate?: string
      endDate?: string
      platform?: string
      status?: string
    }) => {
      const searchParams = new URLSearchParams(params as any).toString()
      return request(`/export/applications?${searchParams}`)
    },

    resumes: (params: { format: 'json'; resumeId?: string }) => {
      const searchParams = new URLSearchParams(params as any).toString()
      return request(`/export/resumes?${searchParams}`)
    },
  },
}

export { ApiError }
