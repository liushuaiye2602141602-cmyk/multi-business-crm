# Contributing to Open CRM

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## How to Contribute

### Reporting Bugs

1. Check existing [Issues](https://github.com/liushuaiye2602141602-cmyk/multi-business-crm/issues) to avoid duplicates
2. Create a new issue with the **Bug Report** template
3. Include: steps to reproduce, expected behavior, actual behavior, screenshots

### Suggesting Features

1. Check existing [Issues](https://github.com/liushuaiye2602141602-cmyk/multi-business-crm/issues) for similar requests
2. Create a new issue with the **Feature Request** template
3. Describe the use case, not just the solution

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes
4. Ensure TypeScript compiles: `npx tsc --noEmit`
5. Test your changes locally
6. Commit with a clear message (see commit convention below)
7. Push and create a Pull Request

## Development Setup

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)
- npm

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/multi-business-crm.git
cd multi-business-crm

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database password

# Start PostgreSQL
docker run -d --name crm-postgres -e POSTGRES_PASSWORD=your_password -e POSTGRES_DB=multi_business_crm -p 5433:5432 postgres:16

# Initialize database
npx prisma db push
npx prisma generate

# (Optional) Seed demo data
npm run db:seed

# Start development server
npm run dev
```

## Code Standards

### TypeScript

- Use TypeScript for all new files
- Avoid `any` type — use proper type definitions
- Keep types in the same file or in `lib/` directory

### Naming Conventions

- **Files**: PascalCase for components (`CustomerForm.tsx`), camelCase for utilities (`prisma.ts`)
- **Variables/Functions**: camelCase
- **Types/Interfaces**: PascalCase
- **Database Models**: PascalCase (Prisma convention)
- **API Routes**: kebab-case URLs

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```
feat(orders): add order status filter
fix(customers): resolve pagination issue
docs: update README with setup instructions
```

## Project Structure

```
├── app/              # Next.js pages and API routes
├── components/       # React components
├── lib/              # Utility libraries (Prisma, AI, email)
├── prisma/           # Database schema and migrations
├── public/           # Static assets
└── scripts/          # Utility scripts
```

## Architecture Notes

- **Frontend**: Server Components by default, Client Components only when needed
- **API Routes**: Located in `app/api/`
- **Database**: PostgreSQL with Prisma ORM
- **AI Integration**: OpenAI-compatible API with Function Calling

## Questions?

Open an issue with the label "question" or start a Discussion.
