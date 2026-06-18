# Open CRM System

A modern, open-source CRM template built with Next.js, TypeScript, Prisma, and PostgreSQL. Designed for flexibility — customize it for any industry or business model.

## Features

### 📊 Dashboard
- Sales calendar with event management
- Goal tracking with progress bars
- Data overview with key metrics
- Global search across all modules

### 👥 Lead & Customer Management
- Lead pipeline with status tracking (New → Contacted → Quoting → Won/Lost)
- Customer profiles with 360° view
- Contact management per customer
- Business line segmentation
- Customer public pool (claim/return)
- Dormant customer detection (60+ days no follow-up)

### 💼 Opportunity & Sales
- Project/opportunity tracking with status flow
- Quote management with line items
- Order management (Draft → Confirmed → Production → Shipped → Completed)
- Task management with priorities

### 💰 Finance
- Invoice management (Draft → Sent → Paid → Overdue)
- Payment tracking with auto-complete on full payment
- Financial overview with statistics

### 📈 Reports
- Sales funnel visualization
- Order trends (12-month line chart)
- Customer distribution by country (pie chart)
- Lead source analysis
- Business line comparison
- Follow-up efficiency metrics

### 🤖 AI Integration
- OpenAI-compatible API support
- 16 natural language intents for IM operations
- Configurable model presets (OpenAI, DeepSeek, Moonshot, etc.)
- Vision AI for screenshot-to-customer extraction

### 📱 IM Integration (Feishu)
- Long connection mode (no public domain needed)
- Natural language commands via chat
- Screenshot recognition for customer data entry

### ✉️ Email
- Send emails via SMTP
- Receive emails via IMAP
- Email statistics and tracking
- Email templates

### 🔗 External Integration
- Webhook for external lead sources
- Integration guides for n8n, website forms, AI marketing systems

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes, Prisma ORM |
| Database | PostgreSQL (Docker) |
| Charts | Recharts |
| Icons | Lucide React |
| AI | OpenAI-compatible API |
| Email | Nodemailer + ImapFlow |

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)
- npm

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/multi-business-crm.git
cd multi-business-crm

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
```

Edit `.env` with your database password:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5433/open_crm?schema=public"
```

```bash
# 4. Start PostgreSQL
docker run -d \
  --name open-crm-postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=open_crm \
  -p 5433:5432 \
  postgres:16

# 5. Initialize database
npx prisma db push
npx prisma generate

# 6. (Optional) Seed demo data
npm run db:seed

# 7. Start development server
npm run dev
```

Visit http://localhost:3003

### Windows Quick Start

Double-click `start-crm.bat` to auto-start everything.

## AI Configuration

Visit http://localhost:3003/ai-settings to configure AI:

1. Select a preset provider (OpenAI, DeepSeek, Moonshot, etc.)
2. Enter your API Key
3. Click "Test Connection"
4. Save

Or configure via `.env`:

```env
AI_PROVIDER="OPENAI_COMPATIBLE"
AI_BASE_URL="https://api.deepseek.com/v1"
AI_API_KEY="sk-xxx"
AI_MODEL="deepseek-chat"
```

## Feishu Bot Setup

1. Create an app at [Feishu Open Platform](https://open.feishu.cn/)
2. Enable bot capability
3. Set event subscription to "Long Connection" mode
4. Add event: `im.message.receive_v1`
5. Configure in CRM at `/im-settings`
6. Start bot: `npm run feishu:bot`

## Project Structure

```
├── app/                    # Next.js pages and API routes
│   ├── (dashboard)/        # Dashboard route group
│   │   ├── calendar/       # Calendar management
│   │   ├── customers/      # Customer management + pool + dormant
│   │   ├── orders/         # Order management
│   │   ├── finance/        # Invoice & payment management
│   │   ├── email/          # Email center + settings + stats
│   │   ├── reports/        # Data reports with charts
│   │   ├── goals/          # Sales goal tracking
│   │   ├── currency/       # Currency converter
│   │   ├── ai-settings/    # AI configuration
│   │   ├── im-settings/    # IM platform configuration
│   │   └── ...
│   └── api/                # API routes
├── components/             # React components
├── lib/                    # Utility libraries
│   ├── ai/                 # AI module (tools, intent parser, executor)
│   ├── im/                 # IM module (Feishu utilities)
│   ├── email.ts            # Email utilities
│   ├── prisma.ts           # Prisma client
│   └── ...
├── prisma/                 # Database schema and migrations
├── scripts/                # Utility scripts
└── public/                 # Static assets
```

## Database Backup

```bash
# Backup
docker exec open-crm-postgres pg_dump -U postgres open_crm > backup.sql

# Restore
cat backup.sql | docker exec -i open-crm-postgres psql -U postgres open_crm
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the development plan.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT License
