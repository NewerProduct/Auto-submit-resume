import { put } from '@vercel/blob';

export class UploadService {
  static async uploadResume(file: File, userId: string): Promise<{ url: string; filename: string }> {
    try {
      const timestamp = Date.now();
      const filename = `resumes/${userId}/${timestamp}-${file.name}`;
      
      const blob = await put(filename, file, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN!,
      });
      
      return {
        url: blob.url,
        filename: blob.pathname,
      };
    } catch (error) {
      console.error('上传简历失败:', error);
      throw new Error('上传简历失败');
    }
  }
  
  static async uploadExport(data: any, filename: string, userId: string): Promise<{ url: string; downloadUrl: string }> {
    try {
      const timestamp = Date.now();
      const exportFilename = `exports/${userId}/${timestamp}-${filename}`;
      
      // 创建Blob对象
      const blob = new Blob([data], { type: 'application/octet-stream' });
      
      const uploadedBlob = await put(exportFilename, blob, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN!,
      });
      
      return {
        url: uploadedBlob.url,
        downloadUrl: uploadedBlob.url,
      };
    } catch (error) {
      console.error('上传导出文件失败:', error);
      throw new Error('上传导出文件失败');
    }
  }
  
  static async deleteFile(url: string): Promise<void> {
    try {
      // Vercel Blob 目前不支持直接删除，可以通过管理界面删除
      // 或者使用其他方式管理文件生命周期
      console.log('文件删除请求:', url);
    } catch (error) {
      console.error('删除文件失败:', error);
      throw new Error('删除文件失败');
    }
  }
  
  static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }
  
  static isValidResumeFile(filename: string): boolean {
    const validExtensions = ['pdf', 'doc', 'docx'];
    const extension = this.getFileExtension(filename);
    return validExtensions.includes(extension);
  }
  
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
