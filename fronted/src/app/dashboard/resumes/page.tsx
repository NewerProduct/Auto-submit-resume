'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { Resume } from '@/types'
import { formatFileSize, formatDate } from '@/lib/utils'
import { 
  DocumentTextIcon, 
  StarIcon, 
  TrashIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [resumeName, setResumeName] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)

  useEffect(() => {
    fetchResumes()
  }, [])

  const fetchResumes = async () => {
    try {
      const response = await api.resumes.list()
      if (response.success && response.data) {
        setResumes(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch resumes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // 验证文件类型
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!allowedTypes.includes(selectedFile.type)) {
        alert('请选择PDF或Word文档')
        return
      }
      
      // 验证文件大小 (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('文件大小不能超过10MB')
        return
      }

      setFile(selectedFile)
      setResumeName(selectedFile.name.replace(/\.[^/.]+$/, ''))
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !resumeName) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', resumeName)
      formData.append('isDefault', 'false')

      const response = await api.resumes.upload(formData)
      if (response.success) {
        setShowUploadForm(false)
        setFile(null)
        setResumeName('')
        await fetchResumes()
      } else {
        alert('上传失败: ' + response.error?.message)
      }
    } catch (error: any) {
      alert('上传失败: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSetDefault = async (resumeId: string) => {
    try {
      const response = await api.resumes.setDefault(resumeId)
      if (response.success) {
        await fetchResumes()
      }
    } catch (error) {
      console.error('Failed to set default resume:', error)
      alert('设置默认简历失败')
    }
  }

  const handleDelete = async (resumeId: string) => {
    if (!confirm('确定要删除这份简历吗？')) return

    try {
      const response = await api.resumes.delete(resumeId)
      if (response.success) {
        await fetchResumes()
      }
    } catch (error) {
      console.error('Failed to delete resume:', error)
      alert('删除简历失败')
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
            <h1 className="text-2xl font-bold text-gray-900">简历管理</h1>
            <p className="text-gray-600">管理您的简历文件</p>
          </div>
          <Button onClick={() => setShowUploadForm(true)}>
            上传简历
          </Button>
        </div>

        {/* 上传表单 */}
        {showUploadForm && (
          <Card>
            <CardHeader>
              <CardTitle>上传新简历</CardTitle>
              <CardDescription>
                支持 PDF、Word 文档格式，文件大小不超过 10MB
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择文件
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                <Input
                  label="简历名称"
                  placeholder="请输入简历名称"
                  value={resumeName}
                  onChange={(e) => setResumeName(e.target.value)}
                  required
                />

                {file && (
                  <div className="text-sm text-gray-600">
                    已选择文件: {file.name} ({formatFileSize(file.size)})
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button type="submit" loading={uploading} disabled={!file || !resumeName}>
                    {uploading ? '上传中...' : '确认上传'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowUploadForm(false)
                      setFile(null)
                      setResumeName('')
                    }}
                  >
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* 简历列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((resume) => (
            <Card key={resume.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-lg">{resume.name}</CardTitle>
                  </div>
                  {resume.isDefault && (
                    <div className="flex items-center text-yellow-500 text-sm">
                      <StarIconSolid className="h-4 w-4 mr-1" />
                      默认
                    </div>
                  )}
                </div>
                <CardDescription>
                  {formatFileSize(resume.fileSize)} • {formatDate(resume.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <p>投递次数: {resume.applicationCount || 0}</p>
                    {resume.parsedData && (
                      <div className="mt-2 space-y-1">
                        <p>姓名: {resume.parsedData.name}</p>
                        <p>邮箱: {resume.parsedData.email}</p>
                        <p>学历: {resume.parsedData.education}</p>
                        <p>经验: {resume.parsedData.experience}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(resume.fileUrl, '_blank')}
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      预览
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(resume.fileUrl, '_blank')}
                    >
                      <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                      下载
                    </Button>

                    {!resume.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetDefault(resume.id)}
                      >
                        <StarIcon className="h-4 w-4 mr-1" />
                        设为默认
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(resume.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {resumes.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">暂无简历</h3>
              <p className="mt-1 text-sm text-gray-500">
                上传您的第一份简历开始使用
              </p>
              <div className="mt-6">
                <Button onClick={() => setShowUploadForm(true)}>
                  上传简历
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
