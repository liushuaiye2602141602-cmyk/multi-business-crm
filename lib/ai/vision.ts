import { getAIConfig } from "./types";

export interface VisionConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function getVisionConfig(): VisionConfig | null {
  const apiKey = process.env.VISION_API_KEY;
  const baseUrl = process.env.VISION_BASE_URL;
  const model = process.env.VISION_MODEL;

  if (!apiKey || !baseUrl || !model) {
    // 回退到主 AI 配置（如果模型支持视觉）
    const mainConfig = getAIConfig();
    if (mainConfig.apiKey && mainConfig.baseUrl && mainConfig.model) {
      return {
        apiKey: mainConfig.apiKey,
        baseUrl: mainConfig.baseUrl,
        model: mainConfig.model,
      };
    }
    return null;
  }

  return { apiKey, baseUrl, model };
}

export async function getVisionConfigFromDB(): Promise<VisionConfig | null> {
  try {
    const { default: prisma } = await import("@/lib/prisma");
    const config = await prisma.aIConfig.findFirst({ where: { isActive: true } });
    if (config && config.visionApiKey && config.visionModel) {
      return {
        apiKey: config.visionApiKey,
        baseUrl: config.visionBaseUrl || config.baseUrl,
        model: config.visionModel,
      };
    }
    // If no dedicated vision config, check if main model might support vision
    if (config && config.apiKey && config.model) {
      return {
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
      };
    }
  } catch {}
  return null;
}

export interface ExtractedCustomer {
  company: string;
  contactName: string;
  country?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  industry?: string;
  requirement?: string;
  interestProducts?: string;
  source?: string;
  remark?: string;
}

export async function extractCustomerFromImage(
  imageBase64: string
): Promise<ExtractedCustomer> {
  const config = getVisionConfig();
  if (!config) {
    throw new Error(
      "视觉模型未配置。请在 .env 中设置 VISION_API_KEY、VISION_BASE_URL、VISION_MODEL，或确保主 AI 模型支持图片输入。"
    );
  }

  let baseUrl = config.baseUrl;
  if (!baseUrl.endsWith("/")) baseUrl += "/";

  const response = await fetch(`${baseUrl}chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content: `你是一个客户信息提取助手。从图片中提取客户资料，返回 JSON 格式。

提取字段（如果图片中有）：
- company: 公司名称（必填）
- contactName: 联系人姓名（必填）
- country: 国家
- email: 邮箱
- phone: 电话
- whatsapp: WhatsApp
- website: 网站
- industry: 行业
- requirement: 需求描述
- interestProducts: 感兴趣的产品
- source: 来源渠道
- remark: 其他备注信息

只返回 JSON，不要其他文字。如果无法识别公司名或联系人，将 company 和 contactName 设为 "未知"。`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "请从这张图片中提取客户信息：" },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Vision API 请求失败 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  // 提取 JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI 无法从图片中提取客户信息");
  }

  return JSON.parse(jsonMatch[0]) as ExtractedCustomer;
}
