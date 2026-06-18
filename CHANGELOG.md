# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-18

### Added

#### Core CRM Features
- Lead management with full lifecycle (New → Contacted → Quoting → Won/Lost)
- Customer management with 360° profiles
- Contact management per customer
- Business line segmentation and management
- Project/Opportunity tracking with status flow
- Follow-up records and templates
- Task management with priorities and due dates

#### Sales Pipeline
- Quote management with line items and status tracking
- Order management with full status flow (Draft → Confirmed → Production → Shipped → Completed)
- Product catalog management

#### Finance
- Invoice management (Draft → Sent → Paid → Overdue)
- Payment tracking with auto-complete on full payment
- Financial overview with statistics

#### AI Integration
- OpenAI-compatible API support with configurable presets
- 16 natural language intents for IM operations
- AI analysis for leads, customers, projects, and follow-ups
- Vision AI for screenshot-to-customer extraction
- Auto-analyze new leads from webhooks

#### IM Integration (Feishu)
- Long connection mode (no public domain needed)
- Natural language commands via Feishu chat
- Screenshot recognition for customer data entry
- IM message logging and history

#### Email
- SMTP email sending
- IMAP email receiving
- Email statistics and tracking
- Email configuration management

#### Reports & Analytics
- Sales funnel visualization
- Order trends (12-month chart)
- Customer distribution by country
- Lead source analysis
- Business line comparison
- Follow-up efficiency metrics

#### Dashboard
- Calendar/Schedule management
- Sales goal tracking with progress
- Data overview with key metrics
- Global search

#### Customer Pool
- Public pool for unassigned customers
- Claim and return functionality
- Dormant customer detection (60+ days no follow-up)

#### External Integration
- Webhook for external lead sources
- Integration guides for n8n, website forms

#### System
- Dark sidebar UI with modern design
- Currency converter (8 currencies)
- CSV import/export
- Activity logging
- System health check

### Tech Stack
- Next.js 16, React 19, TypeScript
- Prisma 7, PostgreSQL
- Tailwind CSS 4, Recharts
- Nodemailer + ImapFlow
- Feishu SDK
