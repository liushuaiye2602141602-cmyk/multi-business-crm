# 19 - Storage Risk and Recommendation

> 审计日期：2026-06-19

## 当前风险

| 风险 | 级别 | 说明 |
|------|------|------|
| GitHub 误提交附件 | 🟢 无风险 | 无附件功能 |
| Vercel 重部署后文件丢失 | 🟢 无风险 | 无文件存储 |
| Docker 容器重建后文件丢失 | 🟢 无风险 | 无文件存储 |
| 多实例文件不同步 | 🟢 无风险 | 无文件存储 |
| 本地磁盘损坏丢失文件 | 🟢 无风险 | 无文件存储 |
| 跨租户访问风险 | 🟢 无风险 | 无文件存储 |
| 附件公开 URL 访问 | 🟢 无风险 | 无文件存储 |
| 项目体积增长 | 🟢 无风险 | 无文件存储 |

**当前无文件存储风险，因为文件上传功能尚未实现。**

## 推荐存储方案对比

| 方案 | 本地开发 | VPS 部署 | SaaS | 成本 | 私有文件 | 权限控制 | 多租户 | 备份 | 迁移难度 |
|------|---------|---------|------|------|---------|---------|--------|------|---------|
| A. 本地+Docker Volume | ✅ | ✅ | ❌ | 免费 | ⚠️ | ❌ | ❌ | 手动 | 低 |
| B. MinIO 自建 | ✅ | ✅ | ✅ | 免费 | ✅ | ✅ | ✅ | 需配置 | 中 |
| C. Cloudflare R2 | ✅ | ✅ | ✅ | 低 | ✅ | ✅ | ✅ | 自动 | 低 |
| D. AWS S3 | ✅ | ✅ | ✅ | 中 | ✅ | ✅ | ✅ | 自动 | 低 |
| E. 阿里云 OSS | ✅ | ✅ | ✅ | 低 | ✅ | ✅ | ✅ | 自动 | 低 |
| F. 腾讯云 COS | ✅ | ✅ | ✅ | 低 | ✅ | ✅ | ✅ | 自动 | 低 |
| G. Supabase Storage | ✅ | ✅ | ✅ | 低 | ✅ | ✅ | ✅ | 自动 | 低 |
| H. Vercel Blob | ✅ | ❌ | ✅ | 低 | ✅ | ✅ | ✅ | 自动 | 低 |

## 推荐方案

**开发环境：** 本地 `storage/` 目录 + Docker Volume
**生产环境（VPS）：** MinIO 自建 或 Cloudflare R2
**生产环境（SaaS）：** Cloudflare R2 或 阿里云 OSS

### 推荐对象路径

```
tenant/{tenantId}/{entity}/{entityId}/{category}/{fileId}/{filename}
```

示例：
```
tenant/1/customers/42/documents/101/contract.pdf
tenant/1/quotes/15/attachments/202/quotation.pdf
tenant/1/emails/301/attachments/401/spec-sheet.xlsx
```
