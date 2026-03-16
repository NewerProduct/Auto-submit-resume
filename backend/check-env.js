// 环境变量检查脚本
// 运行: node check-env.js

const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_URL', 
  'NEXTAUTH_SECRET',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'ENCRYPTION_KEY'
];

const optionalEnvVars = [
  'VERCEL_KV_URL',
  'VERCEL_KV_REST_API_TOKEN',
  'VERCEL_KV_REST_API_URL',
  'BLOB_READ_WRITE_TOKEN',
  'BOSS_API_BASE_URL',
  'BOSS_USER_AGENT',
  'SUPABASE_SERVICE_ROLE_KEY'
];

console.log('🔍 检查环境变量配置...\n');

// 检查必需的环境变量
console.log('📋 必需的环境变量:');
let missingRequired = [];

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: ${envVar.includes('SECRET') || envVar.includes('KEY') ? '***已配置***' : value}`);
  } else {
    console.log(`❌ ${envVar}: 未配置`);
    missingRequired.push(envVar);
  }
});

// 检查可选的环境变量
console.log('\n📋 可选的环境变量:');
optionalEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: ${envVar.includes('SECRET') || envVar.includes('KEY') || envVar.includes('TOKEN') ? '***已配置***' : value}`);
  } else {
    console.log(`⚠️  ${envVar}: 未配置 (可选)`);
  }
});

// 检查结果
if (missingRequired.length > 0) {
  console.log('\n❌ 缺少必需的环境变量:');
  missingRequired.forEach(envVar => {
    console.log(`   - ${envVar}`);
  });
  console.log('\n请配置这些环境变量后重新运行部署。');
  process.exit(1);
} else {
  console.log('\n✅ 所有必需的环境变量已配置完成！');
  console.log('\n🚀 可以开始部署到 Vercel 了！');
}

// 检查 NEXTAUTH_SECRET 长度
if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
  console.log('\n⚠️  警告: NEXTAUTH_SECRET 长度应至少为32字符');
}

// 检查 DATABASE_URL 格式
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
  console.log('\n⚠️  警告: DATABASE_URL 应以 postgresql:// 开头');
}

// 检查 SUPABASE_URL 格式
if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.startsWith('https://')) {
  console.log('\n⚠️  警告: SUPABASE_URL 应以 https:// 开头');
}
