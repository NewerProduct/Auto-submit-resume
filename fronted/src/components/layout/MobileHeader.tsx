'use client'

import { Bars3Icon } from '@heroicons/react/24/outline'

interface MobileHeaderProps {
  onMenuClick: () => void
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
      <h1 className="text-lg font-semibold text-gray-900">简历海投助手</h1>
      <button
        onClick={onMenuClick}
        className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
      >
        <Bars3Icon className="h-6 w-6" />
      </button>
    </div>
  )
}
