import { getLocalWorkspaceId } from "@/lib/local-context";
/**
 * 飞书长连接模式 - 独立运行脚本
 * 无需公网域名，SDK 主动连接飞书服务器接收消息
 *
 * 使用方式：
 *   npm run feishu:bot
 *
 * 前提：
 *   1. 在 CRM 的 IM 设置页面配置好飞书 appId 和 appSecret
 *   2. 在飞书开放平台「事件与回调」→ 接收方式 → 选择「长连接」
 *   3. 添加事件：im.message.receive_v1
 */

import "dotenv/config";
import { Client, EventDispatcher, WSClient, LoggerLevel } from "@larksuiteoapi/node-sdk";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parseIntent } from "../lib/ai/intent";
import { executeIntent } from "../lib/ai/executor";
import { extractCustomerFromImage } from "../lib/ai/vision";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
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
  });

  const eventDispatcher = new EventDispatcher({});

  // 处理接收到的消息
  eventDispatcher.register({
    "im.message.receive_v1": async (data: any) => {
      const message = data.message;
      const sender = data.sender;
      const senderId = sender?.sender_id?.open_id || "unknown";
      const chatId = message.chat_id;

      // 获取或创建 IM 用户
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

      // 处理图片消息
      if (message.message_type === "image") {
        console.log(`\n🖼️ 收到图片消息 [${senderId}]`);

        await prisma.iMMessage.create({
          data: {
            platformId: platform.id,
            imUserId: imUser.id,
            direction: "in",
            content: "[图片]",
          },
        });

        try {
          // 下载图片
          let imageKey = "";
          try {
            const contentObj = JSON.parse(message.content);
            imageKey = contentObj.image_key || "";
          } catch {}

          if (!imageKey) {
            throw new Error("无法获取图片 key");
          }

          console.log(`📥 下载图片: ${imageKey}`);
          const imageResponse = await client.im.messageResource.get({
            path: { message_id: message.message_id, file_key: imageKey },
            params: { type: "image" },
          });

          // 将 ReadableStream 转为 Buffer 再转 base64
          const chunks: Buffer[] = [];
          const readable = imageResponse.getReadableStream();
          for await (const chunk of readable) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const imageBuffer = Buffer.concat(chunks);
          const imageBase64 = imageBuffer.toString("base64");

          // 调用视觉 AI 提取客户信息
          console.log(`🧠 识别图片中的客户信息...`);
          const extracted = await extractCustomerFromImage(imageBase64);
          console.log(`✅ 提取结果:`, extracted);

          // 自动创建线索
          const businessLine = await prisma.businessLine.findFirst({
            orderBy: { id: "asc" },
          });

          let replyText = "";

          if (businessLine && extracted.company !== "未知") {
            const lead = await prisma.lead.create({
              data: {
                tenantId: getLocalWorkspaceId(),
                company: extracted.company,
                contactName: extracted.contactName,
                country: extracted.country || null,
                email: extracted.email || null,
                phone: extracted.phone || null,
                whatsapp: extracted.whatsapp || null,
                requirement: extracted.requirement || null,
                interestProducts: extracted.interestProducts || null,
                remark: extracted.remark || null,
                source: "OTHER",
                status: "NEW",
                temperature: "WARM",
                grade: "C",
                businessLineId: businessLine.id,
              },
            });

            replyText = `已从图片识别并创建线索：
公司: ${extracted.company}
联系人: ${extracted.contactName}${extracted.country ? `\n国家: ${extracted.country}` : ""}${extracted.email ? `\n邮箱: ${extracted.email}` : ""}${extracted.phone ? `\n电话: ${extracted.phone}` : ""}${extracted.whatsapp ? `\nWhatsApp: ${extracted.whatsapp}` : ""}${extracted.requirement ? `\n需求: ${extracted.requirement}` : ""}${extracted.interestProducts ? `\n感兴趣产品: ${extracted.interestProducts}` : ""}

线索ID: ${lead.id}`;
          } else if (businessLine) {
            // company 为 "未知"，仍创建但提示
            const lead = await prisma.lead.create({
              data: {
                tenantId: getLocalWorkspaceId(),
                company: extracted.company,
                contactName: extracted.contactName,
                remark: extracted.remark || "图片识别，信息不完整",
                source: "OTHER",
                status: "NEW",
                temperature: "WARM",
                grade: "C",
                businessLineId: businessLine.id,
              },
            });

            replyText = `图片已识别但信息不完整，已创建线索待补充：
公司: ${extracted.company}
联系人: ${extracted.contactName}
线索ID: ${lead.id}

请手动补充详细信息。`;
          } else {
            replyText = `图片识别结果：
公司: ${extracted.company}
联系人: ${extracted.contactName}

⚠️ 未找到业务线，无法自动创建线索。`;
          }

          await prisma.iMMessage.create({
            data: {
              platformId: platform.id,
              imUserId: imUser.id,
              direction: "out",
              content: replyText,
              intent: "SCREENSHOT_TO_LEAD",
              action: "image_extract",
            },
          });

          if (chatId) {
            await client.im.message.create({
              data: {
                receive_id: chatId,
                msg_type: "text",
                content: JSON.stringify({ text: replyText }),
              },
              params: { receive_id_type: "chat_id" },
            });
            console.log(`📤 已回复图片识别结果`);
          }
        } catch (error) {
          console.error("❌ 图片处理失败:", error);
          const errorMsg = error instanceof Error ? error.message : "图片处理失败";

          await prisma.iMMessage.create({
            data: {
              platformId: platform.id,
              imUserId: imUser.id,
              direction: "out",
              content: `❌ 图片处理出错：${errorMsg}`,
              errorMsg,
            },
          });

          if (chatId) {
            try {
              await client.im.message.create({
                data: {
                  receive_id: chatId,
                  msg_type: "text",
                  content: JSON.stringify({
                    text: `❌ 图片处理出错：${errorMsg}`,
                  }),
                },
                params: { receive_id_type: "chat_id" },
              });
            } catch {}
          }
        }
        return;
      }

      // 只处理文本消息
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

      // 去除 @机器人
      content = content.replace(/@_user_\d+/g, "").trim();
      if (!content) return;

      console.log(`\n📩 收到消息 [${senderId}]: ${content}`);

      // 记录收到的消息
      await prisma.iMMessage.create({
        data: {
          platformId: platform.id,
          imUserId: imUser.id,
          direction: "in",
          content,
        },
      });

      try {
        // 解析意图
        const intentResult = await parseIntent(content);
        console.log(`🧠 意图: ${intentResult.intent}`);

        // 执行业务操作
        const execResult = await executeIntent(intentResult);
        console.log(`✅ 结果: ${execResult.success ? "成功" : "失败"}`);

        // 记录回复
        await prisma.iMMessage.create({
          data: {
            platformId: platform.id,
            imUserId: imUser.id,
            direction: "out",
            content: execResult.message,
            intent: intentResult.intent,
            action: intentResult.functionName,
            actionResult: execResult.data
              ? JSON.parse(JSON.stringify(execResult.data))
              : null,
          },
        });

        // 发送飞书回复
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
        console.error("❌ 处理消息失败:", error);
        const errorMsg = error instanceof Error ? error.message : "处理失败";

        await prisma.iMMessage.create({
          data: {
            platformId: platform.id,
            imUserId: imUser.id,
            direction: "out",
            content: `❌ 处理出错：${errorMsg}`,
            errorMsg,
          },
        });

        if (chatId) {
          try {
            await client.im.message.create({
              data: {
                receive_id: chatId,
                msg_type: "text",
                content: JSON.stringify({ text: `❌ 处理出错：${errorMsg}` }),
              },
              params: { receive_id_type: "chat_id" },
            });
          } catch {}
        }
      }
    },
  });

  // 启动长连接（eventDispatcher 传给 start，不是构造函数）
  const wsClient = new WSClient({
    appId: platform.appId,
    appSecret: platform.appSecret,
    loggerLevel: LoggerLevel.info,
  });

  wsClient.start({ eventDispatcher });

  console.log("✅ 飞书长连接启动中...");
  console.log("按 Ctrl+C 停止");
}

main().catch((error) => {
  console.error("启动失败:", error);
  prisma.$disconnect();
  process.exit(1);
});
