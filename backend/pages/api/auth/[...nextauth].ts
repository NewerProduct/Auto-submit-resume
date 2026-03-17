import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { AuthService } from '@/lib/auth';
import { DatabaseService } from '@/lib/db';
import { KVService } from '@/lib/kv';
import { NextApiRequest, NextApiResponse } from 'next';

// 处理 OPTIONS 请求 (CORS preflight)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  
  // 其他请求交给 NextAuth 处理
  return NextAuth(authOptions)(req, res);
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        phone: { label: '手机号', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) {
          throw new Error('请输入手机号和密码');
        }
        
        // 验证手机号格式
        if (!AuthService.validatePhone(credentials.phone)) {
          throw new Error('手机号格式不正确');
        }
        
        try {
          // 验证用户登录
          const user = await AuthService.login(credentials.phone, credentials.password);
          
          return {
            id: user.id,
            phone: user.phone,
            email: user.email,
          };
        } catch (error) {
          console.error('登录失败:', error);
          throw new Error(error instanceof Error ? error.message : '登录失败');
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24小时
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24小时
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // 首次登录时添加用户信息
      if (user) {
        token.id = user.id;
        token.phone = user.phone;
        token.email = user.email;
      }
      
      // 更新会话时刷新用户信息
      if (trigger === 'update' && session) {
        const refreshedUser = await DatabaseService.getUserById(token.id as string);
        if (refreshedUser) {
          token.phone = refreshedUser.phone;
          token.email = refreshedUser.email;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.phone = token.phone as string;
        session.user.email = token.email as string;
        
        // 添加用户统计信息
        try {
          const [resumeCount, applicationCount] = await Promise.all([
            DatabaseService.getUserResumes(token.id as string).then(resumes => resumes.length),
            DatabaseService.getUserApplications(token.id as string).then(apps => apps.total),
          ]);
          
          session.user.resumeCount = resumeCount;
          session.user.applicationCount = applicationCount;
        } catch (error) {
          console.error('获取用户统计信息失败:', error);
          session.user.resumeCount = 0;
          session.user.applicationCount = 0;
        }
      }
      
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  events: {
    async signIn({ user, account, isNewUser }) {
      if (user.id) {
        // 设置用户会话缓存
        await KVService.setUserSession(user.id, {
          lastSignIn: new Date(),
          userAgent: account?.provider,
        });
      }
    },
    async signOut({ session }) {
      if (session?.user?.id) {
        // 清除用户会话缓存
        await KVService.deleteUserSession(session.user.id);
      }
    },
  },
};

// 扩展类型定义
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      phone: string;
      email?: string;
      resumeCount?: number;
      applicationCount?: number;
    };
  }
  
  interface User {
    id: string;
    phone: string;
    email?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    phone: string;
    email?: string;
  }
}
