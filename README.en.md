# Open CRM System

A modern open-source CRM template built with Next.js + TypeScript + Prisma + PostgreSQL.

English | [中文](README.md)

## Overview

Open CRM System is a local-first, self-hosted CRM designed for personal OPC (One-Person Company) usage. It provides a complete suite of sales, customer management, and business automation tools in a single deployable application.

## Screenshots

> Screenshots coming soon

## Key Features

### Dashboard
- Calendar management (week/month/list views)
- Goal tracking and completion
- Data dashboards (conversion funnel, revenue statistics)
- Global search

### Customer Growth
- Lead management (status flow: New -> Contacted -> Qualified -> Converted/Lost)
- Customer repository (360-degree profiles)
- Customer pool (claim/return)
- Dormant customer detection (60 days without follow-up)
- Contact management
- Opportunity and project management
- Follow-up records and tasks

### Business Management
- Quote management (with line items and status flow)
- Order management (Draft -> Confirmed -> In Production -> Shipped -> Completed)
- Product catalog
- Document management
- Follow-up templates
- Business line management
- Currency converter (40+ currencies)

### Finance
- Invoice management (Draft -> Sent -> Paid -> Overdue)
- Payment records
- Financial overview

### Reports
- Sales funnel
- Order trends
- Customer distribution
- Source analysis
- Business line comparison
- Follow-up efficiency

### AI System
- AI Core Engine (unified entry point)
- AI Control Guard (execution guardrails)
- 16 natural language intents
- AI scoring and analysis
- Automatic task generation
- AI control panel (toggle/mode/policy)

### Email System
- Multi-account support (Gmail/Outlook/Alibaba/Tencent/Custom)
- SMTP send / IMAP receive
- Email threads
- Email statistics
- CRM auto-binding

### IM Integration
- Feishu bot (long-connection mode)
- Natural language operations
- Screenshot recognition
- Unified message model

### External Integration
- Webhook support
- External source management
- Integration guides (n8n, standalone sites)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Recharts |
| Backend | Next.js API Routes, Prisma ORM |
| Database | PostgreSQL 16 (Docker) |
| AI | OpenAI-compatible API |
| Email | Nodemailer + ImapFlow |
| IM | Feishu SDK (long-connection mode) |
| Auth | JWT + bcryptjs |
| Deployment | Docker Compose |

## Quick Start

### Requirements

- Node.js 18+
- Docker and Docker Compose
- npm or yarn

### Installation

**Docker Quick Start (Recommended):**

```bash
cp .env.example .env
docker compose up -d
docker compose exec app npx prisma migrate deploy
```

**Manual Setup:**

```bash
# Clone the repository
git clone https://github.com/open-crm/open-crm-system.git
cd open-crm-system

# Install dependencies
npm install

# Start PostgreSQL (adjust password and port as needed)
docker run -d --name open-crm-postgres -e POSTGRES_PASSWORD=YOUR_PASSWORD -e POSTGRES_DB=open_crm -p 5433:5432 postgres:16

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Initialize database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

Visit http://localhost:3003

### Default Test Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | password123 | Administrator |

> You MUST change the default password before any production use.

## Project Structure

```
├── app/                    # Next.js pages and API routes
│   ├── (dashboard)/        # Dashboard route group (100+ pages)
│   ├── api/                # API routes (47 endpoints)
│   └── login/              # Login page
├── components/             # React components (46 components)
├── lib/                    # Utility libraries
│   ├── ai/                 # AI Core Engine + Agents + Control
│   ├── communication/      # Unified communication service
│   ├── email/              # Email service
│   ├── im/                 # Feishu integration
│   ├── events/             # Event Bus
│   └── generated/prisma/   # Prisma generated code (regenerable)
├── prisma/                 # Database schema + migrations
├── scripts/                # Utility scripts
├── docs/                   # Documentation
└── public/                 # Static assets
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| JWT_SECRET | Yes | JWT signing secret |
| APP_URL | No | Application URL (default http://localhost:3003) |

## AI Configuration

Visit http://localhost:3003/ai-settings to configure AI models (optional).

Supported providers: OpenAI, DeepSeek, Moonshot, MiMo, Zhipu, Tongyi Qianwen, and other OpenAI-compatible APIs.

## Email Configuration

Visit http://localhost:3003/email/accounts to add email accounts.

Supported providers: Gmail, Outlook, Alibaba Enterprise Mail, Tencent Enterprise Mail, and custom IMAP/SMTP.

## Feishu Bot

```bash
npm run feishu:bot
```

## Security

- `.env` is not committed to GitHub
- Default passwords must be changed in production
- Email passwords should use app-specific passwords
- API keys should be stored in environment variables

## Documentation

- [Documentation Hub](docs/README.md)
- [English Documentation](docs/en/README.md)
- [Getting Started](docs/getting-started/)
- [User Guide](docs/user-guide/)
- [API Reference](docs/api/)
- [Deployment Guide](docs/deployment/)
- [Contributing Guide](CONTRIBUTING.md)
- [Roadmap](ROADMAP.md)

## License

[MIT License](LICENSE)
