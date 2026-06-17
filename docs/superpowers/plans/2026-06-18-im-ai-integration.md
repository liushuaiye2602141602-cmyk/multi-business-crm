# IM + AI 集成实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 multi-business-crm（Next.js + Prisma + PostgreSQL）基础上，接入飞书 IM，支持自然语言指令完成业务操作（创建线索、创建订单、查询进度等）。

**Architecture:** 扩展现有 `lib/ai/` 模块，新增 Function Calling 支持；新增 `lib/im/` 模块处理飞书 Webhook；新增 Prisma 模型存储 IM 配置和消息记录。

**Tech Stack:** Next.js 16, Prisma 7, PostgreSQL, OpenAI-compatible Function Calling API

## Global Constraints

- 不引入新的 npm 依赖（零依赖原则，飞书 API 用原生 fetch 调用）
- 复用现有 `lib/ai/client.ts` 的 `chatCompletion` 函数
- 复用现有 `lib/activity-log.ts` 记录操作日志
- 所有新页面使用 Tailwind CSS + Lucide Icons（与现有风格一致）
- AI 模型需支持 OpenAI 兼容的 Function Calling API

---

## Task 1: 新增 IM 数据模型

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `IMPlatform`, `IMUser`, `IMMessage` Prisma models

- [ ] **Step 1: 在 schema.prisma 末尾添加新模型**

在 `prisma/schema.prisma` 的 `Document` 模型之后添加：

```prisma
model IMPlatform {
  id          Int      @id @default(autoincrement())
  name        String   @unique  // feishu / telegram / wechat
  appId       String?
  appSecret   String?
  encryptKey  String?
  verifyToken String?
  botToken    String?
  isActive    Boolean  @default(true)
  extra       Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  imUsers    IMUser[]
  imMessages IMMessage[]
}

model IMUser {
  id             Int      @id @default(autoincrement())
  platformId     Int
  platformUserId String
  platformName   String?
  createdAt      DateTime @default(now())

  platform  IMPlatform  @relation(fields: [platformId], references: [id])
  messages  IMMessage[]

  @@unique([platformId, platformUserId])
  @@index([platformId])
}

model IMMessage {
  id           Int      @id @default(autoincrement())
  platformId   Int
  imUserId     Int
  direction    String   // in / out
  content      String
  intent       String?
  action       String?
  actionResult Json?
  errorMsg     String?
  createdAt    DateTime @default(now())

  platform IMPlatform @relation(fields: [platformId], references: [id])
  imUser   IMUser     @relation(fields: [imUserId], references: [id])

  @@index([createdAt])
  @@index([platformId])
}
```

- [ ] **Step 2: 生成 Prisma Client 并执行迁移**

```bash
cd /d/web_project/multi-business-crm
npx prisma migrate dev --name add-im-models
```

Expected: 迁移成功，`lib/generated/prisma` 中生成新模型类型。

- [ ] **Step 3: 验证生成的类型**

```bash
npx prisma generate
```

