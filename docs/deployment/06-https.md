# HTTPS 配置

## 为什么需要 HTTPS

- 加密数据传输，防止中间人攻击
- 浏览器信任标识，提升用户信心
- 搜索引擎 SEO 排名因素
- 部分浏览器功能要求 HTTPS（如通知 API）

## 使用 Let's Encrypt 获取证书

Let's Encrypt 提供免费 SSL/TLS 证书，有效期 90 天，支持自动续期。

### 第一步：安装 Certbot

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### 第二步：获取证书

确保域名已解析到服务器 IP，并且 Nginx 已配置 HTTP（参见 [Nginx 反向代理](05-reverse-proxy.md)）。

```bash
sudo certbot --nginx -d your-domain.com
```

按照提示操作：
1. 输入邮箱地址（用于证书到期提醒）
2. 同意服务条款
3. 选择是否将 HTTP 自动重定向到 HTTPS（推荐选择是）

证书获取成功后，Certbot 会自动修改 Nginx 配置并重载。

### 第三步：验证 HTTPS

```bash
# 测试 SSL 配置
sudo certbot certificates
```

访问 https://your-domain.com 确认证书有效。

### 第四步：自动续期

Let's Encrypt 证书有效期 90 天。Certbot 安装时已配置自动续期：

```bash
# 测试续期流程
sudo certbot renew --dry-run

# 查看定时任务
sudo systemctl list-timers | grep certbot
```

## 完整 Nginx HTTPS 配置

获取证书后，Certbot 会自动修改配置。以下是手动配置的完整示例：

### HTTP 重定向到 HTTPS

```nginx
# HTTP -> HTTPS 重定向
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### HTTPS 配置

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书（Certbot 自动生成）
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # HSTS（启用后浏览器会强制 HTTPS）
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 安全头
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;

    # 客户端请求大小限制
    client_max_body_size 50M;

    # 代理到 Next.js 应用
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

    # Next.js 静态资源缓存
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

## 使用 Certbot 自动配置

最简单的方式是让 Certbot 自动修改 Nginx 配置：

```bash
# 获取证书并自动修改 Nginx 配置
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot 会：
1. 获取证书
2. 修改 Nginx 配置添加 SSL
3. 自动重载 Nginx

## 更新 APP_URL

配置 HTTPS 后，需要更新应用的 `APP_URL` 环境变量：

```bash
# 编辑 .env
nano .env
```

```env
APP_URL=https://your-domain.com
```

重启应用使配置生效：

```bash
docker compose restart app
```

## 证书续期管理

### 手动续期

```bash
sudo certbot renew
sudo systemctl reload nginx
```

### 自动续期

Certbot 安装后自动创建 systemd 定时任务：

```bash
# 检查续期定时任务
systemctl list-timers | grep certbot
```

### 监控证书过期

```bash
# 查看证书有效期
sudo certbot certificates
```

## 故障排查

### 证书获取失败

```bash
# 检查域名解析
dig your-domain.com

# 确认 80 端口可访问
curl -I http://your-domain.com
```

确保：
- 域名 A 记录已指向服务器 IP
- 80 端口可从外部访问
- Nginx 正在运行

### SSL 证书错误

```bash
# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 测试 SSL 配置
openssl s_client -connect your-domain.com:443
```

### 证书续期失败

```bash
# 检查续期日志
sudo journalctl -u certbot

# 手动测试续期
sudo certbot renew --dry-run
```
