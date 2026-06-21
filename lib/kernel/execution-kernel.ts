import { buildActionPlan, type KernelActionPlan, type KernelParserOutput } from "@/lib/kernel/action-planner";
import { validateOrderStateTransition } from "@/lib/kernel/state-validator";
import { executeDashboardCrmWrite, type KernelServiceResult } from "@/lib/kernel/dashboard-crm-write-service";
import {
  getIntentSessionId,
  readCurrentIntent,
  withExecutionContextLock,
  writeIntent,
} from "@/lib/memory/intentStore";
import { resolveEntity } from "@/lib/resolver/EntityResolver";
import prisma from "@/lib/prisma";
import { assertRegisteredAction } from "@/lib/kernel/action-registry";
import { withKernelWriteScope } from "@/lib/kernel/system-gate";

export type ExecutionKernelContext = {
  sessionId?: string;
  senderId?: string;
  chatId?: string;
  messageId?: string;
  actorId?: string;
  workspaceId?: number;
};

export type ExecutionKernelResult = KernelServiceResult & {
  actionType?: string;
};

export type ExecutionKernelServices = {
  execute(action: KernelActionPlan, context?: ExecutionKernelContext): Promise<KernelServiceResult>;
};

export type ExecutionKernelStateReader = {
  readOrderState(action: KernelActionPlan): Promise<string | null>;
};

function actionDomain(actionType: string): "LEAD" | "CUSTOMER" | "QUOTE" | "ORDER" | "TASK" {
  if (actionType.includes("ORDER")) return "ORDER";
  if (actionType.includes("QUOTE")) return "QUOTE";
  if (actionType.includes("CUSTOMER")) return "CUSTOMER";
  if (actionType.includes("TASK")) return "TASK";
  return "LEAD";
}

function entityTypeForAction(actionType: string): string {
  const domain = actionDomain(actionType);
  return domain.charAt(0) + domain.slice(1).toLowerCase();
}

function nextOrderStatus(action: KernelActionPlan): string | null {
  return action.payload.status || action.payload.orderStatus || action.payload.changes?.status || action.payload.changes?.orderStatus || action.payload.data?.orderStatus || null;
}

async function readOrderState(action: KernelActionPlan): Promise<string | null> {
  if (!action.entityId) return null;
  const order = await prisma.order.findUnique({ where: { id: action.entityId }, select: { orderStatus: true } });
  return order?.orderStatus || null;
}

function sessionIdFor(context?: ExecutionKernelContext): string | null {
  return getIntentSessionId(context, context?.sessionId);
}

export class ExecutionKernel {
  private readonly services: ExecutionKernelServices;
  private readonly stateReader: ExecutionKernelStateReader;

  constructor(options?: { services?: ExecutionKernelServices; stateReader?: ExecutionKernelStateReader }) {
    this.services = options?.services || { execute: executeDashboardCrmWrite };
    this.stateReader = options?.stateReader || { readOrderState };
  }

  async execute(input: KernelParserOutput, context?: ExecutionKernelContext): Promise<ExecutionKernelResult> {
    if (input.intent === "UNKNOWN") {
      return { success: false, message: "UNKNOWN_INTENT", actionType: "UNKNOWN" };
    }

    const action = buildActionPlan(input);
    assertRegisteredAction(action.actionType);
    const sessionId = sessionIdFor(context);
    const currentIntent = sessionId ? readCurrentIntent(sessionId) : undefined;
    const resolved = resolveEntity({
      sessionId: context?.sessionId,
      context,
      entityType: entityTypeForAction(action.actionType),
      hint: action.entityHint,
      explicitId: action.entityId,
    });
    if (!action.entityId && resolved.entityId) {
      const numeric = Number(resolved.entityId);
      if (Number.isFinite(numeric)) action.entityId = numeric;
    }

    let stateBefore: string | null = null;
    let stateAfter: string | null = null;
    if (action.actionType === "UPDATE_ORDER" || action.actionType === "UPDATE_ORDER_STATUS") {
      stateBefore = await this.stateReader.readOrderState(action);
      const next = nextOrderStatus(action);
      if (stateBefore && next) {
        const validation = validateOrderStateTransition(stateBefore, next);
        if (!validation.ok) throw new Error(validation.code);
        stateAfter = validation.status;
        if (action.actionType === "UPDATE_ORDER") {
          action.payload.changes = { ...(action.payload.changes || {}), status: validation.status };
        }
        if (action.actionType === "UPDATE_ORDER_STATUS") {
          action.payload.status = validation.status;
        }
      }
    }

    const flowKey = `${entityTypeForAction(action.actionType)}:${action.entityId || currentIntent?.activeEntityId || "new"}`;
    const run = async () => {
      const result = await withKernelWriteScope(action.actionType, () => this.services.execute(action, context));
      stateAfter = result.stateAfter ?? stateAfter;

      console.log("[KERNEL]", {
        intent: input.intent,
        entityId: result.entityId ?? action.entityId,
        actionType: action.actionType,
        stateBefore: result.stateBefore ?? stateBefore,
        stateAfter,
      });

      const entityId = result.entityId ?? action.entityId;
      const entityType = result.entityType || entityTypeForAction(action.actionType);
      if (result.success && entityId && sessionId) {
        writeIntent({
          sessionId,
          context,
          type: actionDomain(action.actionType),
          stage: String(stateAfter || action.actionType),
          activeEntityId: entityId,
          activeEntityType: entityType,
          action: action.actionType,
          flowKey: `${entityType}:${entityId}`,
          metadata: { kernel: "v2.1.5" },
        });
      }

      return { ...result, actionType: action.actionType };
    };

    return sessionId ? withExecutionContextLock(sessionId, flowKey, run) : run();
  }
}

export const executionKernel = new ExecutionKernel();
