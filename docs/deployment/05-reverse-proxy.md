# Nginx 反向代理

## 为什么需要反向代理

- 隐藏应用端口，统一通过 80/443 端口访问
- 支持域名绑定和 HTTPS
- 静态资源缓存，提升性能
- 负载均衡（多实例部署时）
- SSL/TLS 终端处理

## 安装 Nginx

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

验证安装：

```bash
sudo systemctl status nginx
```

## 反向代理配置

### 创建配置文件

```bash
sudo nano /etc/nginx/sites-available/crm
```

### 基础 HTTP 配置

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

### 启用配置

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/

# 删除默认配置（可选）
sudo rm /etc/nginx/sites-enabled/default

# 测试配置语法
sudo nginx -t

# 重新加载
sudo systemctl reload nginx
```

## WebSocket 支持

CRM 应用的某些功能（如实时更新）需要 WebSocket 支持。关键配置项：

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

这三行确保 Nginx 正确转发 WebSocket 连接请求。

## 完整配置示例

```nginx
# /etc/nginx/sites-available/crm

server {
    listen 80;
    server_name your-domain.com;

    # 客户端最大请求体大小（支持文件上传）
    client_max_body_size 50M;

    # 代理超时设置
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    gzip_min_length 256;

    # 静态资源缓存（Next.js static 目录）
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # 公共静态文件缓存
    location ~* \.(svg|ico|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    # 主要代理规则
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

## 多站点配置

如果同一台服务器运行多个服务：

```nginx
# CRM 应用
server {
    listen 80;
    server_name crm.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        # ... 其他配置
    }
}

# 其他应用
server {
    listen 80;
    server_name other.your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        # ... 其他配置
    }
}
```

## 性能优化

### 缓冲区设置

```nginx
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;
```

### 连接复用

```nginx
upstream crm_backend {
    server localhost:3000;
    keepalive 32;
}

server {
    location / {
        proxy_pass http://crm_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

## 常见问题

### 502 Bad Gateway

应用未运行或端口不正确：

```bash
# 确认应用正在运行
docker compose ps

# 确认端口监听
ss -tlnp | grep 3000

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

### 文件上传限制

默认 Nginx 限制请求体大小为 1MB。如果需要上传大文件：

```nginx
client_max_body_size 50M;
```

### 配置测试

修改配置后，始终先测试再重载：

```bash
sudo nginx -t && sudo systemctl reload nginx
```
