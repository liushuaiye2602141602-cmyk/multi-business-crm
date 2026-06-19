/**
 * 飞书长连接模式
 * 通过 feishu-bot-entry.ts 启动（确保环境变量已加载）
 *
 * 使用方式：
 *   npm run feishu:bot
 */
import { Client, EventDispatcher, WSClient, LoggerLevel } from "@larksuiteoapi/node-sdk";
import { handleIncomingFeishuMessage } from "../lib/im/feishu-handler";

// Read-only mode: the handler only supports queries. Write operations are
// blocked by architecture — the handler never calls write functions.
// Set FEISHU_READ_ONLY=false has no effect currently; kept for future use.
const FEISHU_READ_ONLY = process.env.FEISHU_READ_ONLY !== "false";

export async function startFeishuBot() {
  // 验证环境变量
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || typeof connectionString !== "string") {
    console.error("飞书机器人启动失败：未读取到数据库连接配置");
    console.error("   请检查 .env 文件中 DATABASE_URL 是否已配置");
    process.exit(1);
  }

  // 初始化数据库连接 (use @prisma/client default export)
  const { default: prisma } = await import("../lib/prisma");

  // 数据库连接测试
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("数据库连接正常");
  } catch (error) {
    console.error("数据库连接失败:", error instanceof Error ? error.message : "Unknown DB error");
    console.error("   请检查 DATABASE_URL 配置是否正确");
    process.exit(1);
  }

  // 从数据库读取飞书配置
  const platform = await prisma.iMPlatform.findUnique({
    where: { name: "feishu" },
  });

  if (!platform || !platform.isActive) {
    console.error("飞书平台未配置或未启用，请先在 IM 设置页面配置");
    process.exit(1);
  }

  if (!platform.appId || !platform.appSecret) {
    console.error("飞书 App ID 或 App Secret 未配置");
    process.exit(1);
  }

  console.log(`飞书机器人启动中... App ID: ${platform.appId} | 只读模式: ${FEISHU_READ_ONLY}`);

  const client = new Client({
    appId: platform.appId,
    appSecret: platform.appSecret,
    loggerLevel: LoggerLevel.info,
  });

  const eventDispatcher = new EventDispatcher({});

  eventDispatcher.register({
    "im.message.receive_v1": async (data: any) => {
      const message = data.message;
      if (message.message_type !== "text") return;

      let content = "";
      try {
        const contentObj = JSON.parse(message.content);
        content = contentObj.text || "";
      } catch {
        content = message.content || "";
      }

      // Strip @mentions
      content = content.replace(/@_user_\d+/g, "").trim();
      if (!content) return;

      const chatId = message.chat_id;
      const senderId = data.sender?.sender_id?.open_id || "unknown";

      console.log(`收到消息 [${senderId}]: ${content}`);

      await handleIncomingFeishuMessage(
        {
          messageId: message.message_id,
          chatId,
          senderId,
          text: content,
          receivedAt: new Date(),
        },
        async (replyText: string) => {
          if (chatId) {
            await client.im.message.create({
              data: {
                receive_id: chatId,
                msg_type: "text",
                content: JSON.stringify({ text: replyText }),
              },
              params: { receive_id_type: "chat_id" },
            });
          }
        },
        platform.id,
      );
    },
  });

  const wsClient = new WSClient({
    appId: platform.appId,
    appSecret: platform.appSecret,
    eventDispatcher,
    loggerLevel: LoggerLevel.info,
  } as any);

  wsClient.start({ eventDispatcher });

  console.log("飞书长连接启动中...");
  console.log("按 Ctrl+C 停止");
}
