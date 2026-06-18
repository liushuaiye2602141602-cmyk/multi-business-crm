@echo off
chcp 65001 >nul
echo ========================================
echo   Multi Business CRM 启动脚本
echo ========================================
echo.

:: 进入项目目录
cd /d "%~dp0"

:: 检查 Docker 是否运行
echo [1/4] 检查 Docker 状态...
docker info >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker 未运行，请先启动 Docker Desktop
    pause
    exit /b 1
)
echo [√] Docker 正在运行

:: 启动 PostgreSQL 容器
echo.
echo [2/4] 启动 PostgreSQL 容器...
docker start multi-business-crm-postgres >nul 2>&1
if errorlevel 1 (
    echo [错误] 无法启动 PostgreSQL 容器
    echo 请检查容器是否存在：docker ps -a
    pause
    exit /b 1
)
echo [√] PostgreSQL 容器已启动

:: 检查端口占用
echo.
echo [3/4] 检查端口 3003...
netstat -ano | findstr ":3003" >nul 2>&1
if not errorlevel 1 (
    echo [警告] 端口 3003 已被占用
    echo 占用进程信息：
    netstat -ano | findstr ":3003"
    echo.
    echo 请先关闭占用端口的进程，或使用其他端口
    pause
    exit /b 1
)
echo [√] 端口 3003 可用

:: 启动项目
echo.
echo [4/4] 启动 CRM 项目...
echo.
echo ========================================
echo   访问地址: http://localhost:3003
echo   按 Ctrl+C 停止服务
echo ========================================
echo.

npm run dev
