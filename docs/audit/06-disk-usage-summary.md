# 06 - Disk Usage Summary

> 审计日期：2026-06-19 | 项目路径：D:\web_project\multi-business-crm

## 项目总大小

| 目录 | 大小 | 占比 | 用途 | 可清理 | 风险 | 可释放 |
|------|------|------|------|--------|------|--------|
| `.next/` | **9.8 GB** | 89.1% | Next.js 构建缓存 | ✅ 可清理 | 低（可重新生成） | **~9.8 GB** |
| `node_modules/` | **860 MB** | 7.8% | npm 依赖 | ✅ 可重装 | 无（npm install 可恢复） | **~860 MB** |
| `lib/generated/` | **4.2 MB** | 0.04% | Prisma 生成代码 | ✅ 可重新生成 | 无（prisma generate 可恢复） | ~4.2 MB |
| `lib/` (源码) | **4.3 MB** | 0.04% | 业务逻辑代码 | ❌ 不能删除 | - | - |
| `.git/` | **3.8 MB** | 0.03% | Git 仓库 | ❌ 不能删除 | - | - |
| `app/` | **1.3 MB** | 0.01% | 页面和 API | ❌ 不能删除 | - | - |
| `components/` | **306 KB** | <0.01% | UI 组件 | ❌ 不能删除 | - | - |
| `prisma/` | **61 KB** | <0.01% | Schema + 迁移 | ❌ 不能删除 | - | - |
| `scripts/` | **16 KB** | <0.01% | 工具脚本 | ❌ 不能删除 | - | - |
| `docs/` | **12 KB** | <0.01% | 文档 | ❌ 不能删除 | - | - |
| `public/` | **11 KB** | <0.01% | 静态资源 | ❌ 不能删除 | - | - |

**总计：~11 GB**

## .next 内部细分

| 子目录 | 大小 | 说明 |
|--------|------|------|
| `.next/dev/cache/turbopack/` | **9.4 GB** | Turbopack 开发缓存（最大占用） |
| `.next/dev/server/` | 288 MB | 开发服务器编译产物 |
| `.next/dev/static/` | 59 MB | 静态资源编译 |
| `.next/standalone/` | 39 MB | Docker standalone 构建 |
| `.next/server/` | 48 MB | 服务端渲染 |
| `.next/static/` | 1.7 MB | 生产静态资源 |

## node_modules 分析

- **14 个直接依赖** + **13 个开发依赖**
- `@electric-sql/pglite` 包含大量 `.tar.gz` PostgreSQL 扩展文件
- `@prisma/dev` 包含大量 `.tar.gz` 运行时资源
- 这些 `.tar.gz` 文件是 Prisma 和 pglite 的标准分布，不是项目问题

## Docker 卷

| 类型 | 大小 | 说明 |
|------|------|------|
| Docker 镜像 | 3.03 GB | postgres:16 等镜像 |
| Docker 容器 | 58 MB | 运行中容器 |
| Docker 卷 | 134.7 MB | PostgreSQL 数据卷 |

## 结论

项目 **11 GB 总大小中，9.8 GB (89%) 是 .next 开发缓存**。源代码本身仅 **1.8 MB**。清理 .next 可释放约 **10 GB** 空间。
