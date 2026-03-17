'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { Job, Resume, DeliveryStrategy, BatchApplication } from '@/types'
import { formatSalary, formatDate } from '@/lib/utils'
import { 
  MagnifyingGlassIcon,
  BriefcaseIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

const deliveryStrategies: { type: DeliveryStrategy['type']; label: string; description: string }[] = [
  {
    type: 'conservative',
    label: '保守策略',
    description: '低频投递，降低风险'
  },
  {
    type: 'balanced',
    label: '平衡策略',
    description: '适中频率，平衡效率与安全'
  },
  {
    type: 'aggressive',
    label: '激进策略',
    description: '高频投递，最大化效率'
  }
]

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [resumes, setResumes] = useState<Resume[]>([])
  const [platformAccounts, setPlatformAccounts] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [batchApplying, setBatchApplying] = useState(false)
  const [batchStatus, setBatchStatus] = useState<BatchApplication | null>(null)

  // 搜索参数
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState('boss')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  // 投递参数
  const [selectedResume, setSelectedResume] = useState('')
  const [selectedStrategy, setSelectedStrategy] = useState<DeliveryStrategy['type']>('balanced')
  const [showBatchDialog, setShowBatchDialog] = useState(false)

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      const [resumesResponse, platformsResponse] = await Promise.all([
        api.resumes.list(),
        api.platforms.getStatus('boss')
      ])

      if (resumesResponse.success && resumesResponse.data) {
        setResumes(resumesResponse.data)
        const defaultResume = resumesResponse.data.find(r => r.isDefault)
        if (defaultResume) {
          setSelectedResume(defaultResume.id)
        }
      }

      if (platformsResponse.success && platformsResponse.data) {
        setPlatformAccounts({ boss: platformsResponse.data })
      }
    } catch (error) {
      console.error('Failed to fetch initial data:', error)
    }
  }

  const handleSearch = async (page: number = 1) => {
    if (!selectedPlatform) {
      alert('请先选择招聘平台')
      return
    }

    const account = platformAccounts[selectedPlatform]
    if (!account?.isBound) {
      alert('请先绑定招聘平台账户')
      return
    }

    setSearching(true)
    try {
      const params: any = {
        page,
        limit: 20
      }

      if (keyword.trim()) params.keyword = keyword.trim()
      if (location.trim()) params.location = location.trim()
      if (salaryMin) params.salaryMin = parseInt(salaryMin)
      if (salaryMax) params.salaryMax = parseInt(salaryMax)

      const response = await api.platforms.getJobs(selectedPlatform, params)
      
      if (response.success && response.data) {
        setJobs(response.data.items)
        setTotalPages(response.data.pagination.totalPages)
        setCurrentPage(response.data.pagination.page)
      } else {
        alert('搜索失败: ' + response.error?.message)
      }
    } catch (error: any) {
      alert('搜索失败: ' + error.message)
    } finally {
      setSearching(false)
    }
  }

  const handleJobSelect = (jobId: string, selected: boolean) => {
    if (selected) {
      setSelectedJobs(prev => [...prev, jobId])
    } else {
      setSelectedJobs(prev => prev.filter(id => id !== jobId))
    }
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedJobs(jobs.filter(job => !job.isApplied).map(job => job.jobId))
    } else {
      setSelectedJobs([])
    }
  }

  const handleBatchApply = async () => {
    if (selectedJobs.length === 0) {
      alert('请选择要投递的岗位')
      return
    }

    if (!selectedResume) {
      alert('请选择要投递的简历')
      return
    }

    setShowBatchDialog(true)
  }

  const executeBatchApply = async () => {
    setBatchApplying(true)
    try {
      const strategy = deliveryStrategies.find(s => s.type === selectedStrategy)!
      const deliveryConfig: DeliveryStrategy = {
        type: selectedStrategy,
        dailyLimit: selectedStrategy === 'conservative' ? 30 : selectedStrategy === 'balanced' ? 50 : 100,
        intervalMs: selectedStrategy === 'conservative' ? 60000 : selectedStrategy === 'balanced' ? 30000 : 15000,
        skipDuplicates: true
      }

      const response = await api.applications.batch({
        resumeId: selectedResume,
        platform: selectedPlatform,
        jobIds: selectedJobs,
        strategy: deliveryConfig
      })

      if (response.success && response.data) {
        setBatchStatus(response.data)
        setShowBatchDialog(false)
        setSelectedJobs([])
        
        // 定期更新状态
        const updateStatus = async () => {
          try {
            const statusResponse = await api.applications.getStatus(response.data!.batchId)
            if (statusResponse.success && statusResponse.data) {
              setBatchStatus(statusResponse.data)
              
              if (statusResponse.data.status === 'processing') {
                setTimeout(updateStatus, 5000) // 5秒后再次检查
              } else {
                // 完成后刷新岗位列表
                handleSearch(currentPage)
              }
            }
          } catch (error) {
            console.error('Failed to update batch status:', error)
          }
        }
        
        setTimeout(updateStatus, 5000)
      } else {
        alert('批量投递失败: ' + response.error?.message)
      }
    } catch (error: any) {
      alert('批量投递失败: ' + error.message)
    } finally {
      setBatchApplying(false)
    }
  }

  const getStrategyConfig = (type: DeliveryStrategy['type']) => {
    switch (type) {
      case 'conservative':
        return { dailyLimit: 30, intervalMs: 60000, description: '每天30次，间隔1分钟' }
      case 'balanced':
        return { dailyLimit: 50, intervalMs: 30000, description: '每天50次，间隔30秒' }
      case 'aggressive':
        return { dailyLimit: 100, intervalMs: 15000, description: '每天100次，间隔15秒' }
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">岗位搜索</h1>
          <p className="text-gray-600">搜索并批量投递合适的岗位</p>
        </div>

        {/* 搜索表单 */}
        <Card>
          <CardHeader>
            <CardTitle>搜索条件</CardTitle>
            <CardDescription>设置搜索条件来找到合适的岗位</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                placeholder="关键词，如：前端开发"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                label="关键词"
              />

              <Input
                placeholder="工作地点，如：北京"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                label="地点"
              />

              <Input
                type="number"
                placeholder="最低薪资"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                label="最低薪资(K)"
              />

              <Input
                type="number"
                placeholder="最高薪资"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                label="最高薪资(K)"
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-4">
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="boss">Boss直聘</option>
                  <option value="zhilian" disabled>智联招聘(即将支持)</option>
                  <option value="liepin" disabled>猎聘(即将支持)</option>
                </select>

                {platformAccounts[selectedPlatform]?.isBound ? (
                  <span className="text-sm text-green-600">✓ 已绑定</span>
                ) : (
                  <span className="text-sm text-red-600">✗ 未绑定</span>
                )}
              </div>

              <Button
                onClick={() => handleSearch(1)}
                loading={searching}
                disabled={!platformAccounts[selectedPlatform]?.isBound}
              >
                <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                搜索岗位
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 批量操作栏 */}
        {jobs.length > 0 && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedJobs.length === jobs.filter(job => !job.isApplied).length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      全选 ({selectedJobs.length} 已选择)
                    </span>
                  </label>

                  <select
                    value={selectedResume}
                    onChange={(e) => setSelectedResume(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">选择简历</option>
                    {resumes.map(resume => (
                      <option key={resume.id} value={resume.id}>
                        {resume.name} {resume.isDefault && '(默认)'}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={handleBatchApply}
                  disabled={selectedJobs.length === 0 || !selectedResume}
                  loading={batchApplying}
                >
                  <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                  批量投递 ({selectedJobs.length})
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 批量投递状态 */}
        {batchStatus && (
          <Card>
            <CardHeader>
              <CardTitle>批量投递状态</CardTitle>
              <CardDescription>批次ID: {batchStatus.batchId}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">状态:</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    batchStatus.status === 'completed' ? 'bg-green-100 text-green-800' :
                    batchStatus.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {batchStatus.status === 'completed' ? '已完成' :
                     batchStatus.status === 'processing' ? '进行中' : '失败'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{batchStatus.progress?.completed || 0}</div>
                    <div className="text-sm text-gray-600">已完成</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{batchStatus.progress?.pending || 0}</div>
                    <div className="text-sm text-gray-600">待处理</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{batchStatus.progress?.failed || 0}</div>
                    <div className="text-sm text-gray-600">失败</div>
                  </div>
                </div>

                {batchStatus.status === 'processing' && (
                  <div className="text-sm text-gray-600">
                    预计完成时间: {batchStatus.estimatedDuration}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 岗位列表 */}
        <div className="space-y-4">
          {jobs.map((job) => {
            const isSelected = selectedJobs.includes(job.jobId)
            const canSelect = !job.isApplied

            return (
              <Card key={job.jobId} className={`transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {canSelect && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleJobSelect(job.jobId, e.target.checked)}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    )}

                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{job.title}</h3>
                          <p className="text-gray-600">{job.companyName}</p>
                        </div>
                        {job.isApplied && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            已投递
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-1" />
                          {job.location}
                        </div>
                        <div className="flex items-center">
                          <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                          {job.salary}
                        </div>
                        <div className="flex items-center">
                          <BriefcaseIcon className="h-4 w-4 mr-1" />
                          {job.experience}
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {formatDate(job.publishTime)}
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-gray-700 line-clamp-2">
                        {job.description}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              第 {currentPage} 页，共 {totalPages} 页
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSearch(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSearch(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                下一页
              </Button>
            </div>
          </div>
        )}

        {/* 批量投递确认对话框 */}
        {showBatchDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>确认批量投递</CardTitle>
                <CardDescription>
                  即将投递 {selectedJobs.length} 个岗位
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      投递策略
                    </label>
                    <div className="space-y-2">
                      {deliveryStrategies.map((strategy) => {
                        const config = getStrategyConfig(strategy.type)
                        return (
                          <label key={strategy.type} className="flex items-center space-x-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="strategy"
                              value={strategy.type}
                              checked={selectedStrategy === strategy.type}
                              onChange={(e) => setSelectedStrategy(e.target.value as DeliveryStrategy['type'])}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <div className="font-medium">{strategy.label}</div>
                              <div className="text-sm text-gray-600">{strategy.description}</div>
                              <div className="text-xs text-gray-500">{config.description}</div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      onClick={executeBatchApply}
                      loading={batchApplying}
                      className="flex-1"
                    >
                      确认投递
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowBatchDialog(false)}
                      disabled={batchApplying}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
