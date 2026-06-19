# 本地安装

## Windows (PowerShell)

```powershell
# 1. 克隆项目
git clone https://github.com/your-username/multi-business-crm.git
cd multi-business-crm

# 2. 安装依赖
npm install

# 3. 配置环境变量
Copy-Item .env.example .env
# 使用文本编辑器编辑 .env，设置数据库密码

# 4. 启动 PostgreSQL
docker run -d --name open-crm-postgres -e POSTGRES_PASSWORD=YOUR_PASSWORD -e POSTGRES_DB=open_crm -p 5433:5432 postgres:16

# 5. 生成 Prisma Client
npx prisma generate

# 6. 推送数据库结构
npx prisma db push

# 7. 启动开发服务器
npm run dev
```

## Linux / macOS (Bash)

```bash
# 1. 克隆项目
git clone https://github.com/your-username/multi-business-crm.git
cd multi-business-crm

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 使用文本编辑器编辑 .env，设置数据库密码

# 4. 启动 PostgreSQL
docker run -d --name open-crm-postgres -e POSTGRES_PASSWORD=YOUR_PASSWORD -e POSTGRES_DB=open_crm -p 5433:5432 postgres:16

# 5. 生成 Prisma Client
npx prisma generate

# 6. 推送数据库结构
npx prisma db push

# 7. 启动开发服务器
npm run dev
```

## 验证安装

访问 http://localhost:3003/login，使用测试账号登录：
- 邮箱：admin@example.com
- 密码：password123

如果看到登录页面并能成功登录，说明安装完成。