Expected: 无错误，`IMPlatform`, `IMUser`, `IMMessage` 类型可用。

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add IM data models (IMPlatform, IMUser, IMMessage)"
```

---

## Task 2: IM 平台配置 CRUD API

**Files:**
- Create: `app/api/im/platforms/route.ts`
- Create: `app/api/im/platforms/[id]/route.ts`

**Interfaces:**
- Consumes: `IMPlatform` Prisma model from Task 1
- Produces: REST API for IM platform CRUD

- [ ] **Step 1: 创建 IM 平台列表/创建 API**

```typescript
// app/api/im/platforms/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const platforms = await prisma.iMPlatform.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { imUsers: true, imMessages: true } } },
    });
    return NextResponse.json(platforms);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch platforms" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const existing = await prisma.iMPlatform.findUnique({
      where: { name: body.name },
    });
    if (existing) {
      return NextResponse.json({ error: "Platform already exists" }, { status: 409 });
    }

    const platform = await prisma.iMPlatform.create({
      data: {
        name: body.name,
        appId: body.appId || null,
        appSecret: body.appSecret || null,
        encryptKey: body.encryptKey || null,
        verifyToken: body.verifyToken || null,
        botToken: body.botToken || null,
        isActive: body.isActive ?? true,
        extra: body.extra || null,
      },
    });

    return NextResponse.json(platform, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create platform" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: 创建 IM 平台单个操作 API**

```typescript
// app/api/im/platforms/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const platform = await prisma.iMPlatform.findUnique({
      where: { id: parseInt(id) },
      include: {
        imUsers: { orderBy: { createdAt: "desc" }, take: 50 },
        _count: { select: { imMessages: true } },
      },
    });

    if (!platform) {
      return NextResponse.json({ error: "Platform not found" }, { status: 404 });
    }

    return NextResponse.json(platform);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch platform" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const platform = await prisma.iMPlatform.update({
      where: { id: parseInt(id) },
      data: {
        ...(body.appId !== undefined && { appId: body.appId }),
        ...(body.appSecret !== undefined && { appSecret: body.appSecret }),
        ...(body.encryptKey !== undefined && { encryptKey: body.encryptKey }),
        ...(body.verifyToken !== undefined && { verifyToken: body.verifyToken }),
        ...(body.botToken !== undefined && { botToken: body.botToken }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.extra !== undefined && { extra: body.extra }),
      },
    });

    return NextResponse.json(platform);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update platform" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.iMPlatform.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete platform" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: 验证 API 可用**

启动开发服务器后测试：

```bash
# 获取平台列表
curl http://localhost:3003/api/im/platforms

# 创建飞书平台
curl -X POST http://localhost:3003/api/im/platforms \
  -H "Content-Type: application/json" \
  -d '{"name":"feishu","appId":"test","appSecret":"test"}'
```

Expected: GET 返回 `[]`，POST 返回创建的平台对象。

- [ ] **Step 4: Commit**

```bash
git add app/api/im/
git commit -m "feat: add IM platform CRUD API"
```

---

## Task 3: IM 消息记录 API

**Files:**
- Create: `app/api/im/messages/route.ts`

**Interfaces:**
- Consumes: `IMMessage` Prisma model from Task 1
- Produces: GET /api/im/messages (分页查询)

- [ ] **Step 1: 创建消息记录 API**

```typescript
// app/api/im/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const platformId = searchParams.get("platformId");
    const direction = searchParams.get("direction");

    const where: Record<string, unknown> = {};
    if (platformId) where.platformId = parseInt(platformId);
    if (direction) where.direction = direction;

    const [messages, total] = await Promise.all([
      prisma.iMMessage.findMany({
        where,
        include: {
          platform: { select: { name: true } },
          imUser: { select: { platformName: true, platformUserId: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.iMMessage.count({ where }),
    ]);

    return NextResponse.json({
      messages,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: 验证**

```bash
curl http://localhost:3003/api/im/messages
```

Expected: 返回 `{ messages: [], total: 0, page: 1, ... }`

- [ ] **Step 3: Commit**

```bash
git add app/api/im/messages/
git commit -m "feat: add IM messages list API"
```

---

## Task 4: AI Function Calling 工具定义

**Files:**
- Create: `lib/ai/tools.ts`

**Interfaces:**
- Produces: `IM_TOOLS` array (OpenAI Function Calling format), `IntentType` type

- [ ] **Step 1: 创建 Function Calling 工具定义**

```typescript
// lib/ai/tools.ts

export type IntentType =
  | "create_lead"
  | "create_customer"
  | "create_order"
  | "add_followup"
  | "query_leads"
  | "query_customers"
  | "query_orders"
  | "query_tasks"
  | "help"
  | "unknown";

export const IM_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "create_lead",
      description: "创建新的销售线索。当用户提到要添加线索、新建潜在客户时使用。",
      parameters: {
        type: "object",
        properties: {
          company: { type: "string", description: "公司名称" },
          contactName: { type: "string", description: "联系人姓名" },
          country: { type: "string", description: "国家" },
          email: { type: "string", description: "邮箱" },
          phone: { type: "string", description: "电话" },
          whatsapp: { type: "string", description: "WhatsApp" },
          requirement: { type: "string", description: "需求描述" },
          interestProducts: { type: "string", description: "感兴趣的产品" },
          remark: { type: "string", description: "备注" },
        },
        required: ["company", "contactName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_customer",
      description: "创建新客户。当用户提到要添加客户、新建客户时使用。",
      parameters: {
        type: "object",
        properties: {
          company: { type: "string", description: "公司名称" },
          contactName: { type: "string", description: "联系人姓名" },
          country: { type: "string", description: "国家" },
          email: { type: "string", description: "邮箱" },
          phone: { type: "string", description: "电话" },
          whatsapp: { type: "string", description: "WhatsApp" },
          website: { type: "string", description: "网站" },
          industry: { type: "string", description: "行业" },
          remark: { type: "string", description: "备注" },
        },
        required: ["company", "contactName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_order",
      description: "创建新订单。当用户提到要建订单、新建订单时使用。",
      parameters: {
        type: "object",
        properties: {
          customerName: { type: "string", description: "客户公司名称（用于查找客户）" },
          orderTitle: { type: "string", description: "订单标题" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                itemName: { type: "string", description: "产品名称" },
                quantity: { type: "number", description: "数量" },
                unitPrice: { type: "number", description: "单价" },
              },
              required: ["itemName"],
            },
            description: "订单明细",
          },
          currency: { type: "string", description: "币种：USD/EUR/CNY" },
          notes: { type: "string", description: "备注" },
        },
        required: ["customerName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_followup",
      description: "添加跟进记录。当用户提到要记录跟进、添加沟通记录时使用。",
      parameters: {
        type: "object",
        properties: {
          targetName: { type: "string", description: "客户或线索公司名称" },
          content: { type: "string", description: "跟进内容" },
          method: {
            type: "string",
            enum: ["EMAIL", "WHATSAPP", "PHONE", "MEETING", "VIDEO_CALL", "OTHER"],
            description: "跟进方式",
          },
          nextAction: { type: "string", description: "下一步动作" },
        },
        required: ["targetName", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_leads",
      description: "查询线索信息。当用户问到线索、潜在客户、新客户数量时使用。",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "线索状态筛选" },
          limit: { type: "number", description: "返回数量，默认10" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_customers",
      description: "查询客户信息。当用户问到客户列表、客户详情时使用。",
      parameters: {
        type: "object",
        properties: {
          company: { type: "string", description: "按公司名搜索（模糊匹配）" },
          status: { type: "string", description: "客户状态筛选" },
          limit: { type: "number", description: "返回数量，默认10" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_orders",
      description: "查询订单信息和进度。当用户问到订单状态、订单进度、发货情况时使用。",
      parameters: {
        type: "object",
        properties: {
          customerName: { type: "string", description: "按客户名筛选" },
          status: { type: "string", description: "订单状态筛选" },
          limit: { type: "number", description: "返回数量，默认10" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_tasks",
      description: "查询待办任务。当用户问到今天有什么任务、待办事项时使用。",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "任务状态：PENDING/IN_PROGRESS/COMPLETED" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "help",
      description: "当用户问到你能做什么、怎么使用时，返回帮助信息。",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

export const INTENT_SYSTEM_PROMPT = `你是一个外贸 CRM 系统的 AI 助手。用户通过 IM（飞书等）与你对话，你需要理解用户的意图并调用相应的工具来完成操作。

规则：
1. 根据用户的消息，选择最合适的工具调用
2. 从用户消息中提取参数，如果缺少必填参数，不要猜测，而是调用 help 工具提示用户提供
3. 如果用户的消息无法匹配任何工具，调用 help 工具
4. 用中文回复用户
5. 回复要简洁，适合 IM 阅读`;
```

- [ ] **Step 2: 验证类型无误**

```bash
cd /d/web_project/multi-business-crm
npx tsc --noEmit lib/ai/tools.ts
```

Expected: 无类型错误。

- [ ] **Step 3: Commit**

```bash
git add lib/ai/tools.ts
git commit -m "feat: add AI function calling tool definitions"
```

---

## Task 5: AI 意图解析引擎

**Files:**
- Create: `lib/ai/intent.ts`

**Interfaces:**
- Consumes: `chatCompletion` from `lib/ai/client.ts`, `IM_TOOLS` from `lib/ai/tools.ts`
- Produces: `parseIntent(message: string): Promise<IntentResult>`

- [ ] **Step 1: 创建意图解析引擎**

```typescript
// lib/ai/intent.ts
import { getAIConfig } from "./types";
import { IM_TOOLS, INTENT_SYSTEM_PROMPT, type IntentType } from "./tools";

export interface IntentResult {
  intent: IntentType;
  args: Record<string, unknown>;
  functionName: string | null;
  rawResponse: string;
}

interface FunctionCallResponse {
  choices: Array<{
    message: {
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
  }>;
}

export async function parseIntent(message: string): Promise<IntentResult> {
  const config = getAIConfig();

  if (!config.apiKey || !config.model) {
    throw new Error("AI 未配置");
  }

  let baseUrl = config.baseUrl;
  if (!baseUrl && config.provider === "OPENAI") {
    baseUrl = "https://api.openai.com/v1";
  }
  if (!baseUrl) {
    throw new Error("AI_BASE_URL 未配置");
  }
  if (!baseUrl.endsWith("/")) {
    baseUrl += "/";
  }

  const url = `${baseUrl}chat/completions`;

  const body = {
    model: config.model,
    messages: [
      { role: "system", content: INTENT_SYSTEM_PROMPT },
      { role: "user", content: message },
    ],
    tools: IM_TOOLS,
    tool_choice: "auto",
    temperature: 0.1,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`AI 请求失败 (${response.status}): ${errorText}`);
    }

    const data: FunctionCallResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error("AI 返回为空");
    }

    const choice = data.choices[0];
    const rawResponse = JSON.stringify(data, null, 2);

    // 检查是否有 function call
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      const functionName = toolCall.function.name as IntentType;
      let args: Record<string, unknown> = {};

      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        args = {};
      }

      return {
        intent: functionName,
        args,
        functionName: toolCall.function.name,
        rawResponse,
      };
    }

    // 没有 function call，返回 unknown
    return {
      intent: "unknown",
      args: {},
      functionName: null,
      rawResponse,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
```

- [ ] **Step 2: 验证类型编译**

```bash
cd /d/web_project/multi-business-crm
npx tsc --noEmit lib/ai/intent.ts
```

Expected: 无类型错误。

- [ ] **Step 3: Commit**

```bash
git add lib/ai/intent.ts
git commit -m "feat: add AI intent parsing engine with function calling"
```

---

## Task 6: 业务执行器

**Files:**
- Create: `lib/ai/executor.ts`

**Interfaces:**
- Consumes: `IntentResult` from `lib/ai/intent.ts`, Prisma client
- Produces: `executeIntent(result: IntentResult): Promise<ExecutionResult>`

- [ ] **Step 1: 创建业务执行器**

```typescript
// lib/ai/executor.ts
import prisma from "@/lib/prisma";
import { createActivityLog } from "@/lib/activity-log";
import type { IntentResult } from "./intent";

export interface ExecutionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export async function executeIntent(result: IntentResult): Promise<ExecutionResult> {
  switch (result.intent) {
    case "create_lead":
      return executeCreateLead(result.args);
    case "create_customer":
      return executeCreateCustomer(result.args);
    case "create_order":
      return executeCreateOrder(result.args);
    case "add_followup":
      return executeAddFollowup(result.args);
    case "query_leads":
      return executeQueryLeads(result.args);
    case "query_customers":
      return executeQueryCustomers(result.args);
    case "query_orders":
      return executeQueryOrders(result.args);
    case "query_tasks":
      return executeQueryTasks(result.args);
    case "help":
      return executeHelp();
    default:
      return {
        success: false,
        message: "抱歉，我没有理解您的意思。您可以尝试：\n- 添加线索：xxx公司，美国，john@xxx.com\n- 查询订单进度\n- 查看今日任务\n\n输入「帮助」查看更多功能。",
      };
  }
}

async function executeCreateLead(args: Record<string, unknown>): Promise<ExecutionResult> {
  const company = args.company as string;
  const contactName = args.contactName as string;

  if (!company || !contactName) {
    return { success: false, message: "创建线索需要公司名称和联系人姓名。示例：添加线索，ABC公司，John，美国" };
  }

  // 查找默认业务线
  const businessLine = await prisma.businessLine.findFirst({ orderBy: { id: "asc" } });
  if (!businessLine) {
    return { success: false, message: "系统中还没有业务线，请先在系统中创建业务线。" };
  }

  try {
    const lead = await prisma.lead.create({
      data: {
        company,
        contactName,
        country: (args.country as string) || null,
        email: (args.email as string) || null,
        phone: (args.phone as string) || null,
        whatsapp: (args.whatsapp as string) || null,
        requirement: (args.requirement as string) || null,
        interestProducts: (args.interestProducts as string) || null,
        remark: (args.remark as string) || null,
        source: "MANUAL_OUTREACH",
        status: "NEW",
        temperature: "WARM",
        grade: "C",
        businessLineId: businessLine.id,
      },
    });

    await createActivityLog({
      action: "IM 创建",
      entityType: "线索",
      entityId: lead.id,
      entityName: lead.company,
      description: `通过 IM 创建线索: ${lead.company}`,
    });

    return {
      success: true,
      message: `✅ 线索已创建\n公司：${lead.company}\n联系人：${lead.contactName}\n国家：${lead.country || "未填写"}\nID：${lead.id}`,
      data: lead,
    };
  } catch (error) {
    return { success: false, message: `创建线索失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

async function executeCreateCustomer(args: Record<string, unknown>): Promise<ExecutionResult> {
  const company = args.company as string;
  const contactName = args.contactName as string;

  if (!company || !contactName) {
    return { success: false, message: "创建客户需要公司名称和联系人姓名。示例：添加客户，XYZ集团，Tom" };
  }

  const businessLine = await prisma.businessLine.findFirst({ orderBy: { id: "asc" } });
  if (!businessLine) {
    return { success: false, message: "系统中还没有业务线，请先在系统中创建业务线。" };
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        company,
        contactName,
        country: (args.country as string) || null,
        email: (args.email as string) || null,
        phone: (args.phone as string) || null,
        whatsapp: (args.whatsapp as string) || null,
        website: (args.website as string) || null,
        industry: (args.industry as string) || null,
        remark: (args.remark as string) || null,
        customerType: "UNKNOWN",
        customerStatus: "POTENTIAL",
        leadGrade: "C",
        businessLineId: businessLine.id,
      },
    });

    await createActivityLog({
      action: "IM 创建",
      entityType: "客户",
      entityId: customer.id,
      entityName: customer.company,
      description: `通过 IM 创建客户: ${customer.company}`,
    });

    return {
      success: true,
      message: `✅ 客户已创建\n公司：${customer.company}\n联系人：${customer.contactName}\n国家：${customer.country || "未填写"}\nID：${customer.id}`,
      data: customer,
    };
  } catch (error) {
    return { success: false, message: `创建客户失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

async function executeCreateOrder(args: Record<string, unknown>): Promise<ExecutionResult> {
  const customerName = args.customerName as string;

  if (!customerName) {
    return { success: false, message: "创建订单需要客户名称。示例：帮ABC公司建个订单，产品XX，数量100" };
  }

  // 查找客户
  const customer = await prisma.customer.findFirst({
    where: { company: { contains: customerName, mode: "insensitive" } },
  });

  if (!customer) {
    return { success: false, message: `未找到客户「${customerName}」，请确认客户名称或先创建客户。` };
  }

  try {
    // 生成订单号
    const orderCount = await prisma.order.count();
    const orderNo = `ORD-${String(orderCount + 1).padStart(6, "0")}`;

    const items = (args.items as Array<{ itemName: string; quantity?: number; unitPrice?: number }>) || [];
    const currency = (args.currency as string) || "USD";

    const order = await prisma.order.create({
      data: {
        orderNo,
        orderTitle: (args.orderTitle as string) || `${customer.company} 订单`,
        customerId: customer.id,
        orderStatus: "DRAFT",
        currency: currency as any,
        notes: (args.notes as string) || null,
        totalAmount: items.reduce((sum, item) => {
          return sum + (item.quantity || 0) * (item.unitPrice || 0);
        }, 0) || null,
        items: {
          create: items.map((item, index) => ({
            itemName: item.itemName,
            quantity: item.quantity || null,
            unitPrice: item.unitPrice || null,
            totalPrice: (item.quantity || 0) * (item.unitPrice || 0) || null,
            sortOrder: index,
          })),
        },
      },
      include: { items: true },
    });

    await createActivityLog({
      action: "IM 创建",
      entityType: "订单",
      entityId: order.id,
      entityName: order.orderNo,
      description: `通过 IM 创建订单: ${order.orderNo} (客户: ${customer.company})`,
    });

    const itemText = items.length > 0
      ? `\n明细：${items.map(i => `${i.itemName}${i.quantity ? ` x${i.quantity}` : ""}`).join("、")}`
      : "";

    return {
      success: true,
      message: `✅ 订单已创建\n单号：${order.orderNo}\n客户：${customer.company}\n状态：草稿${itemText}`,
      data: order,
    };
  } catch (error) {
    return { success: false, message: `创建订单失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

async function executeAddFollowup(args: Record<string, unknown>): Promise<ExecutionResult> {
  const targetName = args.targetName as string;
  const content = args.content as string;

  if (!targetName || !content) {
    return { success: false, message: "添加跟进需要客户名称和跟进内容。示例：给ABC加跟进：今天电话沟通了价格" };
  }

  // 先查客户，再查线索
  const customer = await prisma.customer.findFirst({
    where: { company: { contains: targetName, mode: "insensitive" } },
  });

  const lead = !customer
    ? await prisma.lead.findFirst({
        where: { company: { contains: targetName, mode: "insensitive" } },
      })
    : null;

  if (!customer && !lead) {
    return { success: false, message: `未找到「${targetName}」对应的客户或线索。` };
  }

  try {
    const followUp = await prisma.followUp.create({
      data: {
        content,
        method: (args.method as any) || "OTHER",
        nextAction: (args.nextAction as string) || null,
        customerId: customer?.id || null,
        leadId: lead?.id || null,
      },
    });

    await createActivityLog({
      action: "IM 创建",
      entityType: "跟进",
      entityId: followUp.id,
      entityName: targetName,
      description: `通过 IM 添加跟进: ${targetName} - ${content.slice(0, 50)}`,
    });

    return {
      success: true,
      message: `✅ 跟进记录已添加\n对象：${customer ? "客户" : "线索"} ${targetName}\n内容：${content}`,
      data: followUp,
    };
  } catch (error) {
    return { success: false, message: `添加跟进失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

async function executeQueryLeads(args: Record<string, unknown>): Promise<ExecutionResult> {
  const limit = (args.limit as number) || 10;
  const where: Record<string, unknown> = {};
  if (args.status) where.status = args.status;

  try {
    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, company: true, contactName: true, country: true, status: true, temperature: true, createdAt: true },
    });

    const total = await prisma.lead.count({ where });

    if (leads.length === 0) {
      return { success: true, message: "📋 暂无线索记录。" };
    }

    const lines = leads.map(
      (l, i) => `${i + 1}. ${l.company} (${l.contactName}) - ${l.country || "未知"} [${l.status}]`
    );

    return {
      success: true,
      message: `📋 线索列表（共 ${total} 条，显示前 ${leads.length} 条）\n\n${lines.join("\n")}`,
      data: leads,
    };
  } catch (error) {
    return { success: false, message: `查询失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

async function executeQueryCustomers(args: Record<string, unknown>): Promise<ExecutionResult> {
  const limit = (args.limit as number) || 10;
  const where: Record<string, unknown> = {};
  if (args.company) where.company = { contains: args.company as string, mode: "insensitive" };
  if (args.status) where.customerStatus = args.status;

  try {
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, company: true, contactName: true, country: true, customerStatus: true, leadGrade: true },
    });

    const total = await prisma.customer.count({ where });

    if (customers.length === 0) {
      return { success: true, message: "📋 暂无客户记录。" };
    }

    const lines = customers.map(
      (c, i) => `${i + 1}. ${c.company} (${c.contactName}) - ${c.country || "未知"} [${c.customerStatus}] 等级:${c.leadGrade}`
    );

    return {
      success: true,
      message: `📋 客户列表（共 ${total} 条，显示前 ${customers.length} 条）\n\n${lines.join("\n")}`,
      data: customers,
    };
  } catch (error) {
    return { success: false, message: `查询失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

async function executeQueryOrders(args: Record<string, unknown>): Promise<ExecutionResult> {
  const limit = (args.limit as number) || 10;
  const where: Record<string, unknown> = {};
  if (args.status) where.orderStatus = args.status;

  if (args.customerName) {
    const customer = await prisma.customer.findFirst({
      where: { company: { contains: args.customerName as string, mode: "insensitive" } },
    });
    if (customer) {
      where.customerId = customer.id;
    } else {
      return { success: true, message: `未找到客户「${args.customerName}」。` };
    }
  }

  try {
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        customer: { select: { company: true } },
        items: { select: { itemName: true, quantity: true } },
      },
    });

    const total = await prisma.order.count({ where });

    if (orders.length === 0) {
      return { success: true, message: "📋 暂无订单记录。" };
    }

    const statusMap: Record<string, string> = {
      DRAFT: "草稿",
      CONFIRMED: "已确认",
      PRODUCTION: "生产中",
      READY_TO_SHIP: "待发货",
      SHIPPED: "已发货",
      COMPLETED: "已完成",
      CANCELLED: "已取消",
    };

    const lines = orders.map(
      (o, i) => `${i + 1}. ${o.orderNo} - ${o.customer.company} [${statusMap[o.orderStatus] || o.orderStatus}] ${o.totalAmount ? `${o.currency} ${o.totalAmount}` : ""}`
    );

    return {
      success: true,
      message: `📋 订单列表（共 ${total} 条，显示前 ${orders.length} 条）\n\n${lines.join("\n")}`,
      data: orders,
    };
  } catch (error) {
    return { success: false, message: `查询失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

async function executeQueryTasks(args: Record<string, unknown>): Promise<ExecutionResult> {
  const status = (args.status as string) || undefined;

  try {
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    } else {
      where.status = { in: ["PENDING", "IN_PROGRESS"] };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { dueDate: "asc" },
      take: 10,
      include: {
        lead: { select: { company: true } },
        customer: { select: { company: true } },
        project: { select: { name: true } },
      },
    });

    if (tasks.length === 0) {
      return { success: true, message: "📋 当前没有待办任务。" };
    }

    const priorityMap: Record<string, string> = { LOW: "🟢", MEDIUM: "🟡", HIGH: "🟠", URGENT: "🔴" };

    const lines = tasks.map((t) => {
      const related = t.lead?.company || t.customer?.company || t.project?.name || "";
      const due = t.dueDate ? new Date(t.dueDate).toLocaleDateString("zh-CN") : "";
      return `${priorityMap[t.priority] || "⚪"} ${t.title}${related ? ` (${related})` : ""}${due ? ` 截止:${due}` : ""}`;
    });

    return {
      success: true,
      message: `📋 待办任务（${tasks.length} 条）\n\n${lines.join("\n")}`,
      data: tasks,
    };
  } catch (error) {
    return { success: false, message: `查询失败：${error instanceof Error ? error.message : "未知错误"}` };
  }
}

function executeHelp(): ExecutionResult {
  return {
    success: true,
    message: `🤖 外贸 CRM AI 助手

我可以帮您完成以下操作：

📝 创建类：
• "添加线索，ABC公司，美国，john@abc.com"
• "添加客户，XYZ集团，英国"
• "建个订单，客户ABC，产品XX，数量100"
• "给ABC加跟进：今天电话沟通了价格"

🔍 查询类：
• "查看线索列表"
• "ABC公司的订单进度怎么样"
• "我今天有什么任务"
• "本月新增了多少客户"

输入任何问题，我会尽力帮助您！`,
  };
}
```

- [ ] **Step 2: 验证类型编译**

```bash
cd /d/web_project/multi-business-crm
npx tsc --noEmit lib/ai/executor.ts
```

Expected: 无类型错误。

- [ ] **Step 3: Commit**

```bash
git add lib/ai/executor.ts
git commit -m "feat: add business executor for AI intents"
```

---

## Task 7: 飞书 Webhook 处理器

**Files:**
- Create: `lib/im/feishu.ts`
- Create: `app/api/im/feishu/webhook/route.ts`

**Interfaces:**
- Consumes: `parseIntent` from `lib/ai/intent.ts`, `executeIntent` from `lib/ai/executor.ts`
- Produces: POST /api/im/feishu/webhook

- [ ] **Step 1: 创建飞书 API 工具函数**

```typescript
// lib/im/feishu.ts
import crypto from "crypto";

export function verifyFeishuSignature(
  timestamp: string,
  nonce: string,
  encryptKey: string,
  body: string
): string {
  const content = timestamp + nonce + encryptKey + body;
  return crypto.createHash("sha256").update(content).digest("hex");
}

export async function sendFeishuMessage(
  appId: string,
  appSecret: string,
  chatId: string,
  content: string
): Promise<boolean> {
  try {
    // 获取 tenant_access_token
    const tokenResponse = await fetch(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
      }
    );

    const tokenData = await tokenResponse.json();
    if (!tokenData.tenant_access_token) {
      console.error("Failed to get feishu token:", tokenData);
      return false;
    }

    // 发送消息
    const msgResponse = await fetch(
      "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
        },
        body: JSON.stringify({
          receive_id: chatId,
          msg_type: "text",
          content: JSON.stringify({ text: content }),
        }),
      }
    );

    const msgData = await msgResponse.json();
    return msgData.code === 0;
  } catch (error) {
    console.error("Failed to send feishu message:", error);
    return false;
  }
}
```

- [ ] **Step 2: 创建飞书 Webhook 路由**

```typescript
// app/api/im/feishu/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyFeishuSignature, sendFeishuMessage } from "@/lib/im/feishu";
import { parseIntent } from "@/lib/ai/intent";
import { executeIntent } from "@/lib/ai/executor";
import { createActivityLog } from "@/lib/activity-log";

export async function POST(request: NextRequest) {
  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Failed to read body" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // URL 验证（飞书首次配置时发送）
  if (body.challenge) {
    return NextResponse.json({ challenge: body.challenge });
  }

  // 获取飞书平台配置
  const platform = await prisma.iMPlatform.findUnique({
    where: { name: "feishu" },
  });

  if (!platform || !platform.isActive) {
    return NextResponse.json({ error: "Feishu platform not configured" }, { status: 400 });
  }

  // 验证签名
  if (platform.encryptKey) {
    const timestamp = request.headers.get("x-lark-request-timestamp") || "";
    const nonce = request.headers.get("x-lark-request-nonce") || "";
    const signature = request.headers.get("x-lark-signature") || "";

    const expectedSignature = verifyFeishuSignature(timestamp, nonce, platform.encryptKey, rawBody);

    if (signature && signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
  }

  // 处理事件
  const header = body.header as Record<string, unknown> | undefined;
  const event = body.event as Record<string, unknown> | undefined;

  if (!header || !event) {
    return NextResponse.json({ ok: true });
  }

  const eventType = header.event_type as string;

  // 处理消息事件
  if (eventType === "im.message.receive_v1") {
    const message = event.message as Record<string, unknown> | undefined;
    const sender = event.sender as Record<string, unknown> | undefined;

    if (!message || !sender) {
      return NextResponse.json({ ok: true });
    }

    const senderId = (sender.sender_id as Record<string, string>)?.open_id;
    const chatId = message.chat_id as string;
    const messageType = message.message_type as string;

    // 只处理文本消息
    if (messageType !== "text") {
      return NextResponse.json({ ok: true });
    }

    let content = "";
    try {
      const contentObj = JSON.parse(message.content as string);
      content = contentObj.text || "";
    } catch {
      content = (message.content as string) || "";
    }

    // 去除 @机器人 的部分
    content = content.replace(/@_user_\d+/g, "").trim();

    if (!content) {
      return NextResponse.json({ ok: true });
    }

    // 获取或创建 IM 用户
    let imUser = await prisma.iMUser.findUnique({
      where: {
        platformId_platformUserId: {
          platformId: platform.id,
          platformUserId: senderId || "unknown",
        },
      },
    });

    if (!imUser) {
      imUser = await prisma.iMUser.create({
        data: {
          platformId: platform.id,
          platformUserId: senderId || "unknown",
          platformName: (sender.sender_id as Record<string, string>)?.user_id || "未知用户",
        },
      });
    }

    // 记录收到的消息
    await prisma.iMMessage.create({
      data: {
        platformId: platform.id,
        imUserId: imUser.id,
        direction: "in",
        content,
      },
    });

    // 异步处理 AI 意图（不阻塞响应）
    processMessageAsync(platform, imUser, content, chatId).catch((err) => {
      console.error("Failed to process IM message:", err);
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

async function processMessageAsync(
  platform: { id: number; appId: string | null; appSecret: string | null },
  imUser: { id: number },
  content: string,
  chatId: string
) {
  let intent: string | null = null;
  let action: string | null = null;
  let replyContent: string;
  let actionResult: unknown = null;
  let errorMsg: string | null = null;

  try {
    // 解析意图
    const intentResult = await parseIntent(content);
    intent = intentResult.intent;
    action = intentResult.functionName;

    // 执行业务操作
    const execResult = await executeIntent(intentResult);
    replyContent = execResult.message;
    actionResult = execResult;

    await createActivityLog({
      action: "IM AI 处理",
      entityType: "IM消息",
      entityId: imUser.id,
      entityName: content.slice(0, 50),
      description: `意图: ${intent}, 结果: ${execResult.success ? "成功" : "失败"}`,
    });
  } catch (error) {
    errorMsg = error instanceof Error ? error.message : "处理失败";
    replyContent = `❌ 处理出错：${errorMsg}`;
  }

  // 记录回复消息
  await prisma.iMMessage.create({
    data: {
      platformId: platform.id,
      imUserId: imUser.id,
      direction: "out",
      content: replyContent,
      intent,
      action,
      actionResult: actionResult ? JSON.parse(JSON.stringify(actionResult)) : null,
      errorMsg,
    },
  });

  // 发送飞书回复
  if (platform.appId && platform.appSecret && chatId) {
    await sendFeishuMessage(platform.appId, platform.appSecret, chatId, replyContent);
  }
}
```

- [ ] **Step 3: 验证类型编译**

```bash
cd /d/web_project/multi-business-crm
npx tsc --noEmit lib/im/feishu.ts app/api/im/feishu/webhook/route.ts
```

Expected: 无类型错误。

- [ ] **Step 4: Commit**

```bash
git add lib/im/ app/api/im/feishu/
git commit -m "feat: add Feishu webhook handler with AI intent processing"
```

---

## Task 8: IM 设置页面

**Files:**
- Create: `app/(dashboard)/im-settings/page.tsx`

**Interfaces:**
- Consumes: `GET/POST/PUT/DELETE /api/im/platforms`

- [ ] **Step 1: 创建 IM 设置页面**

```tsx
// app/(dashboard)/im-settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Bot, Save, Trash2, Plus, ToggleLeft, ToggleRight } from "lucide-react";

interface IMPlatform {
  id: number;
  name: string;
  appId: string | null;
  appSecret: string | null;
  encryptKey: string | null;
  verifyToken: string | null;
  botToken: string | null;
  isActive: boolean;
  _count?: { imUsers: number; imMessages: number };
}

export default function IMSettingsPage() {
  const [platforms, setPlatforms] = useState<IMPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<IMPlatform | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "feishu",
    appId: "",
    appSecret: "",
    encryptKey: "",
    verifyToken: "",
    botToken: "",
  });
  const [saving, setSaving] = useState(false);

  async function fetchPlatforms() {
    try {
      const res = await fetch("/api/im/platforms");
      const data = await res.json();
      setPlatforms(data);
    } catch (error) {
      console.error("Failed to fetch platforms:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPlatforms();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const url = editing ? `/api/im/platforms/${editing.id}` : "/api/im/platforms";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        await fetchPlatforms();
        setShowAdd(false);
        setEditing(null);
        setForm({ name: "feishu", appId: "", appSecret: "", encryptKey: "", verifyToken: "", botToken: "" });
      } else {
        const data = await res.json();
        alert(data.error || "保存失败");
      }
    } catch {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(platform: IMPlatform) {
    await fetch(`/api/im/platforms/${platform.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !platform.isActive }),
    });
    await fetchPlatforms();
  }

  async function handleDelete(id: number) {
    if (!confirm("确定删除该平台配置？")) return;
    await fetch(`/api/im/platforms/${id}`, { method: "DELETE" });
    await fetchPlatforms();
  }

  function startEdit(platform: IMPlatform) {
    setEditing(platform);
    setForm({
      name: platform.name,
      appId: platform.appId || "",
      appSecret: platform.appSecret || "",
      encryptKey: platform.encryptKey || "",
      verifyToken: platform.verifyToken || "",
      botToken: platform.botToken || "",
    });
    setShowAdd(true);
  }

  const platformLabels: Record<string, string> = {
    feishu: "飞书",
    telegram: "Telegram",
    wechat: "企业微信",
  };

  if (loading) {
    return <div className="p-6 text-gray-500">加载中...</div>;
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IM 设置</h1>
          <p className="text-sm text-gray-500 mt-1">配置 IM 平台接入，支持通过飞书等平台与 AI 助手对话</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setForm({ name: "feishu", appId: "", appSecret: "", encryptKey: "", verifyToken: "", botToken: "" });
            setShowAdd(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} /> 添加平台
        </button>
      </div>

      {/* 平台列表 */}
      <div className="space-y-4 mb-6">
        {platforms.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <Bot size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">暂未配置 IM 平台</p>
            <p className="text-sm text-gray-400 mt-1">点击「添加平台」开始配置</p>
          </div>
        ) : (
          platforms.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot size={24} className={p.isActive ? "text-blue-600" : "text-gray-400"} />
                  <div>
                    <h3 className="font-medium text-gray-900">{platformLabels[p.name] || p.name}</h3>
                    <p className="text-xs text-gray-500">
                      App ID: {p.appId || "未配置"} · 用户: {p._count?.imUsers || 0} · 消息: {p._count?.imMessages || 0}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(p)}
                    className="p-1 rounded hover:bg-gray-100"
                    title={p.isActive ? "点击禁用" : "点击启用"}
                  >
                    {p.isActive ? (
                      <ToggleRight size={28} className="text-green-500" />
                    ) : (
                      <ToggleLeft size={28} className="text-gray-400" />
                    )}
                  </button>
                  <button onClick={() => startEdit(p)} className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
                    编辑
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 添加/编辑表单 */}
      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">{editing ? "编辑平台" : "添加平台"}</h2>

          <div className="space-y-4">
            {!editing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">平台</label>
                <select
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="feishu">飞书</option>
                  <option value="telegram">Telegram</option>
                  <option value="wechat">企业微信</option>
                </select>
              </div>
            )}

            {(form.name === "feishu" || form.name === "wechat") && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">App ID</label>
                  <input
                    type="text"
                    value={form.appId}
                    onChange={(e) => setForm({ ...form, appId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="cli_xxxxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">App Secret</label>
                  <input
                    type="password"
                    value={form.appSecret}
                    onChange={(e) => setForm({ ...form, appSecret: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Encrypt Key</label>
                  <input
                    type="text"
                    value={form.encryptKey}
                    onChange={(e) => setForm({ ...form, encryptKey: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="可选，用于签名验证"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verify Token</label>
                  <input
                    type="text"
                    value={form.verifyToken}
                    onChange={(e) => setForm({ ...form, verifyToken: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="可选"
                  />
                </div>
              </>
            )}

            {form.name === "telegram" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bot Token</label>
                <input
                  type="text"
                  value={form.botToken}
                  onChange={(e) => setForm({ ...form, botToken: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="123456:ABC-xxx"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={16} /> {saving ? "保存中..." : "保存"}
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setEditing(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
          </div>

          {form.name === "feishu" && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <p className="font-medium mb-1">飞书配置说明：</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>在飞书开放平台创建应用，启用机器人能力</li>
                <li>配置事件订阅 URL：<code className="bg-blue-100 px-1 rounded">https://your-domain.com/api/im/feishu/webhook</code></li>
                <li>订阅 <code className="bg-blue-100 px-1 rounded">im.message.receive_v1</code> 事件</li>
                <li>将 App ID 和 App Secret 填入上方</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/im-settings/
git commit -m "feat: add IM settings page"
```

---

## Task 9: IM 消息记录页面

**Files:**
- Create: `app/(dashboard)/im-messages/page.tsx`

**Interfaces:**
- Consumes: `GET /api/im/messages`

- [ ] **Step 1: 创建消息记录页面**

```tsx
// app/(dashboard)/im-messages/page.tsx
"use client";

import { useState, useEffect } from "react";
import { MessageSquare, ArrowUpRight, ArrowDownLeft, Bot, User } from "lucide-react";

interface IMMessage {
  id: number;
  direction: string;
  content: string;
  intent: string | null;
  action: string | null;
  errorMsg: string | null;
  createdAt: string;
  platform: { name: string };
  imUser: { platformName: string | null; platformUserId: string };
}

export default function IMMessagesPage() {
  const [messages, setMessages] = useState<IMMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  async function fetchMessages(p: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/im/messages?page=${p}&pageSize=20`);
      const data = await res.json();
      setMessages(data.messages || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMessages(page);
  }, [page]);

  const intentLabels: Record<string, string> = {
    create_lead: "创建线索",
    create_customer: "创建客户",
    create_order: "创建订单",
    add_followup: "添加跟进",
    query_leads: "查询线索",
    query_customers: "查询客户",
    query_orders: "查询订单",
    query_tasks: "查询任务",
    help: "帮助",
    unknown: "未识别",
  };

  const platformLabels: Record<string, string> = {
    feishu: "飞书",
    telegram: "Telegram",
    wechat: "企业微信",
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">IM 消息记录</h1>
        <p className="text-sm text-gray-500 mt-1">查看所有 IM 平台的消息交互记录（共 {total} 条）</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">暂无消息记录</p>
          <p className="text-sm text-gray-400 mt-1">通过飞书等平台发送消息后，记录将显示在这里</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`border rounded-lg p-4 ${
                  msg.direction === "in" ? "bg-white border-gray-200" : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${msg.direction === "in" ? "bg-gray-100" : "bg-blue-100"}`}>
                    {msg.direction === "in" ? (
                      <User size={16} className="text-gray-600" />
                    ) : (
                      <Bot size={16} className="text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {msg.direction === "in"
                          ? msg.imUser.platformName || msg.imUser.platformUserId
                          : "AI 助手"}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {platformLabels[msg.platform.name] || msg.platform.name}
                      </span>
                      {msg.direction === "in" ? (
                        <ArrowDownLeft size={14} className="text-green-500" />
                      ) : (
                        <ArrowUpRight size={14} className="text-blue-500" />
                      )}
                      {msg.intent && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          {intentLabels[msg.intent] || msg.intent}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(msg.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{msg.content}</p>
                    {msg.errorMsg && (
                      <p className="text-xs text-red-500 mt-1">错误：{msg.errorMsg}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                上一页
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/im-messages/
git commit -m "feat: add IM messages history page"
```

---

## Task 10: 更新侧边栏导航

**Files:**
- Modify: `components/Sidebar.tsx`

**Interfaces:**
- Adds: `/im-settings` and `/im-messages` nav items

- [ ] **Step 1: 在 Sidebar.tsx 中添加 IM 相关导航项**

在 `components/Sidebar.tsx` 的 import 中添加 `MessageSquareMore` 图标（如果 lucide-react 有的话，用已有的 `MessageSquare`），然后在「外部接入」分组中添加两个新项目。

找到「外部接入」的 `items` 数组，在 `external-sources` 之前添加：

```typescript
// 在 navGroups 中找到 title: "外部接入" 的分组
// 在 items 数组开头添加：
{ href: "/im-settings", label: "IM 设置", icon: Bot },
{ href: "/im-messages", label: "IM 消息记录", icon: MessageSquare },
```

同时在 import 中确保 `Bot` 已导入（从 lucide-react）。

- [ ] **Step 2: 验证页面可访问**

启动 dev server 后访问：
- http://localhost:3003/im-settings
- http://localhost:3003/im-messages

Expected: 两个新页面正常显示。

- [ ] **Step 3: Commit**

```bash
git add components/Sidebar.tsx
git commit -m "feat: add IM navigation items to sidebar"
```

---

## Task 11: AI Chat API（可选，用于 Web 端测试）

**Files:**
- Create: `app/api/ai/chat/route.ts`

**Interfaces:**
- Consumes: `parseIntent` from `lib/ai/intent.ts`, `executeIntent` from `lib/ai/executor.ts`
- Produces: POST /api/ai/chat

- [ ] **Step 1: 创建 AI Chat API**

```typescript
// app/api/ai/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { parseIntent } from "@/lib/ai/intent";
import { executeIntent } from "@/lib/ai/executor";
import { createActivityLog } from "@/lib/activity-log";

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const intentResult = await parseIntent(message);
    const execResult = await executeIntent(intentResult);

    await createActivityLog({
      action: "AI Chat",
      entityType: "IM消息",
      entityName: message.slice(0, 50),
      description: `意图: ${intentResult.intent}, 结果: ${execResult.success ? "成功" : "失败"}`,
    });

    return NextResponse.json({
      intent: intentResult.intent,
      reply: execResult.message,
      success: execResult.success,
      data: execResult.data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "处理失败" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: 测试 API**

```bash
curl -X POST http://localhost:3003/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"帮助"}'
```

Expected: 返回 AI 助手的功能列表。

- [ ] **Step 3: Commit**

```bash
git add app/api/ai/chat/
git commit -m "feat: add AI chat API for web-based testing"
```

---

## 计划总结

| Task | 内容 | 依赖 |
|------|------|------|
| 1 | IM 数据模型（Prisma schema） | 无 |
| 2 | IM 平台配置 CRUD API | Task 1 |
| 3 | IM 消息记录 API | Task 1 |
| 4 | AI Function Calling 工具定义 | 无 |
| 5 | AI 意图解析引擎 | Task 4 |
| 6 | 业务执行器 | Task 5 |
| 7 | 飞书 Webhook 处理器 | Task 5, 6 |
| 8 | IM 设置页面 | Task 2 |
| 9 | IM 消息记录页面 | Task 3 |
| 10 | 更新侧边栏 | Task 8, 9 |
| 11 | AI Chat API（可选） | Task 5, 6 |

**可并行执行的任务组：**
- 组 A: Task 1 + Task 4（无依赖）
- 组 B: Task 2 + Task 3 + Task 5（依赖 Task 1）
- 组 C: Task 6 + Task 8 + Task 9（依赖 Task 2/3/5）
- 组 D: Task 7 + Task 10 + Task 11（依赖 Task 6/8/9）
