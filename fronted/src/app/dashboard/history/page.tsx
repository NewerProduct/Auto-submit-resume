'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { Application } from '@/types'
import { formatDate } from '@/lib/utils'
import { 
  ChartBarIcon,
  EyeIcon,
  DocumentTextIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待处理' },
  { value: 'submitted', label: '已投递' },
  { value: 'viewed', label: '已查看' },
  { value: 'rejected', label: '已拒绝' }
]

const platformOptions = [
  { value: '', label: '全部平台' },
  { value: 'boss', label: 'Boss直聘' },
  { value: 'zhilian', label: '智联招聘' },
  { value: 'liepin', label: '猎聘' }
]

const periodOptions = [
  { value: '7d', label: '最近7天' },
  { value: '30d', label: '最近30天' },
  { value: '90d', label: '最近90天' },
  { value: 'all', label: '全部时间' }
]

export default function HistoryPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // 筛选参数
  const [status, setStatus] = useState('')
  const [platform, setPlatform] = useState('')
  const [period, setPeriod] = useState('30d')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    fetchData()
  }, [status, platform, period, startDate, endDate, currentPage])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params: any = {
        page: currentPage,
        limit: 20
      }

      if (status) params.status = status
      if (platform) params.platform = platform
      if (period !== 'all') params.period = period
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const [historyResponse, statsResponse] = await Promise.all([
        api.applications.getHistory(params),
        api.applications.getStats({ period: period === 'all' ? undefined : period })
      ])

      if (historyResponse.success && historyResponse.data) {
        setApplications(historyResponse.data.items)
        setTotalPages(historyResponse.data.pagination.totalPages)
        setCurrentPage(historyResponse.data.pagination.page)
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'json' | 'xlsx') => {
    setExporting(true)
    try {
      const params: any = {
        format,
        period: period === 'all' ? undefined : period
      }

      if (status) params.status = status
      if (platform) params.platform = platform
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const response = await api.export.applications(params)
      
      if (response.success && response.data) {
        // 创建下载链接
        const link = document.createElement('a')
        link.href = (response.data as { downloadUrl: string; filename: string }).downloadUrl
        link.download = (response.data as { downloadUrl: string; filename: string }).filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        alert('导出失败: ' + response.error?.message)
      }
    } catch (error: any) {
      alert('导出失败: ' + error.message)
    } finally {
      setExporting(false)
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

  const getPlatformText = (platform: string) => {
    switch (platform) {
      case 'boss': return 'Boss直聘'
      case 'zhilian': return '智联招聘'
      case 'liepin': return '猎聘'
      default: return platform
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">投递历史</h1>
            <p className="text-gray-600">查看和管理您的投递记录</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => handleExport('csv')}
              loading={exporting}
              disabled={applications.length === 0}
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              导出CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('xlsx')}
              loading={exporting}
              disabled={applications.length === 0}
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              导出Excel
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总投递数</CardTitle>
                <DocumentTextIcon className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.summary?.totalApplications || 0}</div>
                <p className="text-xs text-gray-600">累计投递</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">已投递</CardTitle>
                <ChartBarIcon className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.summary?.submittedApplications || 0}</div>
                <p className="text-xs text-gray-600">成功投递</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">已查看</CardTitle>
                <EyeIcon className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.summary?.viewedApplications || 0}</div>
                <p className="text-xs text-gray-600">HR已查看</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">成功率</CardTitle>
                <ChartBarIcon className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.summary?.successRate ? `${(stats.summary.successRate * 100).toFixed(1)}%` : '0%'}
                </div>
                <p className="text-xs text-gray-600">查看/投递比例</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 筛选器 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FunnelIcon className="h-5 w-5 mr-2" />
              筛选条件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {platformOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {periodOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="开始日期"
              />

              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="结束日期"
              />

              <Button onClick={() => setCurrentPage(1)}>
                应用筛选
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 投递记录列表 */}
        <Card>
          <CardHeader>
            <CardTitle>投递记录</CardTitle>
            <CardDescription>
              共 {applications.length} 条记录
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : applications.length > 0 ? (
              <div className="space-y-4">
                {applications.map((application) => (
                  <div key={application.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-gray-900">{application.jobTitle}</h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(application.status)}`}>
                            {getStatusText(application.status)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">公司:</span> {application.companyName}
                          </div>
                          <div>
                            <span className="font-medium">平台:</span> {getPlatformText(application.platform)}
                          </div>
                          <div>
                            <span className="font-medium">地点:</span> {application.location}
                          </div>
                          <div>
                            <span className="font-medium">薪资:</span> {application.salary}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <DocumentTextIcon className="h-4 w-4 mr-1" />
                            {application.resumeName}
                          </div>
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            投递时间: {formatDate(application.submittedAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">暂无投递记录</h3>
                <p className="mt-1 text-sm text-gray-500">
                  开始投递简历后，记录将显示在这里
                </p>
              </div>
            )}

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  第 {currentPage} 页，共 {totalPages} 页
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
