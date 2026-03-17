'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { PlatformAccount } from '@/types'
import { formatDate } from '@/lib/utils'
import { 
  LinkIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

const platforms = [
  {
    id: 'boss',
    name: 'Boss直聘',
    description: '国内领先的招聘平台',
    color: 'blue',
    icon: '👔'
  },
  {
    id: 'zhilian',
    name: '智联招聘',
    description: '老牌招聘网站',
    color: 'green',
    icon: '💼'
  },
  {
    id: 'liepin',
    name: '猎聘',
    description: '中高端人才招聘',
    color: 'purple',
    icon: '🎯'
  }
]

export default function PlatformsPage() {
  const [platformAccounts, setPlatformAccounts] = useState<Record<string, PlatformAccount>>({})
  const [loading, setLoading] = useState(true)
  const [bindingPlatform, setBindingPlatform] = useState<string | null>(null)
  const [showBindForm, setShowBindForm] = useState<string | null>(null)
  const [authCookie, setAuthCookie] = useState('')
  const [platformUserId, setPlatformUserId] = useState('')

  useEffect(() => {
    fetchPlatformStatuses()
  }, [])

  const fetchPlatformStatuses = async () => {
    try {
      const promises = platforms.map(async (platform) => {
        try {
          const response = await api.platforms.getStatus(platform.id)
          if (response.success && response.data) {
            return { [platform.id]: response.data }
          }
        } catch (error) {
          // 平台未绑定是正常情况
          return { [platform.id]: { platform: platform.id, isBound: false } }
        }
        return { [platform.id]: { platform: platform.id, isBound: false } }
      })

      const results = await Promise.all(promises)
      const accounts = results.reduce((acc, result) => ({ ...acc, ...result }), {})
      setPlatformAccounts(accounts as Record<string, PlatformAccount>)
    } catch (error) {
      console.error('Failed to fetch platform statuses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBind = async (platformId: string) => {
    if (!authCookie.trim()) {
      alert('请输入有效的Cookie信息')
      return
    }

    setBindingPlatform(platformId)
    try {
      const response = await api.platforms.bind({
        platform: platformId,
        authCookie: authCookie.trim(),
        platformUserId: platformUserId.trim() || undefined
      })

      if (response.success) {
        setShowBindForm(null)
        setAuthCookie('')
        setPlatformUserId('')
        await fetchPlatformStatuses()
      } else {
        alert('绑定失败: ' + response.error?.message)
      }
    } catch (error: any) {
      alert('绑定失败: ' + error.message)
    } finally {
      setBindingPlatform(null)
    }
  }

  const handleUnbind = async (platformId: string) => {
    if (!confirm(`确定要解绑${platforms.find(p => p.id === platformId)?.name}吗？`)) {
      return
    }

    try {
      const response = await api.platforms.unbind(platformId)
      if (response.success) {
        await fetchPlatformStatuses()
      } else {
        alert('解绑失败: ' + response.error?.message)
      }
    } catch (error: any) {
      alert('解绑失败: ' + error.message)
    }
  }

  const getStatusIcon = (account: PlatformAccount) => {
    if (account.isBound) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />
    } else {
      return <XCircleIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusText = (account: PlatformAccount) => {
    if (account.isBound) {
      if (account.expiresAt && new Date(account.expiresAt) < new Date()) {
        return '已过期'
      }
      return '已绑定'
    } else {
      return '未绑定'
    }
  }

  const getStatusColor = (account: PlatformAccount) => {
    if (account.isBound) {
      if (account.expiresAt && new Date(account.expiresAt) < new Date()) {
        return 'text-orange-600 bg-orange-100'
      }
      return 'text-green-600 bg-green-100'
    } else {
      return 'text-gray-600 bg-gray-100'
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">平台对接</h1>
          <p className="text-gray-600">绑定招聘平台账户以使用投递功能</p>
        </div>

        {/* 平台卡片列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platforms.map((platform) => {
            const account = platformAccounts[platform.id]
            const isBound = account?.isBound
            const isExpired = account?.expiresAt && new Date(account.expiresAt) < new Date()

            return (
              <Card key={platform.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{platform.icon}</div>
                      <div>
                        <CardTitle className="text-lg">{platform.name}</CardTitle>
                        <CardDescription>{platform.description}</CardDescription>
                      </div>
                    </div>
                    {getStatusIcon(account)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 状态显示 */}
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(account)}`}>
                        {getStatusText(account)}
                      </span>
                      {isBound && (
                        <span className="text-xs text-gray-500">
                          {account.lastSyncAt && `同步: ${formatDate(account.lastSyncAt)}`}
                        </span>
                      )}
                    </div>

                    {/* 账户信息 */}
                    {isBound && account.platformUserId && (
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>平台用户ID: {account.platformUserId}</p>
                        {account.expiresAt && (
                          <p className={isExpired ? 'text-orange-600' : ''}>
                            过期时间: {formatDate(account.expiresAt)}
                            {isExpired && ' (已过期)'}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex space-x-2">
                      {!isBound ? (
                        <Button
                          size="sm"
                          onClick={() => setShowBindForm(platform.id)}
                          className="flex-1"
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          绑定账户
                        </Button>
                      ) : (
                        <>
                          {isExpired && (
                            <Button
                              size="sm"
                              onClick={() => setShowBindForm(platform.id)}
                              className="flex-1"
                              variant="outline"
                            >
                              重新绑定
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnbind(platform.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>

                    {/* 绑定表单 */}
                    {showBindForm === platform.id && (
                      <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-medium mb-3">绑定{platform.name}</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Cookie信息 *
                            </label>
                            <textarea
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={4}
                              placeholder="请粘贴从浏览器获取的Cookie信息..."
                              value={authCookie}
                              onChange={(e) => setAuthCookie(e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              请从浏览器开发者工具中获取完整的Cookie字符串
                            </p>
                          </div>

                          <Input
                            label="平台用户ID（可选）"
                            placeholder="可选，用于标识您的平台账户"
                            value={platformUserId}
                            onChange={(e) => setPlatformUserId(e.target.value)}
                          />

                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleBind(platform.id)}
                              loading={bindingPlatform === platform.id}
                              disabled={!authCookie.trim()}
                            >
                              {bindingPlatform === platform.id ? '绑定中...' : '确认绑定'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowBindForm(null)
                                setAuthCookie('')
                                setPlatformUserId('')
                              }}
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* 使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
            <CardDescription>如何获取平台Cookie信息</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">获取Cookie步骤：</h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>在浏览器中登录对应的招聘平台</li>
                  <li>按F12打开开发者工具</li>
                  <li>切换到"网络"(Network)标签页</li>
                  <li>刷新页面或进行任意操作</li>
                  <li>找到任意请求，查看请求头中的"Cookie"字段</li>
                  <li>复制完整的Cookie字符串</li>
                </ol>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" />
                  <div className="text-yellow-800">
                    <p className="font-medium mb-1">注意事项：</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Cookie信息会定期过期，需要重新绑定</li>
                      <li>请妥善保管您的Cookie信息，不要泄露给他人</li>
                      <li>使用本工具需遵守对应平台的使用条款</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
