# Deployment Guide

## Docker Deployment (Recommended)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-username/multi-business-crm.git
cd multi-business-crm

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings

# 3. Start with Docker Compose
docker compose up -d

# 4. Access the application
# http://localhost:3000
```

### First Time Setup

```bash
# Run database migrations
docker compose exec app npx prisma migrate deploy

# (Optional) Seed demo data
docker compose exec app npm run db:seed
```

### Default Login

- Email: admin@example.com
- Password: password123

## Vercel Deployment

### Steps

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Configure environment variables:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `JWT_SECRET` - Random secret string
4. Deploy

### Notes

- Vercel uses serverless functions
- You need an external PostgreSQL database (Vercel Postgres, Supabase, Neon, etc.)
- Prisma migrations need to be run separately

## VPS Deployment (Ubuntu)

### Prerequisites

- Ubuntu 22.04+
- Docker and Docker Compose installed
- Domain name (optional)

### Steps

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. Clone and configure
git clone https://github.com/your-username/multi-business-crm.git
cd multi-business-crm
cp .env.example .env
# Edit .env with production settings

# 3. Start services
docker compose up -d

# 4. Run migrations
docker compose exec app npx prisma migrate deploy

# 5. (Optional) Seed data
docker compose exec app npm run db:seed
```

### Nginx Reverse Proxy (Optional)

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
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for JWT token signing |
| `APP_URL` | No | Application URL (default: http://localhost:3000) |
| `NODE_ENV` | No | production / development |
| `AI_PROVIDER` | No | AI model provider |
| `AI_BASE_URL` | No | AI API base URL |
| `AI_API_KEY` | No | AI API key |
| `AI_MODEL` | No | AI model name |

## Database Management

```bash
# Create migration
npx prisma migrate dev --name migration_name

# Deploy migrations
npx prisma migrate deploy

# Reset database (DEVELOPMENT ONLY)
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio
npx prisma studio
```
