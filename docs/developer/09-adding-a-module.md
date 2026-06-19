# 添加新模块

本指南介绍如何为 Multi-Business CRM 添加一个新的业务模块（例如 "供应商管理"）。

## 步骤概览

1. 添加 Prisma 数据模型
2. 创建数据库迁移
3. 创建 Server Actions
4. 创建页面组件
5. 添加到侧边栏导航
6. （可选）添加 API Route
7. （可选）接入 Event Bus
8. （可选）添加 AI 分析支持

## 步骤 1：添加 Prisma 数据模型

编辑 `prisma/schema.prisma`：

```prisma
model Supplier {
  id        String   @id @default(cuid())
  name      String
  contact   String?
  phone     String?
  email     String?
  address   String?
  category  String?
  rating    Int?
  tenantId  String?
  tenant    Tenant?  @relation(fields: [tenantId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
}
```

**注意事项**：
- 使用 `@default(cuid())` 作为主键
- 多租户模型需要 `tenantId` 字段
- 添加 `@@index` 提升查询性能
- 关联 Tenant 时使用 `@relation(fields: [tenantId], references: [id])`

## 步骤 2：创建数据库迁移

```bash
npx prisma migrate dev --name add-supplier-model
npx prisma generate
```

生成的 Prisma Client 位于 `lib/generated/prisma/`。

## 步骤 3：创建 Server Actions

创建文件 `app/(dashboard)/suppliers/actions.ts`：

```typescript
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'

export async function getSuppliers(params?: {
  page?: number
  search?: string
}) {
  const { page = 1, search } = params || {}
  const pageSize = 20

  const where = search
    ? { name: { contains: search, mode: 'insensitive' as const } }
    : {}

  const [data, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supplier.count({ where }),
  ])

  return { data, total, page, pageSize }
}

export async function createSupplier(data: {
  name: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  category?: string
}) {
  const user = await getCurrentUser()

  const supplier = await prisma.supplier.create({
    data: {
      ...data,
      tenantId: user?.tenantId,
    },
  })

  revalidatePath('/suppliers')
  return { success: true, data: supplier }
}

export async function updateSupplier(
  id: string,
  data: Partial<{
    name: string
    contact: string
    phone: string
    email: string
    address: string
    category: string
    rating: number
  }>
) {
  const supplier = await prisma.supplier.update({
    where: { id },
    data,
  })

  revalidatePath('/suppliers')
  revalidatePath(`/suppliers/${id}`)
  return { success: true, data: supplier }
}

export async function deleteSupplier(id: string) {
  await prisma.supplier.delete({ where: { id } })
  revalidatePath('/suppliers')
  return { success: true }
}
```

## 步骤 4：创建页面组件

### 列表页

创建 `app/(dashboard)/suppliers/page.tsx`：

```tsx
import { getSuppliers } from './actions'
import { PageHeader } from '@/components/PageHeader'
import { DataTable } from '@/components/ui/DataTable'

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const params = await searchParams
  const { data, total, page, pageSize } = await getSuppliers({
    page: Number(params.page) || 1,
    search: params.search,
  })

  return (
    <div>
      <PageHeader title="供应商管理" action={{ label: "新增供应商", href: "/suppliers/new" }} />
      <DataTable
        data={data}
        columns={[
          { key: 'name', label: '供应商名称' },
          { key: 'contact', label: '联系人' },
          { key: 'phone', label: '电话' },
          { key: 'category', label: '分类' },
          { key: 'rating', label: '评分' },
        ]}
        totalPages={Math.ceil(total / pageSize)}
        currentPage={page}
      />
    </div>
  )
}
```

### 创建页

创建 `app/(dashboard)/suppliers/new/page.tsx`：

```tsx
import SupplierForm from './SupplierForm'

export default function NewSupplierPage() {
  return <SupplierForm />
}
```

### 表单组件

创建 `components/SupplierForm.tsx`：

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupplier } from '@/app/(dashboard)/suppliers/actions'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'

export default function SupplierForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    const result = await createSupplier({
      name: formData.get('name') as string,
      contact: formData.get('contact') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
    })
    setLoading(false)

    if (result.success) {
      router.push('/suppliers')
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4 max-w-xl">
      <FormField name="name" label="供应商名称" required />
      <FormField name="contact" label="联系人" />
      <FormField name="phone" label="电话" />
      <FormField name="email" label="邮箱" type="email" />
      <Button type="submit" disabled={loading}>
        {loading ? '保存中...' : '保存'}
      </Button>
    </form>
  )
}
```

## 步骤 5：添加到侧边栏

编辑 `components/Sidebar.tsx`，在导航配置中添加：

```typescript
{
  label: '供应商管理',
  href: '/suppliers',
  icon: Building2,  // lucide-react 图标
}
```

## 步骤 6：（可选）添加 API Route

如需外部系统接入，创建 `app/api/suppliers/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ data: suppliers })
}
```

## 步骤 7：（可选）接入 Event Bus

在 `lib/events/bus.ts` 的 EventType 中添加：

```typescript
| 'supplier.created'
```

在 switch/case 中添加 Handler：

```typescript
case 'supplier.created':
  // 处理逻辑
  break
```

## 步骤 8：（可选）添加 AI 分析

1. 在 `lib/ai/prompts.ts` 中添加 Prompt 构建器
2. 在 `lib/ai/core.ts` 中添加 analyze 调用
3. 在 `lib/ai/actions.ts` 中添加 Server Action
4. 在前端添加 AI 分析按钮

## 检查清单

- [ ] Prisma Schema 更新并迁移
- [ ] Server Actions（CRUD）
- [ ] 列表页面
- [ ] 创建页面
- [ ] 编辑页面
- [ ] 详情页面（可选）
- [ ] 表单组件
- [ ] 侧边栏导航
- [ ] 枚举标签映射（lib/enums.ts）
- [ ] 格式化函数（lib/format.ts，如需要）
