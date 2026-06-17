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
