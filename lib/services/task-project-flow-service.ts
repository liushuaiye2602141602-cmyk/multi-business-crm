import prisma from "@/lib/prisma";
import { getLocalWorkspaceId } from "@/lib/local-context";
import { resolveCustomerReference, resolveLeadReference } from "@/lib/services/customer-flow-service";

type Db = typeof prisma;

export type EntityReference = {
  type?: string | null;
  id?: string | number | null;
  name?: string | null;
  title?: string | null;
  customerName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  useLastTask?: boolean | null;
  useLastProject?: boolean | null;
};

export type FeishuOperationContext = {
  senderId?: string;
  chatId?: string;
  messageId?: string;
  workspaceId?: number;
};

export type TaskPlan = {
  intent: string;
  entityType: "Task" | "Project";
  entityId?: number;
  validatedParameters: Record<string, any>;
  beforeValues: Record<string, any>;
  summary: string;
};

export type PlanResult = {
  success: boolean;
  message: string;
  entityType?: string;
  entityId?: number;
  plan?: TaskPlan;
};

export type ServiceResult = {
  success: boolean;
  message: string;
  entityType?: string;
  entityId?: number;
};

const TASK_STATUSES = new Set(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
const TASK_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const PROJECT_STAGES = new Set(["REQUIREMENT_CONFIRMING", "QUOTING", "SAMPLE_TESTING", "WAITING_FEEDBACK", "NEGOTIATING", "WON", "LOST", "PAUSED"]);
const CURRENCIES = new Set(["USD", "EUR", "CNY"]);
const RECENT_CONTEXT_TTL_MS = 30 * 60 * 1000;
type ConversationContext = {
  lastTaskId?: number;
  lastTaskTitle?: string;
  lastProjectId?: number;
  lastCustomerId?: number;
  workspaceId?: number;
  updatedAt: number;
  expiresAt: number;
};
const conversationContexts = new Map<string, ConversationContext>();

function tenantId() {
  return getLocalWorkspaceId();
}

function normalizeContext(input?: string | FeishuOperationContext): FeishuOperationContext {
  return typeof input === "string" ? { messageId: input } : (input || {});
}

function contextKey(context?: FeishuOperationContext): string | null {
  if (!context?.senderId || !context.chatId) return null;
  return `${context.chatId}::${context.senderId}`;
}

function setRecentTask(context: FeishuOperationContext | undefined, id: number, title?: string | null, customerId?: number | null) {
  const key = contextKey(context);
  if (!key) return;
  const now = Date.now();
  const current = conversationContexts.get(key) || { updatedAt: now, expiresAt: 0 };
  conversationContexts.set(key, {
    ...current,
    lastTaskId: id,
    lastTaskTitle: title || current.lastTaskTitle,
    lastCustomerId: customerId ?? current.lastCustomerId,
    workspaceId: context?.workspaceId ?? tenantId(),
    updatedAt: now,
    expiresAt: now + RECENT_CONTEXT_TTL_MS,
  });
}

function setRecentProject(context: FeishuOperationContext | undefined, id: number) {
  const key = contextKey(context);
  if (!key) return;
  const now = Date.now();
  const current = conversationContexts.get(key) || { updatedAt: now, expiresAt: 0 };
  conversationContexts.set(key, { ...current, lastProjectId: id, workspaceId: context?.workspaceId ?? tenantId(), updatedAt: now, expiresAt: now + RECENT_CONTEXT_TTL_MS });
}

function getConversationContext(context?: FeishuOperationContext): ConversationContext | null {
  const key = contextKey(context);
  if (!key) return null;
  const item = conversationContexts.get(key);
  if (!item) return null;
  if (item.expiresAt < Date.now()) {
    conversationContexts.delete(key);
    return null;
  }
  return item;
}

function getRecentTaskId(context?: FeishuOperationContext): number | null {
  return getConversationContext(context)?.lastTaskId || null;
}

function getRecentProjectId(context?: FeishuOperationContext): number | null {
  return getConversationContext(context)?.lastProjectId || null;
}

function stripFeishuCustomerPrefix(value: string): string {
  return value.replace(/FEISHU_CUSTOMER_A_/gi, "");
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const text = String(value).replace(" ", "T");
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function safeError(error: unknown, fallback: string): ServiceResult {
  const raw = error instanceof Error ? error.message : String(error || "");
  if (/Prisma|DATABASE_URL|password|secret|api[_-]?key/i.test(raw)) return { success: false, message: fallback };
  return { success: false, message: raw || fallback };
}

function requireText(value: unknown, label: string): string | null {
  if (!String(value || "").trim()) return `请提供${label}。`;
  return null;
}

function formatDate(value: unknown): string {
  const date = value instanceof Date ? value : toDate(value);
  return date ? date.toLocaleString("zh-CN", { hour12: false }) : "未填写";
}

function formatPriority(value?: string) {
  return ({ LOW: "低", MEDIUM: "中", HIGH: "高", URGENT: "紧急" } as Record<string, string>)[value || ""] || value || "中";
}

function formatTaskStatus(value?: string) {
  return ({ PENDING: "待处理", IN_PROGRESS: "进行中", COMPLETED: "已完成", CANCELLED: "已取消" } as Record<string, string>)[value || ""] || value || "待处理";
}

function formatProjectStage(value?: string) {
  return ({
    REQUIREMENT_CONFIRMING: "需求确认",
    QUOTING: "报价中",
    SAMPLE_TESTING: "样品确认",
    WAITING_FEEDBACK: "方案沟通",
    NEGOTIATING: "谈判中",
    WON: "已赢单",
    LOST: "已丢单",
    PAUSED: "暂停",
  } as Record<string, string>)[value || ""] || value || "需求确认";
}

function changedOnly(input: Record<string, any>, allowed: string[]) {
  const out: Record<string, any> = {};
  for (const key of allowed) {
    if (input[key] !== undefined && input[key] !== null && input[key] !== "") out[key] = input[key];
  }
  return out;
}

function normalizeDuplicateKey(value: unknown): string {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s"'“”‘’「」《》【】（）()，。！？；：:、_-]+/g, "");
}

function sameNullableNumber(left: unknown, right: unknown): boolean {
  if (left === null || left === undefined || left === "") return right === null || right === undefined || right === "";
  if (right === null || right === undefined || right === "") return false;
  return Number(left) === Number(right);
}

function sameDateMinute(left: unknown, right: unknown): boolean {
  const leftDate = left instanceof Date ? left : toDate(left);
  const rightDate = right instanceof Date ? right : toDate(right);
  if (!leftDate || !rightDate) return false;
  return Math.floor(leftDate.getTime() / 60000) === Math.floor(rightDate.getTime() / 60000);
}

async function findDuplicateTask(data: Record<string, any>, db: Db = prisma) {
  const candidates = await db.task.findMany({
    where: {
      tenantId: data.tenantId ?? tenantId(),
      status: { not: "CANCELLED" },
      ...(data.projectId ? { projectId: data.projectId } : {}),
      ...(data.customerId ? { customerId: data.customerId } : {}),
      ...(data.leadId ? { leadId: data.leadId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  const titleKey = normalizeDuplicateKey(data.title);
  return candidates.find((task) => normalizeDuplicateKey(task.title) === titleKey && sameDateMinute(task.dueDate, data.dueDate)) || null;
}

async function findDuplicateProject(data: Record<string, any>, db: Db = prisma) {
  const candidates = await db.project.findMany({
    where: {
      status: { not: "LOST" },
      ...(data.customerId ? { customerId: data.customerId } : {}),
      ...(data.leadId ? { leadId: data.leadId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  const nameKey = normalizeDuplicateKey(data.name);
  return candidates.find((project) =>
    normalizeDuplicateKey(project.name) === nameKey &&
    sameNullableNumber(project.amount, data.amount) &&
    String(project.currency || "") === String(data.currency || "")
  ) || null;
}

function mergeProbabilityRemark(current: string | null | undefined, probability: number): string {
  const base = String(current || "").replace(/(?:^|；)\s*成交概率：\d{1,3}%/g, "").replace(/^；|；$/g, "").trim();
  const probabilityText = `成交概率：${probability}%`;
  return base ? `${base}；${probabilityText}` : probabilityText;
}

async function firstBusinessLine(db: Db = prisma) {
  return db.businessLine.findFirst({ orderBy: { id: "asc" } });
}

async function resolveCustomer(ref?: EntityReference, db: Db = prisma) {
  const resolved = await resolveCustomerReference({
    id: ref?.id,
    companyName: ref?.companyName || ref?.customerName || ref?.name,
    email: ref?.email,
    phone: ref?.phone,
    whatsapp: ref?.whatsapp,
  }, db);
  return resolved as any;
}

async function resolveLead(ref?: EntityReference, db: Db = prisma) {
  const resolved = await resolveLeadReference({
    id: ref?.id,
    companyName: ref?.companyName || ref?.customerName || ref?.name,
    contactName: ref?.title,
    email: ref?.email,
    phone: ref?.phone,
    whatsapp: ref?.whatsapp,
  }, db);
  return resolved as any;
}

async function resolveProject(ref?: EntityReference, db: Db = prisma, context?: FeishuOperationContext) {
  const recentProjectId = ref?.useLastProject ? getRecentProjectId(context) : null;
  if (ref?.useLastProject && !recentProjectId) return { kind: "none" as const, message: "没有可用的最近项目上下文，请提供项目ID或项目名称。" };
  if (!recentProjectId && !ref?.id && !ref?.name && !ref?.customerName && !ref?.companyName) return { kind: "none" as const, message: "请提供项目ID或项目名称。" };
  const where = recentProjectId || ref?.id
    ? { id: Number(recentProjectId || ref?.id) }
    : {
        AND: [
          ref?.name ? { name: { contains: String(ref.name), mode: "insensitive" as const } } : {},
          (ref?.customerName || ref?.companyName) ? { customer: { tenantId: tenantId(), company: { contains: String(ref.customerName || ref.companyName), mode: "insensitive" as const } } } : {},
        ],
      };
  const items = await db.project.findMany({ where, take: 10, include: { customer: true, tasks: true } });
  if (items.length === 0) return { kind: "none" as const, message: `未找到匹配项目“${ref?.name || ref?.id || ref?.customerName || ref?.companyName}”。` };
  if (items.length > 1) return { kind: "many" as const, message: `找到多条匹配项目，请选择具体ID：${items.map((i) => `${i.id}.${i.name}`).join("；")}` };
  return { kind: "one" as const, entity: items[0] };
}

async function resolveTask(ref?: EntityReference & { title?: string | null }, db: Db = prisma, context?: FeishuOperationContext) {
  if (ref?.id !== undefined && ref.id !== null && String(ref.id).trim()) {
    const taskId = Number(ref.id);
    if (!Number.isInteger(taskId) || taskId <= 0) return { kind: "none" as const, message: `未找到任务ID ${ref.id}。` };
    const task = await db.task.findFirst({ where: { tenantId: tenantId(), id: taskId }, include: { project: true, customer: true, lead: true } });
    if (!task) return { kind: "none" as const, message: `未找到任务ID ${taskId}。` };
    setRecentTask(context, task.id, task.title, task.customerId);
    if (task.projectId) setRecentProject(context, task.projectId);
    return { kind: "one" as const, entity: task };
  }

  const recentTaskId = ref?.useLastTask ? getRecentTaskId(context) : null;
  if (ref?.useLastTask && recentTaskId) {
    const task = await db.task.findFirst({ where: { tenantId: tenantId(), id: recentTaskId }, include: { project: true, customer: true, lead: true } });
    if (task) {
      setRecentTask(context, task.id, task.title, task.customerId);
      if (task.projectId) setRecentProject(context, task.projectId);
      return { kind: "one" as const, entity: task };
    }
  }
  if (ref?.useLastTask && !ref?.name && !ref?.title) return { kind: "none" as const, message: "没有可用的最近任务上下文，请提供任务ID或任务标题。" };
  if (!ref?.id && !ref?.name && !ref?.title) return { kind: "none" as const, message: "请提供任务ID或任务标题。" };
  const title = ref.title || ref.name;
  let items = await db.task.findMany({ where: { tenantId: tenantId(), title: { equals: String(title), mode: "insensitive" as const } }, take: 10, include: { project: true, customer: true, lead: true } });
  if (items.length === 0) {
    items = await db.task.findMany({ where: { tenantId: tenantId(), title: { contains: String(title), mode: "insensitive" as const } }, take: 10, include: { project: true, customer: true, lead: true } });
  }
  if (items.length === 0 && title) {
    const alias = stripFeishuCustomerPrefix(String(title));
    const all = await db.task.findMany({ where: { tenantId: tenantId() }, orderBy: { updatedAt: "desc" }, take: 50, include: { project: true, customer: true, lead: true } });
    items = all.filter((task) => stripFeishuCustomerPrefix(task.title).includes(alias)).slice(0, 10);
  }
  if (items.length === 0) return { kind: "none" as const, message: `未找到匹配任务“${title || ref.id}”。` };
  if (items.length > 1) return { kind: "many" as const, message: `找到多条匹配任务，请选择具体ID：${items.map((i) => `${i.id}.${i.title}`).join("；")}` };
  setRecentTask(context, items[0].id, items[0].title, items[0].customerId);
  if (items[0].projectId) setRecentProject(context, items[0].projectId);
  return { kind: "one" as const, entity: items[0] };
}

export async function rememberTaskContextById(id: string | number, context?: FeishuOperationContext, db: Db = prisma): Promise<boolean> {
  const taskId = Number(id);
  if (!Number.isInteger(taskId) || taskId <= 0) return false;
  const task = await db.task.findFirst({ where: { tenantId: tenantId(), id: taskId } });
  if (!task) return false;
  setRecentTask(context, task.id, task.title, task.customerId);
  if (task.projectId) setRecentProject(context, task.projectId);
  return true;
}

export async function validateCreateTaskPlan(task: any, related: EntityReference | undefined, contextInput?: string | FeishuOperationContext): Promise<PlanResult> {
  const context = normalizeContext(contextInput);
  const titleError = requireText(task?.title, "任务标题");
  if (titleError) return { success: false, message: titleError };
  const dueDate = toDate(task?.dueAt);
  if (!dueDate) return { success: false, message: "请提供明确的任务截止时间。" };
  if (task?.priority && !TASK_PRIORITIES.has(task.priority)) return { success: false, message: "任务优先级不合法。" };

  const data: Record<string, any> = { title: task.title.trim(), description: task.description || null, priority: task.priority || "MEDIUM", dueDate, status: "PENDING", tenantId: tenantId() };
  let relationLabel = "未关联";
  if (related?.type === "Customer") {
    const resolved = await resolveCustomer(related);
    if (resolved.kind !== "one") return { success: false, message: resolved.message };
    data.customerId = resolved.entity.id;
    relationLabel = `客户｜${resolved.entity.company}`;
  } else if (related?.type === "Lead") {
    const resolved = await resolveLead(related);
    if (resolved.kind !== "one") return { success: false, message: resolved.message };
    data.leadId = resolved.entity.id;
    relationLabel = `线索｜${resolved.entity.company}`;
  } else if (related?.type === "Project") {
    const resolved = await resolveProject(related, prisma, context);
    if (resolved.kind !== "one") return { success: false, message: resolved.message };
    data.projectId = resolved.entity.id;
    data.customerId = resolved.entity.customerId;
    relationLabel = `项目｜${resolved.entity.name}`;
  }

  const duplicate = await findDuplicateTask(data);
  if (duplicate) {
    setRecentTask(context, duplicate.id, duplicate.title, duplicate.customerId);
    if (duplicate.projectId) setRecentProject(context, duplicate.projectId);
    return {
      success: false,
      message: `检测到疑似重复任务，未创建新任务。\n任务ID：${duplicate.id}\n标题：${duplicate.title}\n已将现有任务ID ${duplicate.id}设为当前任务，后续可直接说“完成刚才的任务”或“延期刚才的任务”。\n请先查看现有任务，或提供不同标题/截止时间后重新创建。`,
      entityType: "Task",
      entityId: duplicate.id,
    };
  }

  const summary = [`理解摘要：创建任务`, `标题：${data.title}`, `截止时间：${formatDate(dueDate)}`, `优先级：${formatPriority(data.priority)}`, `关联对象：${relationLabel}`, `状态：待处理`, `未确认前不会写入数据库。`].join("\n");
  return { success: true, message: summary, entityType: "Task", plan: { intent: "CREATE_TASK", entityType: "Task", validatedParameters: { data, originalMessageId: context.messageId, context }, beforeValues: {}, summary } };
}

export async function createTaskService(plan: TaskPlan, senderId: string, messageId?: string, chatId?: string): Promise<ServiceResult> {
  try {
    const data = plan.validatedParameters.data;
    const duplicate = await findDuplicateTask(data);
    if (duplicate) {
      setRecentTask({ senderId, chatId, messageId: messageId || plan.validatedParameters.originalMessageId }, duplicate.id, duplicate.title, duplicate.customerId);
      if (duplicate.projectId) setRecentProject({ senderId, chatId, messageId: messageId || plan.validatedParameters.originalMessageId }, duplicate.projectId);
      return {
        success: false,
        message: `检测到疑似重复任务，本次未创建新任务。\n任务ID：${duplicate.id}\n标题：${duplicate.title}\n已将现有任务ID ${duplicate.id}设为当前任务，后续可直接说“完成刚才的任务”或“延期刚才的任务”。`,
        entityType: "Task",
        entityId: duplicate.id,
      };
    }
    const task = await prisma.task.create({ data });
    setRecentTask({ senderId, chatId, messageId: messageId || plan.validatedParameters.originalMessageId }, task.id, task.title, task.customerId);
    if (task.projectId) setRecentProject({ senderId, chatId, messageId: messageId || plan.validatedParameters.originalMessageId }, task.projectId);
    await prisma.activityLog.create({ data: { action: "飞书创建任务", entityType: "Task", entityId: String(task.id), entityName: task.title, description: `sender=${senderId}; messageId=${messageId || plan.validatedParameters.originalMessageId || ""}` } });
    return { success: true, message: `任务已创建\n标题：${task.title}\nID：${task.id}`, entityType: "Task", entityId: task.id };
  } catch (error) {
    return safeError(error, "创建任务失败，请稍后重试。");
  }
}

export async function validateUpdateTaskPlan(ref: any, changesInput: any, contextInput?: string | FeishuOperationContext): Promise<PlanResult> {
  const context = normalizeContext(contextInput);
  const resolved = await resolveTask(ref, prisma, context);
  if (resolved.kind !== "one") return { success: false, message: resolved.message };
  const changes = changedOnly(changesInput || {}, ["title", "description", "priority", "dueAt", "status", "relatedEntity"]);
  if (Object.keys(changes).length === 0) return { success: false, message: "请提供要修改的任务字段。" };
  if (changes.priority && !TASK_PRIORITIES.has(changes.priority)) return { success: false, message: "任务优先级不合法。" };
  if (changes.status && !TASK_STATUSES.has(changes.status)) return { success: false, message: "任务状态不合法。" };

  const data: Record<string, any> = {};
  if (changes.title) data.title = String(changes.title).trim();
  if (changes.description) data.description = changes.description;
  if (changes.priority) data.priority = changes.priority;
  if (changes.status) data.status = changes.status;
  if (changes.dueAt) {
    const dueDate = toDate(changes.dueAt);
    if (!dueDate) return { success: false, message: "任务截止时间无法解析。" };
    data.dueDate = dueDate;
  }
  if (changes.relatedEntity?.type === "Project") {
    const project = await resolveProject(changes.relatedEntity, prisma, context);
    if (project.kind !== "one") return { success: false, message: project.message };
    data.projectId = project.entity.id;
    data.customerId = project.entity.customerId;
  }
  const beforeValues = { title: resolved.entity.title, description: resolved.entity.description, priority: resolved.entity.priority, dueDate: resolved.entity.dueDate, status: resolved.entity.status, projectId: resolved.entity.projectId };
  const summary = [`理解摘要：更新任务`, `任务：${resolved.entity.title}`, `变更字段：${Object.keys(data).join("、")}`, `未确认前不会写入数据库。`].join("\n");
  return { success: true, message: summary, entityType: "Task", entityId: resolved.entity.id, plan: { intent: "UPDATE_TASK", entityType: "Task", entityId: resolved.entity.id, validatedParameters: { data, originalMessageId: context.messageId, context }, beforeValues, summary } };
}

export async function updateTaskService(plan: TaskPlan, senderId: string, messageId?: string, chatId?: string): Promise<ServiceResult> {
  try {
    const task = await prisma.task.update({ where: { id: plan.entityId! }, data: plan.validatedParameters.data });
    setRecentTask({ senderId, chatId, messageId }, task.id, task.title, task.customerId);
    if (task.projectId) setRecentProject({ senderId, chatId, messageId }, task.projectId);
    await prisma.activityLog.create({ data: { action: "飞书更新任务", entityType: "Task", entityId: String(task.id), entityName: task.title, description: `fields=${Object.keys(plan.validatedParameters.data).join(",")}; sender=${senderId}; messageId=${messageId || ""}` } });
    return { success: true, message: `任务已更新\n标题：${task.title}\nID：${task.id}`, entityType: "Task", entityId: task.id };
  } catch (error) {
    return safeError(error, "更新任务失败，请稍后重试。");
  }
}

export async function validateCompleteTaskPlan(ref: any, contextInput?: string | FeishuOperationContext): Promise<PlanResult> {
  const context = normalizeContext(contextInput);
  const resolved = await resolveTask(ref, prisma, context);
  if (resolved.kind !== "one") return { success: false, message: resolved.message };
  if (resolved.entity.status === "COMPLETED") return { success: false, message: "该任务已完成，不能重复完成。" };
  const data = { status: "COMPLETED", completedAt: new Date() };
  const summary = [`即将完成任务：`, ``, `任务ID：${resolved.entity.id}`, `标题：${resolved.entity.title}`, `当前状态：${formatTaskStatus(resolved.entity.status)}`, `完成后状态：已完成`, `完成时间：${formatDate(data.completedAt)}`, `未确认前不会写入数据库。`].join("\n");
  return { success: true, message: summary, entityType: "Task", entityId: resolved.entity.id, plan: { intent: "COMPLETE_TASK", entityType: "Task", entityId: resolved.entity.id, validatedParameters: { data, originalMessageId: context.messageId, context }, beforeValues: { status: resolved.entity.status, completedAt: resolved.entity.completedAt }, summary } };
}

export async function completeTaskService(plan: TaskPlan, senderId: string, messageId?: string, chatId?: string): Promise<ServiceResult> {
  try {
    const current = await prisma.task.findUnique({ where: { id: plan.entityId! } });
    if (!current) return { success: false, message: "任务不存在。" };
    if (current.status === "COMPLETED") return { success: false, message: "该任务已完成，不能重复完成。" };
    const task = await prisma.task.update({ where: { id: plan.entityId! }, data: plan.validatedParameters.data });
    setRecentTask({ senderId, chatId, messageId }, task.id, task.title, task.customerId);
    if (task.projectId) setRecentProject({ senderId, chatId, messageId }, task.projectId);
    await prisma.activityLog.create({ data: { action: "飞书完成任务", entityType: "Task", entityId: String(task.id), entityName: task.title, description: `sender=${senderId}; messageId=${messageId || ""}` } });
    return { success: true, message: `任务已完成\n标题：${task.title}\n完成时间：${formatDate(task.completedAt)}`, entityType: "Task", entityId: task.id };
  } catch (error) {
    return safeError(error, "完成任务失败，请稍后重试。");
  }
}

export async function validateCreateProjectPlan(project: any, related: EntityReference | undefined, contextInput?: string | FeishuOperationContext): Promise<PlanResult> {
  const context = normalizeContext(contextInput);
  const nameError = requireText(project?.name, "项目名称");
  if (nameError) return { success: false, message: nameError };
  if (project?.stage && !PROJECT_STAGES.has(project.stage)) return { success: false, message: "项目阶段不合法。" };
  if (project?.currency && !CURRENCIES.has(project.currency)) return { success: false, message: "币种不合法。" };
  let customer: any;
  let leadId: number | undefined;
  if (related?.type === "Customer") {
    const resolved = await resolveCustomer(related);
    if (resolved.kind !== "one") return { success: false, message: resolved.message };
    customer = resolved.entity;
  } else if (related?.type === "Lead") {
    const resolved = await resolveLead(related);
    if (resolved.kind !== "one") return { success: false, message: resolved.message };
    leadId = resolved.entity.id;
    if (!resolved.entity.convertedCustomerId) return { success: false, message: "当前项目表必须关联客户；该线索尚未转客户，不能创建仅关联线索的项目。" };
    customer = resolved.entity.convertedCustomer;
  } else {
    return { success: false, message: "请提供项目关联的客户或已转客户线索。" };
  }
  const businessLine = customer.businessLineId ? { id: customer.businessLineId } : await firstBusinessLine();
  if (!businessLine) return { success: false, message: "系统中还没有业务线。" };
  const data = {
    name: String(project.name).trim(),
    description: project.description || null,
    status: project.stage || "REQUIREMENT_CONFIRMING",
    amount: project.estimatedAmount ?? null,
    currency: project.currency || "USD",
    endDate: toDate(project.expectedCloseAt),
    remark: project.nextAction || null,
    customerId: customer.id,
    leadId,
    businessLineId: businessLine.id,
  };
  const duplicate = await findDuplicateProject(data);
  if (duplicate) {
    setRecentProject(context, duplicate.id);
    return {
      success: false,
      message: `检测到疑似重复商机项目，未创建新项目。\n项目ID：${duplicate.id}\n项目：${duplicate.name}\n请先查看现有项目，或提供不同项目名称/金额/币种后重新创建。`,
      entityType: "Project",
      entityId: duplicate.id,
    };
  }
  const summary = [`理解摘要：创建商机项目`, `项目：${data.name}`, `关联客户：${customer.company}`, `阶段：${formatProjectStage(data.status)}`, `预计金额：${data.amount ?? "未填写"} ${data.currency}`, `未确认前不会写入数据库。`].join("\n");
  return { success: true, message: summary, entityType: "Project", plan: { intent: "CREATE_PROJECT", entityType: "Project", validatedParameters: { data, originalMessageId: context.messageId, context }, beforeValues: {}, summary } };
}

export async function createProjectService(plan: TaskPlan, senderId: string, messageId?: string, chatId?: string): Promise<ServiceResult> {
  try {
    const data = plan.validatedParameters.data;
    const duplicate = await findDuplicateProject(data);
    if (duplicate) {
      setRecentProject({ senderId, chatId, messageId }, duplicate.id);
      return {
        success: false,
        message: `检测到疑似重复商机项目，本次未创建新项目。\n项目ID：${duplicate.id}\n项目：${duplicate.name}`,
        entityType: "Project",
        entityId: duplicate.id,
      };
    }
    const project = await prisma.project.create({ data });
    setRecentProject({ senderId, chatId, messageId }, project.id);
    await prisma.activityLog.create({ data: { action: "飞书创建商机项目", entityType: "Project", entityId: String(project.id), entityName: project.name, description: `sender=${senderId}; messageId=${messageId || ""}` } });
    return { success: true, message: `商机项目已创建\n项目：${project.name}\nID：${project.id}`, entityType: "Project", entityId: project.id };
  } catch (error) {
    return safeError(error, "创建商机项目失败，请稍后重试。");
  }
}

export async function validateUpdateProjectPlan(ref: any, changesInput: any, contextInput?: string | FeishuOperationContext): Promise<PlanResult> {
  const context = normalizeContext(contextInput);
  const resolved = await resolveProject(ref, prisma, context);
  if (resolved.kind !== "one") return { success: false, message: resolved.message };
  const changes = changedOnly(changesInput || {}, ["name", "description", "stage", "estimatedAmount", "currency", "expectedCloseAt", "probability", "nextAction", "lossReason"]);
  if (Object.keys(changes).length === 0) return { success: false, message: "请提供要修改的项目字段。" };
  if (changes.stage && !PROJECT_STAGES.has(changes.stage)) return { success: false, message: "项目阶段不合法。" };
  if (changes.currency && !CURRENCIES.has(changes.currency)) return { success: false, message: "币种不合法。" };
  if (resolved.entity.status === "WON" && changes.stage && changes.stage !== "WON") return { success: false, message: "已赢单项目不能直接回退到普通阶段。" };
  if (resolved.entity.status === "LOST" && changes.stage && changes.stage !== "LOST") return { success: false, message: "已丢单项目重新激活需要重新发起明确确认。" };
  const data: Record<string, any> = {};
  if (changes.name) data.name = String(changes.name).trim();
  if (changes.description) data.description = changes.description;
  if (changes.stage) data.status = changes.stage;
  if (changes.estimatedAmount !== undefined) data.amount = changes.estimatedAmount;
  if (changes.currency) data.currency = changes.currency;
  if (changes.expectedCloseAt) data.endDate = toDate(changes.expectedCloseAt);
  if (changes.nextAction) data.remark = changes.nextAction;
  if (changes.lossReason) data.remark = `丢单原因：${changes.lossReason}`;
  if (changes.probability !== undefined) {
    const probability = Number(changes.probability);
    if (!Number.isFinite(probability) || probability < 0 || probability > 100) return { success: false, message: "成交概率必须是0到100之间的数字。" };
    data.remark = mergeProbabilityRemark(data.remark ?? resolved.entity.remark, probability);
  }
  const beforeValues = { name: resolved.entity.name, status: resolved.entity.status, amount: resolved.entity.amount, currency: resolved.entity.currency, endDate: resolved.entity.endDate, remark: resolved.entity.remark };
  const summary = [`理解摘要：更新商机项目`, `项目：${resolved.entity.name}`, `变更字段：${Object.keys(data).join("、")}`, `未确认前不会写入数据库。`].join("\n");
  return { success: true, message: summary, entityType: "Project", entityId: resolved.entity.id, plan: { intent: "UPDATE_PROJECT", entityType: "Project", entityId: resolved.entity.id, validatedParameters: { data, originalMessageId: context.messageId, context }, beforeValues, summary } };
}

export async function updateProjectService(plan: TaskPlan, senderId: string, messageId?: string, chatId?: string): Promise<ServiceResult> {
  try {
    const project = await prisma.project.update({ where: { id: plan.entityId! }, data: plan.validatedParameters.data });
    setRecentProject({ senderId, chatId, messageId }, project.id);
    await prisma.activityLog.create({ data: { action: "飞书更新商机项目", entityType: "Project", entityId: String(project.id), entityName: project.name, description: `fields=${Object.keys(plan.validatedParameters.data).join(",")}; sender=${senderId}; messageId=${messageId || ""}` } });
    return { success: true, message: `商机项目已更新\n项目：${project.name}\nID：${project.id}`, entityType: "Project", entityId: project.id };
  } catch (error) {
    return safeError(error, "更新商机项目失败，请稍后重试。");
  }
}

export const __taskProjectFlowTestUtils = {
  toDate,
  formatPriority,
  formatTaskStatus,
  formatProjectStage,
};
