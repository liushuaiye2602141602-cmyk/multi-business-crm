/**
 * 飞书长连接模式
 * 通过 feishu-bot-entry.ts 启动（确保环境变量已加载）
 *
 * 使用方式：
 *   npm run feishu:bot
 */
import { Client, EventDispatcher, WSClient, LoggerLevel } from "@larksuiteoapi/node-sdk";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parseIntent } from "../lib/ai/intent";
import { executeIntent } from "../lib/ai/executor";
import { extractCustomerFromImage } from "../lib/ai/vision";

export async function startFeishuBot() {
  // 验证环境变量
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || typeof connectionString !== "string") {
    console.error("❌ 飞书机器人启动失败：未读取到数据库连接配置");
    console.error("   请检查 .env 文件中 DATABASE_URL 是否已配置");
    process.exit(1);
  }

  // 初始化数据库连接
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  // 数据库连接测试
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ 数据库连接正常");
  } catch (error) {
    console.error("❌ 数据库连接失败:", error instanceof Error ? error.message : error);
    console.error("   请检查 DATABASE_URL 配置是否正确");
    process.exit(1);
  }

  // 从数据库读取飞书配置
  const platform = await prisma.iMPlatform.findUnique({
    where: { name: "feishu" },
  });

  if (!platform || !platform.isActive) {
    console.error("❌ 飞书平台未配置或未启用，请先在 IM 设置页面配置");
    process.exit(1);
  }

  if (!platform.appId || !platform.appSecret) {
    console.error("❌ 飞书 App ID 或 App Secret 未配置");
    process.exit(1);
  }

  console.log(`🤖 飞书机器人启动中... App ID: ${platform.appId}`);

  const client = new Client({
    appId: platform.appId,
    appSecret: platform.appSecret,
    loggerLevel: LoggerLevel.info,
  });

  const eventDispatcher = new EventDispatcher({});

  eventDispatcher.register({
    "im.message.receive_v1": async (data: any) => {
      const message = data.message;
      const sender = data.sender;

      if (message.message_type !== "text") {
        return;
      }

      let content = "";
      try {
        const contentObj = JSON.parse(message.content);
        content = contentObj.text || "";
      } catch {
        content = message.content || "";
      }

      content = content.replace(/@_user_\d+/g, "").trim();
      if (!content) return;

      const senderId = sender?.sender_id?.open_id || "unknown";
      const chatId = message.chat_id;

      console.log(`📩 收到消息 [${senderId}]: ${content}`);

      let imUser = await prisma.iMUser.findUnique({
        where: {
          platformId_platformUserId: {
            platformId: platform.id,
            platformUserId: senderId,
          },
        },
      });

      if (!imUser) {
        imUser = await prisma.iMUser.create({
          data: {
            platformId: platform.id,
            platformUserId: senderId,
            platformName: sender?.sender_id?.user_id || "未知用户",
          },
        });
      }

      await prisma.iMMessage.create({
        data: {
          platformId: platform.id,
          imUserId: imUser.id,
          direction: "in",
          content,
        },
      });

      try {
        const intentResult = await parseIntent(content);
        console.log(`🧠 意图: ${intentResult.intent}`);

        const execResult = await executeIntent(intentResult);
        console.log(`✅ 结果: ${execResult.success ? "成功" : "失败"}`);

        await prisma.iMMessage.create({
          data: {
            platformId: platform.id,
            imUserId: imUser.id,
            direction: "out",
            content: execResult.message,
            intent: intentResult.intent,
            action: intentResult.functionName,
            actionResult: execResult.data ? JSON.parse(JSON.stringify(execResult.data)) : null,
          },
        });

        if (chatId) {
          await client.im.message.create({
            data: {
              receive_id: chatId,
              msg_type: "text",
              content: JSON.stringify({ text: execResult.message }),
            },
            params: { receive_id_type: "chat_id" },
          });
          console.log(`📤 已回复`);
        }
      } catch (error) {
        const errorMsg = "CRM暂时无法处理该请求，请稍后重试";
        console.error("❌ 处理消息失败:", error);

        await prisma.iMMessage.create({
          data: {
            platformId: platform.id,
            imUserId: imUser.id,
            direction: "out",
            content: errorMsg,
            errorMsg: error instanceof Error ? error.message : "Unknown error",
          },
        });

        if (chatId) {
          try {
            await client.im.message.create({
              data: {
                receive_id: chatId,
                msg_type: "text",
                content: JSON.stringify({ text: errorMsg }),
              },
              params: { receive_id_type: "chat_id" },
            });
          } catch {}
        }
      }
    },
  });

  const wsClient = new WSClient({
    appId: platform.appId,
    appSecret: platform.appSecret,
    eventDispatcher,
    loggerLevel: LoggerLevel.info,
  } as any);

  wsClient.start({ eventDispatcher });

  console.log("✅ 飞书长连接启动中...");
  console.log("按 Ctrl+C 停止");
}
