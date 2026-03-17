import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 确保静态资源正确处理
  images: {
    unoptimized: true
  }
};

export default nextConfig;
