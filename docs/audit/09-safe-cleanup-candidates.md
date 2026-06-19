# 09 - Safe Cleanup Candidates

> 审计日期：2026-06-19

## 分类：A - 可安全重新生成

| 目录/文件 | 大小 | 恢复方式 | 风险 |
|-----------|------|---------|------|
| `.next/` | 9.8 GB | `npm run dev` 或 `npm run build` | 无风险 |
| `lib/generated/prisma/` | 4.2 MB | `npx prisma generate` | 无风险 |
| `tsconfig.tsbuildinfo` | 188 KB | TypeScript 编译时自动生成 | 无风险 |

**A 类可释放空间：~10 GB**

## 分类：B - 可通过重新安装恢复

| 目录 | 大小 | 恢复方式 | 风险 |
|------|------|---------|------|
| `node_modules/` | 860 MB | `npm install` | 无风险（有 package-lock.json） |

**B 类可释放空间：~860 MB**

## 分类：C - 需要确认后才能删除

| 目录/文件 | 大小 | 说明 | 风险 |
|-----------|------|------|------|
| `.next/dev/logs/next-development.log` | 小 | 开发日志 | 低 |
| `backup-db.bat` | 小 | 数据库备份脚本 | 低（脚本本身） |
| `restore-db.bat` | 小 | 数据库恢复脚本 | 低 |
| `start-crm.bat` | 小 | 启动脚本 | 低 |
| `docs/superpowers/` | 已移除 | 内部规划文档（已在 .gitignore） | 无 |

## 分类：D - 绝对不能删除

| 目录/文件 | 大小 | 说明 |
|-----------|------|------|
| `app/` | 1.3 MB | 所有页面和 API 路由 |
| `components/` | 306 KB | 所有 UI 组件 |
| `lib/` (非 generated) | ~100 KB | 业务逻辑代码 |
| `prisma/schema.prisma` | 32 KB | 数据库 Schema |
| `prisma/migrations/` | 5 KB | 数据库迁移 |
| `prisma/seed.ts` | ~12 KB | 种子数据 |
| `.env` | 小 | 环境变量（未提交 git） |
| `.git/` | 3.8 MB | Git 仓库历史 |
| `package.json` | 小 | 依赖声明 |
| `package-lock.json` | 340 KB | 依赖锁定 |
| `next.config.ts` | 小 | Next.js 配置 |
| `middleware.ts` | 小 | 路由守卫 |
| `Dockerfile` | 小 | Docker 构建 |
| `docker-compose.yml` | 小 | Docker 编排 |

## 安全清理建议

```bash
# 释放 ~10 GB（A 类）
rm -rf .next/
rm -rf lib/generated/
rm -f tsconfig.tsbuildinfo

# 释放 ~860 MB（B 类，需要重新安装）
rm -rf node_modules/
npm install

# 总计可释放 ~10.8 GB
```

**清理后项目大小：~200 MB**（从 11 GB 降到 200 MB）
