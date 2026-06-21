export type KernelParserOutput = {
  intent: string;
  entityHint?: string | Record<string, any> | null;
  parameters?: Record<string, any>;
};

export type KernelActionPlan = {
  actionType: string;
  entityId?: number;
  entityHint?: string | Record<string, any> | null;
  payload: Record<string, any>;
};

const ACTION_ALIASES: Record<string, string> = {
  CONVERT_LEAD_TO_CUSTOMER: "CONVERT_LEAD_TO_CUSTOMER",
  QUOTE_TO_ORDER: "CONVERT_QUOTE_TO_ORDER",
  CONVERT_QUOTE_TO_ORDER: "CONVERT_QUOTE_TO_ORDER",
  ACCEPT_QUOTE: "ACCEPT_QUOTE",
  SEND_QUOTE: "SEND_QUOTE",
};

function firstNumeric(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return undefined;
}

export function buildActionPlan(input: KernelParserOutput): KernelActionPlan {
  const parameters = input.parameters || {};
  const actionType = ACTION_ALIASES[input.intent] || input.intent;
  const entityId = firstNumeric(
    parameters.entityId,
    parameters.id,
    parameters.leadId,
    parameters.customerId,
    parameters.quoteId,
    parameters.orderId,
    parameters.taskId,
    parameters.projectId,
    parameters.productId,
    parameters.contactId,
    parameters.followUpId,
    parameters.templateId,
    parameters.documentId,
    parameters.businessLineId,
    parameters.salesGoalId,
    parameters.quoteItemId,
    parameters.orderItemId,
    parameters.customerListViewId,
    parameters.orderListViewId,
    parameters.externalSourceId,
    parameters.invoiceId,
    parameters.paymentId,
    parameters.aIAnalysisId,
    parameters.calendarEventId,
    parameters.customFieldDefinitionId,
    parameters.contactSocialProfileId,
  );

  return {
    actionType,
    entityId,
    entityHint: input.entityHint ?? parameters.entityHint ?? null,
    payload: parameters,
  };
}
