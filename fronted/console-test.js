// 在浏览器控制台运行此代码来测试注册API

// 测试注册函数
async function testRegister() {
  try {
    console.log('🚀 开始测试注册API...');
    
    const testData = {
      phone: '13800138000',
      password: 'Test123456',
      email: 'test@example.com'
    };
    
    console.log('📤 发送请求:', testData);
    
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📥 响应状态:', response.status);
    console.log('📥 响应头:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    console.log('📥 响应数据:', result);
    
    if (response.ok) {
      console.log('✅ 注册成功!', result);
    } else {
      console.log('❌ 注册失败:', result);
    }
    
    return result;
  } catch (error) {
    console.error('💥 请求错误:', error);
    return { error: error.message };
  }
}

// 测试不同场景
const testCases = [
  {
    name: '正常注册',
    data: { phone: '13800138001', password: 'Test123456', email: 'test1@example.com' }
  },
  {
    name: '缺少手机号',
    data: { password: 'Test123456', email: 'test2@example.com' }
  },
  {
    name: '缺少密码',
    data: { phone: '13800138002', email: 'test3@example.com' }
  },
  {
    name: '手机号格式错误',
    data: { phone: '123', password: 'Test123456', email: 'test4@example.com' }
  },
  {
    name: '密码太弱',
    data: { phone: '13800138003', password: '123', email: 'test5@example.com' }
  }
];

// 运行所有测试
async function runAllTests() {
  console.log('🧪 开始运行所有测试用例...');
  
  for (const testCase of testCases) {
    console.log(`\n--- ${testCase.name} ---`);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data)
      });
      
      const result = await response.json();
      console.log(`${testCase.name} - 状态: ${response.status}, 结果:`, result);
    } catch (error) {
      console.log(`${testCase.name} - 错误:`, error.message);
    }
  }
}

// 网络诊断函数
async function diagnoseNetwork() {
  console.log('🔍 开始网络诊断...');
  
  // 1. 测试前端代理
  try {
    const response = await fetch('/api/test');
    console.log('✅ 前端代理正常:', response.status);
  } catch (error) {
    console.log('❌ 前端代理失败:', error.message);
  }
  
  // 2. 检查当前域名和端口
  console.log('📍 当前页面:', window.location.href);
  console.log('🌐 当前域名:', window.location.hostname);
  console.log('🔌 当前端口:', window.location.port);
  
  // 3. 测试直接访问后端（如果同源）
  if (window.location.hostname === 'localhost' && window.location.port === '3001') {
    try {
      const response = await fetch('http://localhost:3000/api/test');
      console.log('✅ 直接访问后端正常:', response.status);
    } catch (error) {
      console.log('❌ 直接访问后端失败:', error.message);
    }
  }
}

// 使用方法：
// 1. testRegister() - 单次测试注册
// 2. runAllTests() - 运行所有测试用例
// 3. diagnoseNetwork() - 网络诊断

console.log('🎯 测试函数已加载! 使用 testRegister(), runAllTests(), 或 diagnoseNetwork()');
