'use client'

import { useState } from 'react'
import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { MobileSidebar } from './MobileSidebar'
import { MobileHeader } from './MobileHeader'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 桌面端侧边栏 */}
      <div className="hidden lg:flex lg:w-64 lg:flex-shrink-0">
        <Sidebar />
      </div>
      
      {/* 移动端侧边栏 */}
      <MobileSidebar 
        isOpen={mobileSidebarOpen} 
        onClose={() => setMobileSidebarOpen(false)} 
      />
      
      {/* 主内容区域 */}
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-0">
        {/* 移动端头部 */}
        <MobileHeader onMenuClick={() => setMobileSidebarOpen(true)} />
        
        {/* 主内容 */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
