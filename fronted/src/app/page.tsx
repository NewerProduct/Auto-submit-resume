'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 sm:py-16">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            简历海投助手
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            智能简历批量投递工具，支持Boss直聘等主流招聘平台，让求职更高效
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 sm:mb-16">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8 py-3 w-full sm:w-auto">
                立即开始
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3 w-full sm:w-auto">
                登录账户
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="text-blue-600 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">批量投递</h3>
            <p className="text-gray-600">一键批量投递简历到多个岗位，大幅提升求职效率</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="text-blue-600 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">智能匹配</h3>
            <p className="text-gray-600">根据简历内容智能匹配适合的岗位，提高投递成功率</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="text-blue-600 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">数据统计</h3>
            <p className="text-gray-600">实时跟踪投递进度，提供详细的统计数据和分析报告</p>
          </div>
        </div>

        <div className="text-center mt-12 sm:mt-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">支持的平台</h2>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8">
            <div className="bg-white p-4 rounded-lg shadow w-full sm:w-auto max-w-xs">
              <div className="text-2xl font-bold text-blue-600">Boss直聘</div>
              <div className="text-sm text-gray-600">已支持</div>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg w-full sm:w-auto max-w-xs">
              <div className="text-2xl font-bold text-gray-400">智联招聘</div>
              <div className="text-sm text-gray-500">即将支持</div>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg w-full sm:w-auto max-w-xs">
              <div className="text-2xl font-bold text-gray-400">猎聘</div>
              <div className="text-sm text-gray-500">即将支持</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
