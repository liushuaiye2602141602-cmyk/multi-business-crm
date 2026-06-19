# 维护者指南

## 维护者职责

作为 Multi-Business CRM 的维护者，您负责：

### 代码质量

- 审查所有 Pull Request，确保代码符合项目风格（参考 `docs/developer/11-code-style.md`）
- 确保新功能有对应的文档更新
- 确保数据库迁移正确且可逆
- 审查安全相关变更（认证、权限、数据隔离）

### 发布管理

- 遵循发布流程（参考 `docs/developer/12-release-process.md`）
- 维护 CHANGELOG.md
- 管理版本号（VERSION 文件）
- 打 Git Tag

### 社区管理

- 回复 Issue 和 Discussion 中的问题
- 标记和分类 Issue（bug / feature / question）
- 审查和合并合格的 PR
- 维护 Roadmap（ROADMAP.md）

## Review 流程

### Pull Request 审查要点

1. **功能完整性**：PR 是否完整实现了描述中的功能
2. **代码质量**：
   - TypeScript 类型是否正确
   - 命名是否符合约定
   - 是否有重复代码可抽象
3. **数据库变更**：
   - Prisma Schema 变更是否合理
   - 迁移文件是否正确
   - 是否考虑了数据回滚
4. **安全检查**：
   - 是否引入新的安全隐患
   - 是否正确处理用户输入
   - 敏感数据是否正确处理
5. **文档**：
   - 是否需要更新文档
   - API 变更是否记录

### Merge 策略

- **功能分支**：Squash and Merge（保持 main 历史干净）
- **热修复**：Merge Commit（保留完整历史）
- **文档更新**：直接 Merge

### 分支清理

合并后及时删除已合并的功能分支：

```bash
git branch -d feature/xxx
git push origin --delete feature/xxx
```

## Issue 分类

| 标签 | 说明 |
|------|------|
| bug | 功能异常 |
| feature | 新功能请求 |
| question | 使用问题 |
| documentation | 文档相关 |
| security | 安全问题（转为 Security Advisory） |
| breaking-change | 破坏性变更 |
| good-first-issue | 适合新贡献者 |

## 优先级

| 级别 | 说明 | 响应时间 |
|------|------|----------|
| P0 - Critical | 安全漏洞、数据丢失 | 24 小时 |
| P1 - High | 核心功能不可用 | 3 天 |
| P2 - Medium | 功能异常但有 workaround | 1 周 |
| P3 - Low | 体验优化、文档修复 | 下个版本 |

## 版本规划

### 版本节奏

- **主版本（MAJOR）**：重大架构变更，每年不超过 2 次
- **次版本（MINOR）**：新功能，每月或每两周
- **补丁（PATCH）**：Bug 修复，随时发布

### Roadmap 管理

维护 `ROADMAP.md` 文件，分为：

- **当前版本**：正在进行的工作
- **下一版本**：计划中的功能
- **远期目标**：未来方向

## 安全事务

安全漏洞的处理流程：

1. 通过 Security Advisory 接收报告
2. 确认漏洞存在和严重程度
3. 开发修复（私有分支）
4. 发布安全更新
5. 公开安全通告

参考 `SECURITY.md` 了解详细的安全报告流程。

## 常用命令

```bash
# 本地开发
npm run dev          # 启动开发服务器（端口 3003）

# 数据库
npx prisma migrate dev --name xxx   # 创建迁移
npx prisma generate                  # 重新生成 Client
npx prisma studio                    # 数据库 GUI

# 代码质量
npx tsc --noEmit     # 类型检查
npx eslint .         # Lint 检查

# 构建
npm run build        # 生产构建
docker-compose build # Docker 构建
```
