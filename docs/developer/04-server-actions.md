# Server Actions

Next.js App Router 的 `"use server"` 函数是系统中 CRUD 操作的主要实现方式。项目共有 53 个文件包含 Server Action。

## 模式说明

Server Actions 允许在服务端直接调用的异步函数，省去了手写 API Route 的样板代码。Next.js 自动处理请求序列化、错误处理和服务端执行。

## 典型文件结构

每个业务模块在 `app/(dashboard)/<module>/actions.ts` 中定义专用 actions：

```
app/(dashboard)/
├── leads/actions.ts
├── customers/actions.ts
├── contacts/actions.ts
├── projects/actions.ts
├── quotes/actions.ts
├── orders/actions.ts
├── tasks/actions.ts
├── follow-ups/actions.ts
├── products/actions.ts
├── templates/actions.ts
├── business-lines/actions.ts
├── documents/actions.ts
├── external-sources/actions.ts
├── ai-analyses/actions.ts
├── goals/actions.ts
├── calendar/actions.ts
├── quotes/[id]/items/actions.ts
└── orders/[id]/items/actions.ts
```

## 标准 CRUD 模式

### 创建（Create）

```typescript
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createLead(data: LeadFormData) {
  // 1. 数据验证
  // 2. 调用 Prisma 创建
  const lead = await prisma.lead.create({ data: { ... } })
  // 3. 触发事件
  await emit('lead.created', { leadId: lead.id })
  // 4. 重新验证页面缓存
  revalidatePath('/leads')
  return { success: true, data: lead }
}
```

### 更新（Update）

```typescript
export async function updateLead(id: string, data: LeadFormData) {
  const lead = await prisma.lead.update({
    where: { id },
    data: { ... }
  })
  revalidatePath('/leads')
  revalidatePath(`/leads/${id}`)
  return { success: true, data: lead }
}
```

### 删除（Delete）

```typescript
export async function deleteLead(id: string) {
  await prisma.lead.delete({ where: { id } })
  revalidatePath('/leads')
  return { success: true }
}
```

### 查询（Read）

```typescript
export async function getLeads(params: { page?: number; search?: string }) {
  const { page = 1, search } = params
  const pageSize = 20

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where: search ? { company: { contains: search, mode: 'insensitive' } } : {},
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.lead.count({ ... })
  ])

  return { data: leads, total, page, pageSize }
}
```

## Server Action 分类

### 1. 业务 CRUD Actions（18 个 actions 文件）

主要分布：
- `leads/actions.ts` — createLead, updateLead, deleteLead, getLeads 等
- `customers/actions.ts` — createCustomer, updateCustomer, claimCustomer, returnToPool 等
- `quotes/actions.ts` — createQuote, updateQuote, sendQuote, generateQuoteNo 等
- `orders/actions.ts` — createOrder, updateOrder, confirmOrder 等
- `tasks/actions.ts` — createTask, updateTask, completeTask 等

### 2. AI Server Actions（lib/ai/actions.ts，11 个）

```
analyzeLead()          — 线索 AI 分析
reviewCustomer()       — 客户 AI 评审
analyzeProject()       — 项目 AI 分析
generateFollowUpReply() — 生成跟进回复
rewriteTemplate()      — AI 重写模板
testAIAnalysis()       — 测试 AI 分析
applyLeadQualification() — 应用线索资质评估
appendToProjectNotes() — 追加项目备注
appendToCustomerNotes() — 追加客户备注
createTaskFromAI()     — 从 AI 创建任务
```

所有 AI actions 结果保存到 `AIAnalysis` 表。

### 3. 活动日志（lib/activity-log.ts）

```typescript
'use server'
export async function createActivityLog(data: {
  action: string
  entityType: string
  entityId: string
  entityName: string
  description?: string
}) {
  return prisma.activityLog.create({ data })
}
```

### 4. 页面内联 Actions

部分 page.tsx 文件直接在页面组件文件中定义 `"use server"` 函数，未拆分到独立 actions 文件。

## 表单处理模式

前端组件通过 `action` 属性绑定 Server Action：

```tsx
// components/LeadForm.tsx
'use client'

import { createLead } from '@/app/(dashboard)/leads/actions'

export function LeadForm() {
  const handleSubmit = async (formData: FormData) => {
    const result = await createLead({
      company: formData.get('company') as string,
      contactName: formData.get('contactName') as string,
      // ...
    })
    if (result.success) {
      router.push('/leads')
    }
  }

  return <form action={handleSubmit}>...</form>
}
```

## 注意事项

1. **revalidatePath 调用**：所有写操作后必须调用 `revalidatePath()` 确保页面数据刷新
2. **错误处理**：Actions 返回 `{ success: boolean, data?, error? }` 格式的响应对象
3. **权限检查**：部分 Actions 内部调用 `requireAuth()` 获取当前用户
4. **事件触发**：核心业务操作通过 Event Bus (`emit()`) 触发副作用
5. **不要返回 Prisma Model 类型**：应返回序列化后的 plain object
