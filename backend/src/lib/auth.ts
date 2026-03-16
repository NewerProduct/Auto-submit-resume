import bcrypt from 'bcrypt';
import { DatabaseService } from './db';
import { KVService } from './kv';
import { User } from '@/types';

export class AuthService {
  // 密码加密
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }
  
  // 密码验证
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  // 用户注册
  static async register(phone: string, password: string, email?: string): Promise<User> {
    // 检查手机号是否已存在
    const existingUser = await DatabaseService.getUserByPhone(phone);
    if (existingUser) {
      throw new Error('手机号已被注册');
    }
    
    // 加密密码
    const passwordHash = await this.hashPassword(password);
    
    // 创建用户
    const userData = {
      phone,
      email,
      passwordHash,
    };
    
    const user = await DatabaseService.createUser(userData);
    
    // 清除用户相关的缓存
    await KVService.deleteUserSession(user.id);
    
    return user;
  }
  
  // 用户登录
  static async login(phone: string, password: string): Promise<User> {
    // 获取用户
    const user = await DatabaseService.getUserByPhone(phone);
    if (!user) {
      throw new Error('用户不存在');
    }
    
    // 验证密码
    const isValidPassword = await this.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('密码错误');
    }
    
    // 更新最后登录时间
    await DatabaseService.updateUser(user.id, { updatedAt: new Date() });
    
    return user;
  }
  
  // 修改密码
  static async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    // 获取用户
    const user = await DatabaseService.getUserById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }
    
    // 验证旧密码
    const isValidOldPassword = await this.verifyPassword(oldPassword, user.passwordHash);
    if (!isValidOldPassword) {
      throw new Error('旧密码错误');
    }
    
    // 加密新密码
    const newPasswordHash = await this.hashPassword(newPassword);
    
    // 更新密码
    await DatabaseService.updateUser(userId, { passwordHash: newPasswordHash });
    
    // 清除用户会话，强制重新登录
    await KVService.deleteUserSession(userId);
  }
  
  // 重置密码
  static async resetPassword(userId: string, newPassword: string): Promise<void> {
    const newPasswordHash = await this.hashPassword(newPassword);
    await DatabaseService.updateUser(userId, { passwordHash: newPasswordHash });
    
    // 清除用户会话
    await KVService.deleteUserSession(userId);
  }
  
  // 验证手机号格式
  static validatePhone(phone: string): boolean {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }
  
  // 验证密码强度
  static validatePassword(password: string): { isValid: boolean; message?: string } {
    if (password.length < 6) {
      return { isValid: false, message: '密码长度至少6位' };
    }
    
    if (password.length > 50) {
      return { isValid: false, message: '密码长度不能超过50位' };
    }
    
    // 可以添加更多密码强度验证规则
    return { isValid: true };
  }
  
  // 验证邮箱格式
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  // 生成随机密码
  static generateRandomPassword(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return password;
  }
  
  // 检查用户会话
  static async checkUserSession(userId: string): Promise<boolean> {
    try {
      const session = await KVService.getUserSession(userId);
      return !!session;
    } catch {
      return false;
    }
  }
  
  // 设置用户会话
  static async setUserSession(userId: string, sessionData: any, ttl: number = 86400): Promise<void> {
    await KVService.setUserSession(userId, sessionData, ttl);
  }
  
  // 删除用户会话
  static async deleteUserSession(userId: string): Promise<void> {
    await KVService.deleteUserSession(userId);
  }
  
  // 获取用户权限信息
  static async getUserPermissions(userId: string): Promise<string[]> {
    // 这里可以实现更复杂的权限系统
    // 目前返回基础权限
    const user = await DatabaseService.getUserById(userId);
    if (!user) {
      return [];
    }
    
    return [
      'resume:read',
      'resume:create',
      'resume:update',
      'resume:delete',
      'application:read',
      'application:create',
      'platform:read',
      'platform:create',
      'platform:update',
      'platform:delete',
    ];
  }
  
  // 检查用户权限
  static async checkUserPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }
}
