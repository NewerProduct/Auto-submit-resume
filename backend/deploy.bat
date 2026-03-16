@echo off
REM HelpYouJob Backend 部署脚本 (Windows版本)
REM 使用方法: deploy.bat

echo 🚀 开始部署 HelpYouJob Backend 到 Vercel...

REM 检查是否安装了 Vercel CLI
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI 未安装，请先安装:
    echo npm i -g vercel
    pause
    exit /b 1
)

REM 检查是否已登录 Vercel
echo 📋 检查 Vercel 登录状态...
vercel whoami >nul 2>nul
if %errorlevel% neq 0 (
    echo 🔐 请先登录 Vercel:
    vercel login
    if %errorlevel% neq 0 (
        echo ❌ Vercel 登录失败
        pause
        exit /b 1
    )
)

REM 清理构建缓存
echo 🧹 清理构建缓存...
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache

REM 安装依赖
echo 📦 安装依赖...
npm install
if %errorlevel% neq 0 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

REM 运行类型检查
echo 🔍 运行 TypeScript 类型检查...
npm run type-check
if %errorlevel% neq 0 (
    echo ❌ TypeScript 类型检查失败，请修复错误后重试
    pause
    exit /b 1
)

REM 构建项目
echo 🔨 构建项目...
npm run build
if %errorlevel% neq 0 (
    echo ❌ 项目构建失败，请检查错误信息
    pause
    exit /b 1
)

REM 部署到 Vercel
echo 🌍 部署到 Vercel...
vercel --prod
if %errorlevel% neq 0 (
    echo ❌ Vercel 部署失败
    pause
    exit /b 1
)

echo ✅ 部署完成！
echo.
echo 📊 部署信息:
echo    - 项目已部署到生产环境
echo    - API 地址: https://your-app-name.vercel.app
echo    - 查看日志: vercel logs
echo    - 查看指标: vercel metrics
echo.
echo 🧪 测试建议:
echo    1. 测试用户注册: POST /api/auth/register
echo    2. 测试用户登录: POST /api/auth/signin
echo    3. 测试简历上传: POST /api/resumes/upload
echo    4. 测试平台绑定: POST /api/platforms/bind
echo.
echo 📖 更多信息请查看 DEPLOYMENT.md
pause
