import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const envStatus = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    ENCRYPTION_KEY: !!process.env.ENCRYPTION_KEY,
  };

  // 不暴露实际值，只显示是否存在
  res.status(200).json({
    message: 'Environment variables check',
    envStatus,
    missing: Object.entries(envStatus)
      .filter(([key, exists]) => !exists)
      .map(([key]) => key)
  });
}
