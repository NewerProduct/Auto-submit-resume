import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { DatabaseService } from '@/lib/db';
import { UploadService } from '@/lib/upload';
import { ResumeParser } from '@/lib/resume-parser';
import { ApiResponse, CreateResumeParams } from '@/types';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: '请求方法不允许',
      },
    });
  }
  
  try {
    // 获取用户会话
    const session = await getSession({ req });
    
    if (!session || !session.user?.id) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: '请先登录',
        },
      });
    }
    
    // 解析表单数据
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });
    
    const [fields, files] = await form.parse(req);
    
    const name = Array.isArray(fields.name) ? fields.name[0] : fields.name;
    const isDefault = Array.isArray(fields.isDefault) ? fields.isDefault[0] : fields.isDefault;
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    // 验证必填字段
    if (!file || !name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '文件和简历名称不能为空',
        },
      });
    }
    
    // 验证文件类型
    if (!UploadService.isValidResumeFile(file.originalFilename || '')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: '只支持PDF、DOC、DOCX格式的文件',
        },
      });
    }
    
    // 验证文件大小
    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: '文件大小不能超过10MB',
        },
      });
    }
    
    // 读取文件内容
    const fileContent = fs.readFileSync(file.filepath);
    
    // 创建临时文件
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, `${Date.now()}_${file.originalFilename}`);
    fs.writeFileSync(tempFilePath, fileContent);
    
    try {
      // 解析简历内容
      const { content, parsedData } = await ResumeParser.parseResume(tempFilePath, file.originalFilename || '');
      
      // 上传文件到Vercel Blob
      const fileObj = new File([fileContent], file.originalFilename || 'unknown', {
        type: 'application/octet-stream',
        lastModified: Date.now(),
      });
      const { url } = await UploadService.uploadResume(fileObj, session.user.id);
      
      // 如果设置为默认简历，先取消其他默认简历
      if (isDefault === 'true') {
        await DatabaseService.setDefaultResume(session.user.id, '');
      }
      
      // 保存简历信息到数据库
      const resumeData: CreateResumeParams = {
        userId: session.user.id,
        name,
        fileUrl: url,
        content,
        parsedData,
        isDefault: isDefault === 'true',
        fileSize: file.size,
      };
      
      const resume = await DatabaseService.createResume(resumeData);
      
      res.status(201).json({
        success: true,
        data: {
          id: resume.id,
          name: resume.name,
          fileUrl: resume.fileUrl,
          content: resume.content,
          parsedData: resume.parsedData,
          isDefault: resume.isDefault,
          createdAt: resume.createdAt,
          fileSize: resume.fileSize,
        },
        message: '简历上传成功',
      });
    } finally {
      // 清理临时文件
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  } catch (error) {
    console.error('简历上传失败:', error);
    
    if (error instanceof Error) {
      if (error.message === '不支持的文件格式') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: error.message,
          },
        });
      }
      
      if (error.message === '简历解析失败') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PARSE_ERROR',
            message: error.message,
          },
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '简历上传失败，请稍后重试',
      },
    });
  }
}
