import { getAIConfig } from "./types";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class AIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "AIError";
  }
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const config = getAIConfig();

  if (!config.apiKey) {
    throw new AIError("AI_API_KEY 未配置，请检查 .env 文件");
  }

  if (!config.model) {
    throw new AIError("AI_MODEL 未配置，请检查 .env 文件");
  }

  let baseUrl = config.baseUrl;

  if (!baseUrl && config.provider === "OPENAI") {
    baseUrl = "https://api.openai.com/v1";
  }

  if (!baseUrl) {
    throw new AIError("AI_BASE_URL 未配置，请检查 .env 文件");
  }

  if (!baseUrl.endsWith("/")) {
    baseUrl += "/";
  }

  const url = `${baseUrl}chat/completions`;

  const body = {
    model: config.model,
    messages,
    temperature: options?.temperature ?? 0.3,
    ...(options?.maxTokens ? { max_tokens: options.maxTokens } : {}),
  };

  let response: Response;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AIError("AI 请求超时，请稍后重试，或检查接口服务是否可用");
    }
    throw new AIError(`AI 请求失败: ${error instanceof Error ? error.message : "网络错误"}`);
  }

  if (!response.ok) {
    let errorMsg = "AI 请求失败";
    try {
      const errorData = await response.text();
      errorMsg = errorData;
    } catch {}

    switch (response.status) {
      case 401:
      case 403:
        throw new AIError("AI API Key 可能无效或无权限", response.status);
      case 404:
        throw new AIError("AI_BASE_URL 或模型接口地址可能不正确", response.status);
      case 429:
        throw new AIError("请求过于频繁或额度不足", response.status);
      case 500:
      case 502:
      case 503:
        throw new AIError("AI 服务端异常，请稍后重试", response.status);
      default:
        throw new AIError(`AI 请求失败 (${response.status}): ${errorMsg}`, response.status);
    }
  }

  let data: ChatCompletionResponse;
  try {
    data = await response.json();
  } catch {
    throw new AIError("AI 返回内容无法解析为 JSON");
  }

  if (!data.choices || data.choices.length === 0) {
    throw new AIError("AI 返回为空");
  }

  return data.choices[0].message.content;
}
