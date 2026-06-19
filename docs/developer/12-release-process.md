# 发布流程

## Git 工作流

### 分支策略

```
main          ← 稳定发布版本
  └── dev     ← 开发主线
       ├── feature/xxx   ← 功能分支
       ├── fix/xxx       ← 修复分支
       └── hotfix/xxx    ← 紧急修复
```

- **main**：仅通过 dev 合并或 hotfix 合并更新，始终处于可发布状态
- **dev**：日常开发主线，功能完成后合并到 dev
- **feature/\***：从 dev 创建，完成后合并回 dev
- **fix/\***：从 dev 创建，完成后合并回 dev
- **hotfix/\***：从 main 创建，修复后同时合并到 main 和 dev

### 分支命名规范

```
feature/lead-import-improvements
fix/quote-currency-calculation
hotfix/security-jwt-fallback
```

## 版本管理

### 版本号

版本号记录在项目根目录的 `VERSION` 文件中，当前为 `0.1.0`。

遵循语义化版本（SemVer）：

```
MAJOR.MINOR.PATCH
  │      │      │
  │      │      └── 向后兼容的 bug 修复
  │      └── 向后兼容的新功能
  └── 不兼容的 API 变更
```

### 版本号更新

```bash
# 更新 VERSION 文件
echo "0.2.0" > VERSION
```

## CHANGELOG

变更日志记录在 `CHANGELOG.md`，格式遵循 Keep a Changelog：

```markdown
## [0.2.0] - 2025-01-15

### Added
- 新增供应商管理模块
- 邮件模板 AI 重写功能

### Changed
- 优化线索列表查询性能

### Fixed
- 修复报价单币种转换错误

### Deprecated
- 旧版 EmailConfig 模型

### Removed
- 移除已废弃的旧版邮件接口
```

## 发布检查清单

### 代码检查

```bash
# 1. 类型检查
npx tsc --noEmit

# 2. ESLint 检查
npx eslint . --max-warnings 0

# 3. 确认无 console.log 遗留
grep -rn "console.log" app/ lib/ components/
```

### 数据库检查

```bash
# 1. 检查是否有未迁移的 Schema 变更
npx prisma migrate status

# 2. 生成最新 Prisma Client
npx prisma generate
```

### 功能验证

- [ ] 登录/登出正常
- [ ] 核心 CRUD（线索、客户、报价、订单）正常
- [ ] AI 分析功能正常
- [ ] 邮件发送/接收正常（如适用）
- [ ] 数据导出正常

### 部署前

- [ ] 更新 `VERSION` 文件
- [ ] 更新 `CHANGELOG.md`
- [ ] 确认 `.env.example` 包含所有新的环境变量
- [ ] 检查 Docker 构建：`docker-compose build`
- [ ] 在 staging 环境验证

### 部署后

- [ ] 运行生产数据库迁移：`npx prisma migrate deploy`
- [ ] 验证应用启动正常
- [ ] 检查系统健康页面：`/system-health`
- [ ] 监控错误日志

## Git 提交规范

```
<type>(<scope>): <description>

# 示例
feat(lead): 新增线索批量导入功能
fix(quote): 修复报价单金额计算错误
chore(deps): 升级 Next.js 到 16.2.7
docs(api): 更新 API 文档
```

### Type 类型

| Type | 说明 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| docs | 文档变更 |
| style | 代码格式（不影响功能） |
| refactor | 重构（不新增功能或修复 bug） |
| perf | 性能优化 |
| test | 测试相关 |
| chore | 构建/工具变更 |

## Hotfix 流程

紧急修复的标准流程：

```bash
# 1. 从 main 创建 hotfix 分支
git checkout main
git checkout -b hotfix/critical-fix

# 2. 修复问题
# ...修改代码...

# 3. 提交
git commit -m "fix(security): 修复 JWT fallback 安全问题"

# 4. 合并到 main
git checkout main
git merge --no-ff hotfix/critical-fix

# 5. 更新版本号
echo "0.1.1" > VERSION

# 6. 打 tag
git tag -a v0.1.1 -m "Hotfix: JWT fallback"

# 7. 同步到 dev
git checkout dev
git merge --no-ff hotfix/critical-fix

# 8. 清理
git branch -d hotfix/critical-fix

# 9. 部署
# ...执行部署流程...
```
