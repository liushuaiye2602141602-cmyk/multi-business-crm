# 首次运行

## 启动开发服务器

完成 [本地安装](02-local-installation.md)、[环境变量配置](03-environment-variables.md) 和 [数据库设置](04-database-setup.md) 后，启动开发服务器：

```bash
npm run dev
```

> 开发服务器运行在 **3003** 端口（非默认 3000）。

启动成功后会看到类似输出：

```
  ▲ Next.js 16.2.7
  - Local:        http://localhost:3003
  - Environments: .env
```

## 验证页面

在浏览器中打开以下页面，确认均可正常加载：

| 地址 | 说明 |
|------|------|
| http://localhost:3003/login | 登录页面 |
| http://localhost:3003/dashboard | 工作台（需登录） |
| http://localhost:3003/leads | 线索管理 |
| http://localhost:3003/customers | 客户管理 |

## 默认登录

- **邮箱：** admin@example.com
- **密码：** password123

登录后应看到 Dashboard 页面，左侧为导航菜单，包含线索、客户、报价、订单等模块。

## 导入种子数据

种子数据（Seed Data）包含示例租户、用户、业务线、产品、线索、客户、报价、订单和任务，便于快速体验系统功能。

### 方式一：通过 npm 命令

```bash
# 确保数据库结构已推送
npx prisma db push

# 执行种子数据导入
npm run db:seed
```

### 方式二：通过 Prisma

```bash
npx prisma db seed
```

两种方式效果相同，`npm run db:seed` 内部调用 `npx prisma db seed`，最终执行 `prisma/seed.ts`。

### 种子数据内容

| 数据类型 | 数量 | 说明 |
|----------|------|------|
| Tenant | 2 | Demo Company (PRO), Test Trading Co (FREE) |
| User | 3 | admin@example.com, sales@example.com, user2@example.com |
| BusinessLine | 3 | FLEX (软包装), PACK (包装机), WOOD (木制工艺品) |
| Product | 30 | 覆盖 3 条业务线 |
| Lead | 5 | 来自美国、英国、德国、日本、加拿大 |
| Customer | 3 | 新加坡、德国、阿联酋 |
| Quote | 3 | 已接受、已发送、草稿 |
| Order | 2 | 已发货、已完成 |
| Task | 5 | 电话、跟进、邮件 |
| FollowUpTemplate | 6 | 首次回复、报价确认等 |

### 测试用户账号

| 邮箱 | 密码 | 角色 |
|------|------|------|
| admin@example.com | password123 | ADMIN |
| sales@example.com | password123 | SALES |
| user2@example.com | password123 | ADMIN |

## 检查数据库连接

### 使用 Prisma Studio

```bash
npx prisma studio
```

浏览器会自动打开 Prisma Studio（默认 http://localhost:5555），可以浏览和编辑所有数据库表。

### 使用命令行验证

```bash
# 查看数据库状态
npx prisma db push --preview-feature

# 查看迁移历史
npx prisma migrate status
```

### 手动连接数据库

如果安装了 `psql` 客户端：

```bash
psql "postgresql://postgres:YOUR_PASSWORD@localhost:5433/open_crm" -c "\dt"
```

该命令列出所有数据库表，确认表已创建。

## 常用开发命令

| 命令 | 用途 |
|------|------|
| `npm run dev` | 启动开发服务器 (port 3003) |
| `npm run build` | 构建生产版本 |
| `npm run lint` | 代码检查 |
| `npm run seed` | 执行种子脚本 |
| `npx prisma studio` | 打开数据库管理界面 |
| `npx prisma generate` | 重新生成 Prisma Client |

## 常见问题排查

### 端口 3003 已被占用

```
Error: listen EADDRINUSE: address already in use :::3003
```

**解决方法：** 关闭占用端口的进程，或修改 `package.json` 中的端口号：

```bash
# Windows: 查找占用端口的进程
netstat -ano | findstr :3003

# macOS / Linux: 查找占用端口的进程
lsof -i :3003
```

### 数据库连接失败

```
Error: P1001: Can't reach database server at localhost:5433
```

**排查步骤：**

1. 确认 PostgreSQL 容器正在运行：
   ```bash
   docker ps | grep postgres
   ```
2. 如果未运行，启动容器：
   ```bash
   docker start open-crm-postgres
   ```
3. 检查 `.env` 中 `DATABASE_URL` 是否正确

### Prisma Client 未生成

```
Error: @prisma/client did not initialize yet
```

**解决方法：**

```bash
npx prisma generate
npx prisma db push
```

### 种子数据导入失败

如果已存在种子数据，再次执行会因唯一约束冲突而失败。可以选择：

1. 忽略错误（数据已存在）
2. 重置数据库（仅限开发环境）：
   ```bash
   npx prisma migrate reset
   npx prisma db push
   npm run db:seed
   ```

> **警告：** `npx prisma migrate reset` 会清空数据库，生产环境严禁使用。

### Next.js 构建缓存问题

如果页面出现异常，尝试清除缓存：

```bash
# Windows
rmdir /s /q .next

# macOS / Linux
rm -rf .next

# 重新启动
npm run dev
```
