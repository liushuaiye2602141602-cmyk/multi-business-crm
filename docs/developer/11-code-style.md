# 代码风格

## TypeScript 规范

### 基本原则

- 使用严格模式 TypeScript（`tsconfig.json` 中 `strict: true`）
- 优先使用 `interface`，复杂联合类型使用 `type`
- 避免使用 `any`，必要时使用 `unknown` 后做类型断言
- 函数参数和返回值应标注类型

### 命名约定

| 类型 | 命名规则 | 示例 |
|------|----------|------|
| 文件名（组件） | PascalCase | `LeadForm.tsx`、`CustomerTimeline.tsx` |
| 文件名（工具/库） | kebab-case 或 camelCase | `auto-tasks.ts`、`message-service.ts` |
| 变量/函数 | camelCase | `createLead`、`leadData` |
| 组件 | PascalCase | `function LeadForm()` |
| Prisma Model | PascalCase | `model Lead {}` |
| 枚举 | PascalCase | `enum LeadStatus {}` |
| 常量 | UPPER_SNAKE_CASE | `API_TIMEOUT` |
| 文件路径 | kebab-case | `leads/actions.ts`、`ai-control-panel/` |

### Server Action 规范

```typescript
// ✅ 正确
'use server'

export async function createLead(data: LeadFormData) { ... }

// ❌ 错误：不要在 Server Action 中使用 useState 等客户端 API
```

### 类型定义

类型文件位于各模块内部，不设全局 types 目录：

- `lib/ai/types.ts` — AI 相关类型
- `components/*/types.ts` — 组件 Props（如适用）
- Prisma 生成的类型由 `lib/generated/prisma/` 提供

## 文件组织

### 模块文件结构

每个业务模块的标准文件结构：

```
app/(dashboard)/<module>/
├── page.tsx            # 列表页
├── new/
│   └── page.tsx        # 创建页
├── [id]/
│   ├── page.tsx        # 详情页
│   └── edit/
│       └── page.tsx    # 编辑页
└── actions.ts          # Server Actions
```

### 组件文件结构

```
components/
├── ui/                 # 通用 UI 原语（无业务逻辑）
│   ├── Button.tsx
│   ├── Card.tsx
│   └── ...
├── FeatureForm.tsx     # 业务表单组件（含 "use client"）
└── FeatureDisplay.tsx  # 业务展示组件
```

### lib 文件结构

```
lib/
├── prisma.ts           # 数据库客户端（单例）
├── auth.ts             # 认证工具
├── enums.ts            # 枚举映射
├── format.ts           # 格式化工具
├── events/bus.ts       # Event Bus
├── ai/                 # AI 模块（独立子目录）
├── email/              # 邮件模块
├── communication/      # 消息模块
└── im/                 # IM 模块
```

## React / Next.js 规范

### Server Component vs Client Component

- **默认使用 Server Component**：数据获取、静态内容
- **仅在需要交互时添加 `'use client'`**：表单、状态管理、事件处理

```tsx
// Server Component（默认）
import { getLeads } from './actions'

export default async function LeadsPage() {
  const leads = await getLeads()
  return <LeadsTable data={leads} />
}

// Client Component（需要交互）
'use client'
import { useState } from 'react'

export function LeadForm() {
  const [loading, setLoading] = useState(false)
  return <form>...</form>
}
```

### 导入顺序

```typescript
// 1. React / Next.js
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// 2. 第三方库
import { lucide-react }

// 3. 项目内部（绝对路径 @/）
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
```

## Tailwind CSS 规范

### 基本原则

- 使用 Tailwind 4 utility classes
- 不使用自定义 CSS 文件（globals.css 仅包含全局重置）
- 组件样式完全通过 className 控制

### 常用模式

```tsx
// 页面容器
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

// 卡片
<div className="bg-white rounded-lg shadow p-6">

// 表格
<table className="min-w-full divide-y divide-gray-200">

// 按钮
<button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
<button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">

// 表单输入
<input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
```

### 响应式设计

```tsx
// 移动优先
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

## 其他约定

### 错误处理

- Server Actions 返回 `{ success: boolean, data?, error? }` 格式
- API Routes 返回 `{ data?, error? }` 格式
- 前端通过条件渲染展示错误状态

### 状态管理

- 无全局状态管理库（无 Redux、Zustand 等）
- 组件间状态通过 Props 传递
- 页面间状态通过 URL searchParams 传递
- 表单状态使用 React `useState`

### 环境变量

- 客户端环境变量需以 `NEXT_PUBLIC_` 为前缀
- 服务端环境变量直接在 Server Component / Server Action 中使用
- 参考 `.env.example` 了解所有可用环境变量
