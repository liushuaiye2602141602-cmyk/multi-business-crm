@echo off
chcp 65001 >nul
echo ========================================
echo   Multi Business CRM 数据库备份
echo ========================================
echo.

:: 进入项目目录
cd /d D:\web_project\multi-business-crm

:: 检查 Docker 是否运行
echo [1/3] 检查 Docker 状态...
docker info >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker 未运行，请先启动 Docker Desktop
    pause
    exit /b 1
)
echo [√] Docker 正在运行

:: 检查容器是否运行
echo.
echo [2/3] 检查 PostgreSQL 容器...
docker ps | findstr "multi-business-crm-postgres" >nul 2>&1
if errorlevel 1 (
    echo [警告] PostgreSQL 容器未运行，正在启动...
    docker start multi-business-crm-postgres >nul 2>&1
    if errorlevel 1 (
        echo [错误] 无法启动 PostgreSQL 容器
        pause
        exit /b 1
    )
    echo [√] PostgreSQL 容器已启动
) else (
    echo [√] PostgreSQL 容器正在运行
)

:: 创建备份目录
echo.
echo [3/3] 执行备份...
if not exist backups (
    mkdir backups
    echo [√] 创建备份目录: backups
)

:: 生成备份文件名
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set filename=multi_business_crm_%datetime:~0,8%_%datetime:~8,6%.sql

:: 执行备份
docker exec multi-business-crm-postgres pg_dump -U postgres multi_business_crm > backups\%filename%
if errorlevel 1 (
    echo [错误] 备份失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo   备份成功！
echo   文件: backups\%filename%
echo ========================================
echo.

:: 显示备份文件大小
for %%A in (backups\%filename%) do echo   大小: %%~zA 字节

pause
