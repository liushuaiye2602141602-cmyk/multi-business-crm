# 安装与启动问题

## npm ci 失败

### 症状

```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

### 原因与解决

**依赖冲突**：

```bash
# 使用 --legacy-peer-deps 安装
npm ci --legacy-peer-deps

# 或清除缓存后重试
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Node.js 版本不兼容**：

```bash
# 检查版本（需要 >= 18）
node --version

# 使用 nvm 切换版本
nvm install 18
nvm use 18
```

**网络问题**：

```bash
# 使用国内镜像
npm config set registry https://registry.npmmirror.com
npm ci

# 或设置代理
npm config set proxy http://your-proxy:port
npm config set https-proxy http://your-proxy:port
```

## Prisma Client 未生成

### 症状

```
Cannot find module '@prisma/client'
```

### 解决

```bash
# 生成 Prisma Client
npx prisma generate

# 如果仍然失败，重新安装 Prisma
npm install prisma @prisma/client @prisma/adapter-pg
npx prisma generate
```

### 注意

生成的 Client 位于 `lib/generated/prisma/`，这是 `schema.prisma` 中配置的输出路径。如果路径错误，检查：

```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../lib/generated/prisma"
}
```

## 端口冲突

### 症状

```
Error: listen EADDRINUSE: address already in use :::3003
```

### 解决

```bash
# 查找占用端口的进程（Windows）
netstat -ano | findstr :3003

# 查找占用端口的进程（macOS/Linux）
lsof -i :3003

# 终止进程（替换 PID）
taskkill /PID <PID> /F   # Windows
kill -9 <PID>            # macOS/Linux
```

### 修改端口

在 `package.json` 的 dev 脚本中修改端口：

```json
{
  "scripts": {
    "dev": "next dev -p 3004"
  }
}
```

## 依赖安装后启动失败

### 症状

启动时报模块缺失或版本不兼容错误。

### 解决

```bash
# 完全重装
rm -rf node_modules
npm cache clean --force
npm ci --legacy-peer-deps

# 重新生成 Prisma Client
npx prisma generate
```

## Windows 特定问题

### 路径过长

```
ENAMETOOLONG
```

解决：

```bash
# 启用 Windows 长路径支持（需管理员权限）
# 或将项目移到较短的路径下，如 D:\crm\
```

### 权限问题

```bash
# 以管理员身份运行终端
# 或使用 Git Bash（通常权限更宽松）
```
