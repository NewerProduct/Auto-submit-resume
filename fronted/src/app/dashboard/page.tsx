'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { formatSalary } from '@/lib/utils'
import Link from 'next/link'

interface DashboardStats {
  totalApplications: number
  submittedApplications: number
  viewedApplications: number
  rejectedApplications: number
  successRate: number
  resumeCount: number
  platformCount: number
  todayApplications: number
}

interface RecentApplication {
  id: string
  jobTitle: string
  companyName: string
  platform: string
  salary: string
  status: string
  submittedAt: string
}

export default function DashboardPage() {
  const { user, refreshUser } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, historyResponse] = await Promise.all([
        api.applications.getStats({ period: '7d' }),
        api.applications.getHistory({ page: 1, limit: 5 })
      ])

      if (statsResponse.success && statsResponse.data) {
        const data = statsResponse.data as { summary: any; byDate?: any[] }
        setStats({
          totalApplications: data.summary?.totalApplications || 0,
          submittedApplications: data.summary?.submittedApplications || 0,
          viewedApplications: data.summary?.viewedApplications || 0,
          rejectedApplications: data.summary?.rejectedApplications || 0,
          successRate: data.summary?.successRate || 0,
          resumeCount: user?.resumeCount || 0,
          platformCount: 1, // 暂时固定为1，后续从API获取
          todayApplications: data.byDate?.[0]?.count || 0
        })
      }

      if (historyResponse.success && historyResponse.data) {
        setRecentApplications(historyResponse.data.items)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'text-blue-600 bg-blue-100'
      case 'viewed': return 'text-green-600 bg-green-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted': return '已投递'
      case 'viewed': return '已查看'
      case 'rejected': return '已拒绝'
      default: return '待处理'
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">仪表板</h1>
            <p className="text-gray-600">欢迎回来，{user?.phone}</p>
          </div>
          <div className="flex space-x-3">
            <Link href="/dashboard/resumes">
              <Button>上传简历</Button>
            </Link>
            <Link href="/dashboard/jobs">
              <Button variant="outline">搜索岗位</Button>
            </Link>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总投递数</CardTitle>
              <div className="h-4 w-4 text-blue-600">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
                </svg>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalApplications || 0}</div>
              <p className="text-xs text-gray-600">最近7天</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">成功率</CardTitle>
              <div className="h-4 w-4 text-green-600">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.successRate ? `${(stats.successRate * 100).toFixed(1)}%` : '0%'}
              </div>
              <p className="text-xs text-gray-600">查看/投递比例</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">简历数量</CardTitle>
              <div className="h-4 w-4 text-purple-600">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.resumeCount || 0}</div>
              <p className="text-xs text-gray-600">已上传简历</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日投递</CardTitle>
              <div className="h-4 w-4 text-orange-600">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.todayApplications || 0}</div>
              <p className="text-xs text-gray-600">今天投递的岗位</p>
            </CardContent>
          </Card>
        </div>

        {/* 最近投递记录 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>最近投递</CardTitle>
              <CardDescription>最近的投递记录</CardDescription>
            </CardHeader>
            <CardContent>
              {recentApplications.length > 0 ? (
                <div className="space-y-4">
                  {recentApplications.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{app.jobTitle}</h4>
                        <p className="text-sm text-gray-600">{app.companyName}</p>
                        <p className="text-xs text-gray-500">{app.platform} • {app.salary}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(app.status)}`}>
                          {getStatusText(app.status)}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(app.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>暂无投递记录</p>
                  <Link href="/dashboard/jobs" className="text-blue-600 hover:text-blue-500 mt-2 inline-block">
                    开始搜索岗位
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>快速操作</CardTitle>
              <CardDescription>常用功能快速入口</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/dashboard/resumes">
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="h-8 w-8 text-blue-600 mb-2">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="font-medium">上传简历</h3>
                    <p className="text-sm text-gray-600">管理您的简历</p>
                  </div>
                </Link>

                <Link href="/dashboard/platforms">
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="h-8 w-8 text-green-600 mb-2">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <h3 className="font-medium">平台对接</h3>
                    <p className="text-sm text-gray-600">绑定招聘平台</p>
                  </div>
                </Link>

                <Link href="/dashboard/jobs">
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="h-8 w-8 text-purple-600 mb-2">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A9.001 9.001 0 0112 21a9.001 9.001 0 01-9-9.255A9.001 9.001 0 013 12a9.001 9.001 0 019-9 9.001 9.001 0 019 9.255z" />
                      </svg>
                    </div>
                    <h3 className="font-medium">搜索岗位</h3>
                    <p className="text-sm text-gray-600">查找合适职位</p>
                  </div>
                </Link>

                <Link href="/dashboard/history">
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="h-8 w-8 text-orange-600 mb-2">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="font-medium">投递历史</h3>
                    <p className="text-sm text-gray-600">查看投递记录</p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
