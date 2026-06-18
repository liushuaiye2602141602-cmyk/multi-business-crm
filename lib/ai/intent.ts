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

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      const functionName = toolCall.function.name as IntentType;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        args = {};
      }
      return { intent: functionName, args, functionName: toolCall.function.name, rawResponse };
    }

    return { intent: "unknown", args: {}, functionName: null, rawResponse };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
