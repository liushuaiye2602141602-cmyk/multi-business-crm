# 构建缓存问题

## .next 目录膨胀

### 症状

`.next` 目录占用大量磁盘空间（可达 9.8GB）。

### 清理

```bash
# 安全删除 .next 构建缓存
rm -rf .next

# 重新构建
npm run build
```

### 原因

- 多次增量构建累积的缓存文件
- 大量页面的预渲染输出
- Webpack/Turbopack 的编译缓存

### 预防

定期清理构建缓存（建议每周一次）：

```bash
# Windows 批处理清理脚本
rmdir /s /q .next
npm run build
```

```bash
# Linux/macOS
rm -rf .next && npm run build
```

## TypeScript 构建信息（tsbuildinfo）

### 问题

`tsconfig.tsbuildinfo` 文件可能随项目增长而变大。

### 清理

```bash
# 删除构建信息文件（下次编译会重新生成）
rm tsconfig.tsbuildinfo

# 重新构建
npx tsc --noEmit
```

## Turbopack 缓存

### 问题

Next.js 16 使用 Turbopack 作为默认打包器，缓存可能累积。

### 清理

```bash
# 删除 Turbopack 缓存
rm -rf .next/cache

# 或完全删除 .next
rm -rf .next
```

## 调试构建问题

### 详细构建日志

```bash
# 显示详细构建信息
NEXT_DEBUG_BUILD=1 npm run build
```

### 分析构建产物大小

```bash
# 安装分析工具
npm install -D @next/bundle-analyzer

# 在 next.config.js 中启用
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
module.exports = withBundleAnalyzer({})

# 运行分析
ANALYZE=true npm run build
```

### Prisma 生成缓存

如果 Prisma Client 更新后仍使用旧版本：

```bash
# 清除 Prisma 缓存
rm -rf node_modules/.prisma
rm -rf lib/generated/prisma

# 重新生成
npx prisma generate
```

## 磁盘空间不足

### 诊断

```bash
# Windows
wmic logicaldisk get size,freespace,caption

# Linux
df -h

# 检查项目各目录大小
du -sh .next node_modules prisma backups
```

### 释放空间

```bash
# 1. 清理构建缓存
rm -rf .next

# 2. 清理 npm 缓存
npm cache clean --force

# 3. 清理 Docker 无用镜像
docker system prune -a

# 4. 清理旧备份（保留最近 5 个）
ls -t backups/*.sql | tail -n +6 | xargs rm

# 5. 清理 node_modules 重新安装
rm -rf node_modules
npm ci --legacy-peer-deps
```
