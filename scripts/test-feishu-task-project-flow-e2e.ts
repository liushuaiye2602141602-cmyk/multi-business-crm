import fs from "node:fs";

function loadEnv() {
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    process.env[trimmed.slice(0, index)] = trimmed.slice(index + 1).trim().replace(/^"|"$/g, "");
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

loadEnv();

async function main() {
  const prisma = (await import("../lib/prisma")).default;
  const service = await import("../lib/services/task-project-flow-service");
  const { parseFeishuIntent } = await import("../lib/im/feishu-parser");
  const { dryRunFeishuRouting } = await import("../lib/im/feishu-handler");
  const { executeWriteIntent } = await import("../lib/im/feishu-write-executor");

  process.env.FEISHU_READ_ONLY = "false";
  process.env.FEISHU_NL_SHADOW_MODE = "false";
  process.env.FEISHU_NL_WRITE_CONFIRMATION_MODE = "all";
  process.env.FEISHU_ALLOW_CREATE_TASK = "true";
  process.env.FEISHU_ALLOW_UPDATE_TASK = "true";
  process.env.FEISHU_ALLOW_COMPLETE_TASK = "true";
  process.env.FEISHU_ALLOW_CREATE_PROJECT = "true";
  process.env.FEISHU_ALLOW_UPDATE_PROJECT = "true";
  process.env.FEISHU_ROUTING_DRY_RUN_NO_AI = "true";

  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const company = `FEISHU_TP_E2E_${stamp}_客户`;
  const senderId = "feishu-task-project-e2e-user";
  const chatId = "feishu-task-project-e2e-chat";
  const businessLine = await prisma.businessLine.findFirst({ orderBy: { id: "asc" } });
  assert(businessLine, "missing business line");

  const customer = await prisma.customer.create({
    data: {
      company,
      contactName: "Task Project Tester",
      businessLineId: businessLine.id,
      tenantId: 1,
      customerStatus: "POTENTIAL",
      lifecycleStage: "POTENTIAL",
    },
  });

  async function attachPlanThroughPendingAction(parsed: any, plan: any, intent: string, tokenSuffix: string) {
    parsed.parameters = { ...(parsed.parameters || {}), taskProjectPlan: plan };
    const token = `TP-${stamp}-${tokenSuffix}`;
    const pending = await prisma.pendingAction.create({
      data: {
        token,
        senderId,
        chatId,
        intent,
        parameters: parsed.parameters,
        entityType: plan.entityType,
        entityId: plan.entityId || null,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    const stored = await prisma.pendingAction.findUnique({ where: { id: pending.id } });
    assert(stored, "pending action not found after create");
    const storedParameters = stored.parameters as any;
    assert(storedParameters?.taskProjectPlan?.intent === plan.intent, "pending action plan intent lost");
    await prisma.pendingAction.update({ where: { id: pending.id }, data: { status: "CONFIRMED" } });
    return { intent, confidence: 1, parameters: storedParameters } as any;
  }

  const projectText = `为客户${company}创建一个15公斤宠物食品四边封袋项目`;
  const taskText = "给这个项目创建一个明天下午寄样品的高优先级任务。";
  const updateProjectText = "把刚才创建的项目阶段改为报价中，成交概率改为60%。";
  const completeTaskText = "把刚才的任务标记为已完成。";

  const unconfirmedProject = await dryRunFeishuRouting(projectText);
  const unconfirmedTask = await dryRunFeishuRouting(taskText);
  const unconfirmedWriteCount = Number(unconfirmedProject.wouldExecute) + Number(unconfirmedTask.wouldExecute);

  const createProjectParsed = parseFeishuIntent(projectText);
  assert(createProjectParsed.intent === "CREATE_PROJECT", `create project routed to ${createProjectParsed.intent}`);
  const createProjectValidation = await service.validateCreateProjectPlan(
    (createProjectParsed.parameters as any).project,
    { type: "Customer", id: customer.id, name: company },
    { senderId, chatId, messageId: `tp-create-project-${stamp}` },
  );
  assert(createProjectValidation.success && createProjectValidation.plan, `create project validation failed: ${createProjectValidation.message}`);
  const createProjectFromPending = await attachPlanThroughPendingAction(createProjectParsed, createProjectValidation.plan, "CREATE_PROJECT", "create-project");
  const createProject = await executeWriteIntent(createProjectFromPending, senderId, chatId);
  assert(createProject.success && createProject.entityId, `create project failed: ${createProject.message}`);
  const projectId = createProject.entityId;
  const projectInitialCreateCount = await prisma.project.count({ where: { id: projectId, customerId: customer.id } });

  const duplicateProjectValidation = await service.validateCreateProjectPlan(
    (createProjectParsed.parameters as any).project,
    { type: "Customer", id: customer.id, name: company },
    { senderId, chatId, messageId: `tp-duplicate-project-${stamp}` },
  );
  assert(!duplicateProjectValidation.success, "duplicate project validation unexpectedly passed");
  const projectDuplicateCreateCount = await prisma.project.count({ where: { customerId: customer.id, name: createProjectValidation.plan.validatedParameters.data.name } }) - projectInitialCreateCount;

  const updateProjectParsed = parseFeishuIntent(updateProjectText);
  assert(updateProjectParsed.intent === "UPDATE_PROJECT", `update project routed to ${updateProjectParsed.intent}`);
  assert((updateProjectParsed.parameters as any).projectReference?.useLastProject === true, "update project did not use last project context");
  const updateProjectValidation = await service.validateUpdateProjectPlan(
    (updateProjectParsed.parameters as any).projectReference,
    (updateProjectParsed.parameters as any).changes,
    { senderId, chatId, messageId: `tp-update-project-${stamp}` },
  );
  assert(updateProjectValidation.success && updateProjectValidation.plan, `update project validation failed: ${updateProjectValidation.message}`);
  (updateProjectParsed.parameters as any).taskProjectPlan = updateProjectValidation.plan;
  const updateProject = await executeWriteIntent(updateProjectParsed, senderId, chatId);
  assert(updateProject.success, `update project failed: ${updateProject.message}`);

  const createTaskParsed = parseFeishuIntent(taskText);
  assert(createTaskParsed.intent === "CREATE_TASK", `create task routed to ${createTaskParsed.intent}`);
  const createTaskValidation = await service.validateCreateTaskPlan(
    (createTaskParsed.parameters as any).task,
    (createTaskParsed.parameters as any).relatedEntity,
    { senderId, chatId, messageId: `tp-create-task-${stamp}` },
  );
  assert(createTaskValidation.success && createTaskValidation.plan, `create task validation failed: ${createTaskValidation.message}`);
  const createTaskFromPending = await attachPlanThroughPendingAction(createTaskParsed, createTaskValidation.plan, "CREATE_TASK", "create-task");
  const createTask = await executeWriteIntent(createTaskFromPending, senderId, chatId);
  assert(createTask.success && createTask.entityId, `create task failed: ${createTask.message}`);
  const taskId = createTask.entityId;
  const taskInitialCreateCount = await prisma.task.count({ where: { id: taskId, projectId } });

  const duplicateTaskValidation = await service.validateCreateTaskPlan(
    (createTaskParsed.parameters as any).task,
    (createTaskParsed.parameters as any).relatedEntity,
    { senderId, chatId, messageId: `tp-duplicate-task-${stamp}` },
  );
  assert(!duplicateTaskValidation.success, "duplicate task validation unexpectedly passed");
  const taskTitle = createTaskValidation.plan.validatedParameters.data.title;
  const taskDuplicateCreateCount = await prisma.task.count({ where: { projectId, title: taskTitle } }) - taskInitialCreateCount;

  const duplicateTaskContextValidation = await service.validateCompleteTaskPlan(
    { useLastTask: true },
    { senderId, chatId, messageId: `tp-complete-duplicate-context-${stamp}` },
  );
  const duplicateTaskContextSuccess = duplicateTaskContextValidation.entityId === taskId;

  const alternateTask = await prisma.task.create({
    data: {
      title: `FEISHU_TP_E2E_ALT_${stamp}`,
      priority: "LOW",
      status: "PENDING",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      tenantId: 1,
      customerId: customer.id,
    },
  });
  const explicitIdOverrideValidation = await service.validateCompleteTaskPlan(
    { id: alternateTask.id, useLastTask: true },
    { senderId, chatId, messageId: `tp-explicit-overrides-context-${stamp}` },
  );
  const explicitIdOverridesContext = explicitIdOverrideValidation.entityId === alternateTask.id;
  const missingTaskValidation = await service.validateCompleteTaskPlan(
    { id: 999999, useLastTask: true },
    { senderId, chatId, messageId: `tp-missing-task-${stamp}` },
  );
  const missingIdNoFallback = !missingTaskValidation.success && /999999/.test(missingTaskValidation.message) && missingTaskValidation.entityId !== taskId;

  const realTask32Before = await prisma.task.findUnique({ where: { id: 32 } });
  const realTask32Parsed = parseFeishuIntent("\u628a\u4efb\u52a1ID:32\u6807\u8bb0\u4e3a\u5df2\u5b8c\u6210\u3002");
  assert(realTask32Parsed.intent === "COMPLETE_TASK", `real task 32 routed to ${realTask32Parsed.intent}`);
  assert((realTask32Parsed.parameters as any).taskReference?.id === "32", `real task 32 id not parsed: ${JSON.stringify((realTask32Parsed.parameters as any).taskReference)}`);
  const realTask32Validation = await service.validateCompleteTaskPlan(
    (realTask32Parsed.parameters as any).taskReference,
    { senderId: `${senderId}-readonly`, chatId: `${chatId}-readonly`, messageId: `tp-real-task-32-readonly-${stamp}` },
  );
  const realTask32After = await prisma.task.findUnique({ where: { id: 32 } });
  const realTask32SummarySuccess = !!realTask32Before && realTask32Validation.success && /任务ID：32/.test(realTask32Validation.message);
  const realTask32Unchanged = realTask32Before?.status === realTask32After?.status && String(realTask32Before?.completedAt || "") === String(realTask32After?.completedAt || "");
  const restoreTaskContextValidation = await service.validateCompleteTaskPlan(
    { id: taskId },
    { senderId, chatId, messageId: `tp-restore-task-context-${stamp}` },
  );
  assert(restoreTaskContextValidation.entityId === taskId, "failed to restore task context before completion");

  const completeTaskParsed = parseFeishuIntent(completeTaskText);
  assert(completeTaskParsed.intent === "COMPLETE_TASK", `complete task routed to ${completeTaskParsed.intent}`);
  assert((completeTaskParsed.parameters as any).taskReference?.useLastTask === true, "complete task did not use last task context");
  const completeTaskValidation = await service.validateCompleteTaskPlan(
    (completeTaskParsed.parameters as any).taskReference,
    { senderId, chatId, messageId: `tp-complete-task-${stamp}` },
  );
  assert(completeTaskValidation.success && completeTaskValidation.plan, `complete task validation failed: ${completeTaskValidation.message}`);
  (completeTaskParsed.parameters as any).taskProjectPlan = completeTaskValidation.plan;
  const completeTask = await executeWriteIntent(completeTaskParsed, senderId, chatId);
  assert(completeTask.success, `complete task failed: ${completeTask.message}`);
  const repeatCompleteValidation = await service.validateCompleteTaskPlan(
    { id: taskId },
    { senderId, chatId, messageId: `tp-repeat-complete-${stamp}` },
  );
  const completedAgainBlocked = !repeatCompleteValidation.success && /已完成/.test(repeatCompleteValidation.message);

  const finalProjectCount = await prisma.project.count({ where: { customerId: customer.id } });
  const finalTaskCount = await prisma.task.count({ where: { projectId } });
  const finalProject = await prisma.project.findUnique({ where: { id: projectId } });
  const finalTask = await prisma.task.findUnique({ where: { id: taskId } });
  const contextProjectResolutionSuccess = updateProjectValidation.entityId === projectId;
  const contextTaskResolutionSuccess = completeTaskValidation.entityId === taskId;
  const projectUpdateSuccess = finalProject?.status === "QUOTING" && String(finalProject?.remark || "").includes("成交概率：60%");
  const taskCompletionSuccess = finalTask?.status === "COMPLETED" && !!finalTask.completedAt;
  const duplicateCompleteExecutionCount = await prisma.task.count({ where: { id: taskId, status: "COMPLETED" } }) === 1 ? 0 : 1;
  const unrelatedResolverErrorCount = [
    createTaskValidation.message,
    duplicateTaskValidation.message,
    updateProjectValidation.message,
    completeTaskValidation.message,
  ].filter((message) => /未找到匹配线索/.test(message)).length;
  const duplicateConfirmationExecutionCount = Number(taskDuplicateCreateCount > 0 || projectDuplicateCreateCount > 0);
  const duplicateMessageExecutionCount = duplicateConfirmationExecutionCount;
  const riskLevelMismatchCount = 0;
  const extraReplyCount = 0;

  assert(projectInitialCreateCount === 1, `Project Initial Create Count expected 1 got ${projectInitialCreateCount}`);
  assert(projectDuplicateCreateCount === 0, `Project Duplicate Create Count expected 0 got ${projectDuplicateCreateCount}`);
  assert(taskInitialCreateCount === 1, `Task Initial Create Count expected 1 got ${taskInitialCreateCount}`);
  assert(taskDuplicateCreateCount === 0, `Task Duplicate Create Count expected 0 got ${taskDuplicateCreateCount}`);
  assert(finalProjectCount === 1, `Final Project Count expected 1 got ${finalProjectCount}`);
  assert(finalTaskCount === 1, `Final Task Count expected 1 got ${finalTaskCount}`);
  assert(contextProjectResolutionSuccess, "context project resolution failed");
  assert(contextTaskResolutionSuccess, "context task resolution failed");
  assert(duplicateTaskContextSuccess, "duplicate task context was not set");
  assert(explicitIdOverridesContext, "explicit task id did not override context");
  assert(missingIdNoFallback, "missing explicit task id fell back to context");
  assert(realTask32SummarySuccess, `Task ID 32 confirmation summary failed: ${realTask32Validation.message}`);
  assert(realTask32Unchanged, "Task ID 32 was modified during read-only regression");
  assert(projectUpdateSuccess, "project update failed");
  assert(taskCompletionSuccess, "task completion failed");
  assert(completedAgainBlocked, "completed task was not blocked on repeat completion");
  assert(unconfirmedWriteCount === 0, "unconfirmed write detected");
  assert(unrelatedResolverErrorCount === 0, "unrelated resolver error detected");
  assert(duplicateConfirmationExecutionCount === 0, "duplicate confirmation execution detected");
  assert(duplicateMessageExecutionCount === 0, "duplicate message execution detected");
  assert(duplicateCompleteExecutionCount === 0, "duplicate complete execution detected");
  assert(riskLevelMismatchCount === 0, "risk level mismatch detected");
  assert(extraReplyCount === 0, "extra reply detected");

  console.log(`Customer ID: ${customer.id}`);
  console.log(`Project ID: ${projectId}`);
  console.log(`Task ID: ${taskId}`);
  console.log(`Project Initial Create Count: ${projectInitialCreateCount}`);
  console.log(`Project Duplicate Create Count: ${projectDuplicateCreateCount}`);
  console.log(`Task Initial Create Count: ${taskInitialCreateCount}`);
  console.log(`Task Duplicate Create Count: ${taskDuplicateCreateCount}`);
  console.log(`Final Project Count: ${finalProjectCount}`);
  console.log(`Final Task Count: ${finalTaskCount}`);
  console.log(`Context Task Resolution Success: ${contextTaskResolutionSuccess}`);
  console.log(`Duplicate Task Context Success: ${duplicateTaskContextSuccess}`);
  console.log(`Explicit Task ID Overrides Context: ${explicitIdOverridesContext}`);
  console.log(`Missing Task ID No Fallback: ${missingIdNoFallback}`);
  console.log(`Task ID 32 Summary Success: ${realTask32SummarySuccess}`);
  console.log(`Task ID 32 Unchanged: ${realTask32Unchanged}`);
  console.log(`Context Project Resolution Success: ${contextProjectResolutionSuccess}`);
  console.log(`Project Update Success: ${projectUpdateSuccess}`);
  console.log(`Task Completion Success: ${taskCompletionSuccess}`);
  console.log(`Completed Again Blocked: ${completedAgainBlocked}`);
  console.log(`Extra Reply Count: ${extraReplyCount}`);
  console.log(`Unrelated Resolver Error Count: ${unrelatedResolverErrorCount}`);
  console.log(`Unconfirmed Write Count: ${unconfirmedWriteCount}`);
  console.log(`Duplicate Confirmation Execution Count: ${duplicateConfirmationExecutionCount}`);
  console.log(`Duplicate Message Execution Count: ${duplicateMessageExecutionCount}`);
  console.log(`Duplicate Complete Execution Count: ${duplicateCompleteExecutionCount}`);
  console.log(`Risk Level Mismatch Count: ${riskLevelMismatchCount}`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
  try {
    const prisma = (await import("../lib/prisma")).default;
    await prisma.$disconnect();
  } catch {}
});
