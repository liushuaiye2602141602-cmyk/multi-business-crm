export type IntentDomain = "LEAD" | "CUSTOMER" | "QUOTE" | "ORDER" | "TASK";

export type IntentSnapshot = {
  type: IntentDomain;
  stage: string;
  activeEntityId?: string;
  activeEntityType?: string;
  lastAction?: string;
  timestamp: number;
};

export type IntentHistoryItem = {
  type: string;
  entityId?: string;
  action: string;
  timestamp: number;
};

export type IntentContext = {
  sessionId: string;
  currentIntent?: IntentSnapshot;
  intentHistory: IntentHistoryItem[];
};

export type IntentEvent = {
  eventId: string;
  sessionId: string;
  type: IntentDomain;
  stage: string;
  entityId?: string;
  entityType?: string;
  action: string;
  timestamp: number;
  flowKey?: string;
  metadata?: Record<string, unknown>;
};

export type FeishuSessionContext = {
  senderId?: string;
  chatId?: string;
  messageId?: string;
  workspaceId?: number;
};

export type RecordIntentInput = {
  sessionId?: string;
  context?: FeishuSessionContext;
  type: IntentDomain;
  stage: string;
  activeEntityId?: string | number | null;
  activeEntityType?: string | null;
  action: string;
  timestamp?: number;
  flowKey?: string | null;
  metadata?: Record<string, unknown>;
};

export type IntentResolutionCandidate = {
  entityId: string;
  entityType: string;
  source: "intent.current" | "intent.flow";
  score: number;
  event: IntentEvent;
};
