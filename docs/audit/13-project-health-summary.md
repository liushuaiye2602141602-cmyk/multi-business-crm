# 13 - Project Health Summary

> 审计日期：2026-06-19 | 项目：multi-business-crm

## 1. 项目总大小

**11 GB**（其中 9.8 GB 是 .next 开发缓存）

## 2. 空间组成

| 目录 | 大小 | 占比 |
|------|------|------|
| `.next/` | 9.8 GB | 89.1% |
| `node_modules/` | 860 MB | 7.8% |
| 源代码 + 配置 | ~200 MB | 1.8% |
| `.git/` | 3.8 MB | 0.03% |

## 3. 源代码大小

**~1.8 MB**（346 个源文件）

| 类型 | 数量 |
|------|------|
| TypeScript (.ts) | 147 |
| TSX (.tsx) | 158 |
| Markdown (.md) | 13 |
| 配置文件 | ~30 |

## 4. 业务模块统计

| 指标 | 数量 |
|------|------|
| 总模块数 | 52 |
| 完整可用 | 35 |
| 基本可用 | 12 |
| 部分实现 | 3 |
| 已废弃保留 | 2 |
| 重复模块 | 2（Email/EmailConfig） |
| 死代码模块 | 1（AI Control Guard 未接入，已修复） |

## 5. 重复模块

| 模块 | 重复对 | 说明 |
|------|--------|------|
| Email | `Email` vs `EmailMessage` | 字段几乎相同 |
| EmailConfig | `EmailConfig` vs `EmailAccount` | 功能重叠 |
| AI Scoring | `Lead.aiScore` vs `AIAnalysis` | 双源存储 |

## 6. 安全清理建议

| 操作 | 可释放空间 | 风险 |
|------|-----------|------|
| 清理 `.next/` | ~9.8 GB | 无（可重新生成） |
| 重装 `node_modules/` | ~860 MB | 无（npm install 可恢复） |
| **总计** | **~10.8 GB** | - |

## 7. 系统健康评级

| 维度 | 评级 |
|------|------|
| 功能完整度 | 🟢 好（52 模块，35 完整） |
| 代码质量 | 🟡 中等（有重复，已收敛） |
| 磁盘效率 | 🔴 差（91% 是缓存） |
| 安全性 | 🟡 中等（52% 模型缺 tenantId） |
| 可维护性 | 🟡 中等（模块多但已统一执行链） |

## 8. 推荐清理执行顺序

1. ✅ `rm -rf .next/` → 释放 9.8 GB
2. ✅ `rm -rf node_modules/ && npm install` → 释放 860 MB
3. ✅ `rm -rf lib/generated/ && npx prisma generate` → 释放 4.2 MB
4. ✅ `rm -f tsconfig.tsbuildinfo` → 释放 188 KB

**清理后项目大小：~200 MB**（从 11 GB 降到 200 MB，释放 98%）

## 9. 是否存在数据库或附件丢失风险

**否** — 数据库存储在 Docker 卷中，不在项目目录内。项目目录内无附件文件。

## 10. 是否建议删除 node_modules 后重新安装

**✅ 建议** — 当前 860 MB，重装后相同大小但更干净。

## 11. 是否建议清理 .next

**✅ 强烈建议** — 9.8 GB 的 Turbopack 缓存是项目臃肿的唯一原因。清理后开发体验不受影响（下次 `npm run dev` 会自动重建）。

## 12. 是否建议压缩 Git 历史

**❌ 不建议** — .git 仅 3.8 MB，非常小。不需要 `git filter-repo`。
