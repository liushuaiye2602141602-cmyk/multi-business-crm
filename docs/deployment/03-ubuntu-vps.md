# Ubuntu VPS 部署

## 适用环境

- Ubuntu 22.04 LTS（推荐）或 24.04 LTS
- 最低配置：2GB RAM, 1 vCPU, 20GB 磁盘
- 推荐配置：4GB RAM, 2 vCPU, 40GB 磁盘

## 完整部署流程

### 第一步：服务器初始化

SSH 连接到服务器后，更新系统：

```bash
sudo apt update && sudo apt upgrade -y
```

设置时区：

```bash
sudo timedatectl set-timezone Asia/Shanghai
```

### 第二步：安装 Docker

安装 Docker Engine 和 Docker Compose：

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 验证安装
docker --version
docker compose version
```

> **重要：** 执行 `usermod` 后需要重新登录 SSH 才能生效。可以先退出再重新连接，或执行 `newgrp docker`。

### 第三步：配置防火墙

```bash
# 安装 UFW（如果没有）
sudo apt install ufw -y

# 允许 SSH
sudo ufw allow 22/tcp

# 允许 HTTP 和 HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 允许应用端口（如果不使用 Nginx 反向代理）
sudo ufw allow 3000/tcp

# 启用防火墙
sudo ufw enable
```

### 第四步：部署项目

```bash
# 安装 Git（如果没有）
sudo apt install git -y

# 克隆项目
git clone https://github.com/your-username/multi-business-crm.git
cd multi-business-crm

# 配置环境变量
cp .env.example .env
```

编辑 `.env` 文件：

```bash
nano .env
```

设置以下内容：

```env
POSTGRES_PASSWORD=YOUR_STRONG_DB_PASSWORD_HERE
JWT_SECRET=YOUR_RANDOM_JWT_SECRET_HERE
APP_URL=http://your-server-ip
```

### 第五步：启动服务

```bash
# 构建并启动
docker compose up -d --build

# 等待启动完成（约 3-5 分钟）
docker compose ps
```

### 第六步：初始化数据库

```bash
# 运行数据库迁移
docker compose exec app npx prisma migrate deploy

# （可选）导入种子数据
docker compose exec app npm run db:seed
```

### 第七步：验证部署

```bash
# 查看服务状态
docker compose ps

# 查看应用日志
docker compose logs -f app
```

访问 `http://your-server-ip:3000` 确认应用正常运行。

默认登录：
- **邮箱：** admin@example.com
- **密码：** password123

## 配置 Nginx 反向代理

推荐在应用前面添加 Nginx 反向代理，参见 [Nginx 反向代理](05-reverse-proxy.md) 和 [HTTPS 配置](06-https.md)。

### 快速安装 Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 基础反向代理配置

```bash
sudo nano /etc/nginx/sites-available/crm
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

配置完成后，应用通过 http://your-domain.com 访问。

## 配置 HTTPS

参见 [HTTPS 配置](06-https.md)，使用 Let's Encrypt 免费 SSL 证书。

## 开机自启

Docker 服务默认开机自启：

```bash
# 确认 Docker 开机自启
sudo systemctl is-enabled docker

# 如果未启用
sudo systemctl enable docker
```

确保 `docker-compose.yml` 中设置了 `restart: unless-stopped`（项目已默认配置）。

## 数据备份

### 自动备份

创建定时备份任务：

```bash
sudo crontab -e
```

添加以下内容（每天凌晨 3 点备份）：

```cron
0 3 * * * cd /path/to/multi-business-crm && docker compose exec -T db pg_dump -U postgres open_crm > /var/backups/crm/backup_$(date +\%Y\%m\%d).sql 2>/dev/null
```

确保备份目录存在：

```bash
sudo mkdir -p /var/backups/crm
```

### 手动备份

```bash
cd /path/to/multi-business-crm
docker compose exec -T db pg_dump -U postgres open_crm > backup_$(date +%Y%m%d_%H%M%S).sql
```

## 运维常用命令

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f app
docker compose logs -f db

# 重启应用
docker compose restart app

# 代码更新
git pull
docker compose up -d --build

# 数据库迁移
docker compose exec app npx prisma migrate deploy

# 查看磁盘使用
docker system df
df -h
```

## 故障排查

### 无法从外部访问

```bash
# 检查防火墙
sudo ufw status

# 检查服务是否运行
docker compose ps

# 检查端口监听
ss -tlnp | grep 3000
```

### 服务器内存不足

```bash
# 查看内存使用
free -h

# 查看 Docker 容器资源使用
docker stats --no-stream
```

如果内存不足，考虑：
- 升级服务器配置
- 添加 swap 分区
- 限制 Docker 容器内存

### 添加 Swap

```bash
# 创建 2GB swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久挂载
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```
