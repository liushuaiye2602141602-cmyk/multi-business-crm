@echo off
chcp 65001 >nul
echo ========================================
echo   Multi Business CRM 数据库恢复
echo ========================================
echo.

:: 进入项目目录
cd /d D:\web_project\multi-business-crm

:: 检查 Docker 是否运行
echo [1/5] 检查 Docker 状态...
docker info >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker 未运行，请先启动 Docker Desktop
    pause
    exit /b 1
)
echo [√] Docker 正在运行

:: 检查容器是否运行
echo.
echo [2/5] 检查 PostgreSQL 容器...
docker ps | findstr "multi-business-crm-postgres" >nul 2>&1
if errorlevel 1 (
    echo [警告] PostgreSQL 容器未运行，正在启动...
    docker start multi-business-crm-postgres >nul 2>&1
    echo [√] PostgreSQL 容器已启动
) else (
    echo [√] PostgreSQL 容器正在运行
)

:: 列出可用的备份文件
echo.
echo [3/5] 可用的备份文件：
echo.
if not exist backups (
    echo [错误] 备份目录不存在
    pause
    exit /b 1
)
dir /b backups\*.sql 2>nul
if errorlevel 1 (
    echo [错误] 没有找到备份文件
    pause
    exit /b 1
)

:: 获取用户输入
echo.
set /p backupfile="请输入要恢复的备份文件名（例如: multi_business_crm_20240101_120000.sql）: "
if "%backupfile%"=="" (
    echo [错误] 文件名不能为空
    pause
    exit /b 1
)

if not exist "backups\%backupfile%" (
    echo [错误] 文件不存在: backups\%backupfile%
    pause
    exit /b 1
)

:: 二次确认
echo.
echo ========================================
echo   警告：恢复操作会覆盖当前数据库！
echo   文件: backups\%backupfile%
echo ========================================
echo.
set /p confirm="请输入 YES 确认恢复: "
if not "%confirm%"=="YES" (
    echo 已取消恢复操作
    pause
    exit /b 0
)

:: 先备份当前数据
echo.
echo [4/5] 备份当前数据（安全措施）...
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set safefilename=multi_business_crm_before_restore_%datetime:~0,8%_%datetime:~8,6%.sql
docker exec multi-business-crm-postgres pg_dump -U postgres multi_business_crm > backups\%safefilename%
if not errorlevel 1 (
    echo [√] 当前数据已备份到: backups\%safefilename%
) else (
    echo [警告] 无法备份当前数据
)

:: 执行恢复
echo.
echo [5/5] 执行恢复...
type "backups\%backupfile%" | docker exec -i multi-business-crm-postgres psql -U postgres multi_business_crm >nul 2>&1
if errorlevel 1 (
    echo [错误] 恢复失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo   恢复成功！
echo ========================================
echo.
echo   请执行以下命令完成配置：
echo   1. npx prisma generate
echo   2. npm run dev
echo.
echo   访问地址: http://localhost:3003
echo.

pause
