/**
 * 飞书长连接模式
 * 通过 feishu-bot-entry.ts 启动（确保环境变量已加载）
 *
 * 使用方式：
 *   npm run feishu:bot
 */
import { Client, EventDispatcher, WSClient, LoggerLevel } from "@larksuiteoapi/node-sdk";
import { handleIncomingFeishuMessage } from "../lib/im/feishu-handler";

  // Read-only mode: controlled by FEISHU_READ_ONLY env var
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
  logFeishuRuntimeSummary();

  // Log all write permissions
  if (!FEISHU_READ_ONLY) {
    const writeFlags: Record<string, string> = {
      CREATE_LEAD: "FEISHU_ALLOW_CREATE_LEAD",
      UPDATE_LEAD: "FEISHU_ALLOW_UPDATE_LEAD",
      ADD_FOLLOWUP: "FEISHU_ALLOW_ADD_FOLLOWUP",
      CREATE_CUSTOMER: "FEISHU_ALLOW_CREATE_CUSTOMER",
      UPDATE_CUSTOMER: "FEISHU_ALLOW_UPDATE_CUSTOMER",
      CREATE_CONTACT: "FEISHU_ALLOW_CREATE_CONTACT",
      UPDATE_CONTACT: "FEISHU_ALLOW_UPDATE_CONTACT",
      SET_PRIMARY_CONTACT: "FEISHU_ALLOW_SET_PRIMARY_CONTACT",
      CREATE_TASK: "FEISHU_ALLOW_CREATE_TASK",
      UPDATE_TASK: "FEISHU_ALLOW_UPDATE_TASK",
      COMPLETE_TASK: "FEISHU_ALLOW_COMPLETE_TASK",
      CREATE_PROJECT: "FEISHU_ALLOW_CREATE_PROJECT",
      UPDATE_PROJECT: "FEISHU_ALLOW_UPDATE_PROJECT",
      CREATE_QUOTE: "FEISHU_ALLOW_CREATE_QUOTE",
      UPDATE_QUOTE: "FEISHU_ALLOW_UPDATE_QUOTE",
      SEND_QUOTE: "FEISHU_ALLOW_SEND_QUOTE",
      ACCEPT_QUOTE: "FEISHU_ALLOW_ACCEPT_QUOTE",
      QUOTE_TO_ORDER: "FEISHU_ALLOW_QUOTE_TO_ORDER",
      CREATE_ORDER: "FEISHU_ALLOW_CREATE_ORDER",
      UPDATE_ORDER: "FEISHU_ALLOW_UPDATE_ORDER",
      CREATE_INVOICE: "FEISHU_ALLOW_CREATE_INVOICE",
      UPDATE_INVOICE: "FEISHU_ALLOW_UPDATE_INVOICE",
      RECORD_PAYMENT: "FEISHU_ALLOW_RECORD_PAYMENT",
      CUSTOMER_POOL: "FEISHU_ALLOW_CUSTOMER_POOL",
      CONVERT_LEAD: "FEISHU_ALLOW_CONVERT_LEAD",
      DELETE: "FEISHU_ALLOW_DELETE",
      BATCH_WRITE: "FEISHU_ALLOW_BATCH_WRITE",
    };
    const enabled: string[] = [];
    const disabled: string[] = [];
    for (const [label, envKey] of Object.entries(writeFlags)) {
      if (process.env[envKey] === "true") enabled.push(label);
      else disabled.push(label);
    }
    console.log(`写入权限 [已开启]: ${enabled.join(", ") || "无"}`);
    console.log(`写入权限 [已关闭]: ${disabled.join(", ")}`);
  }

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

function logFeishuRuntimeSummary() {
  const envFile = process.env.__NEXT_PROCESSED_ENV ? ".env" : ".env";
  const flag = (key: string) => process.env[key] === "true";
  const enabledItems = [
    ["FEISHU_ALLOW_CREATE_LEAD", "创建线索"],
    ["FEISHU_ALLOW_UPDATE_LEAD", "更新线索"],
    ["FEISHU_ALLOW_ADD_FOLLOWUP", "添加跟进"],
    ["FEISHU_ALLOW_CONVERT_LEAD", "线索转客户"],
    ["FEISHU_ALLOW_CREATE_CUSTOMER", "创建客户"],
    ["FEISHU_ALLOW_UPDATE_CUSTOMER", "更新客户"],
    ["FEISHU_ALLOW_CREATE_CONTACT", "创建联系人"],
    ["FEISHU_ALLOW_UPDATE_CONTACT", "更新联系人"],
    ["FEISHU_ALLOW_SET_PRIMARY_CONTACT", "设置主联系人"],
    ["FEISHU_ALLOW_CREATE_TASK", "创建任务"],
    ["FEISHU_ALLOW_UPDATE_TASK", "更新任务"],
    ["FEISHU_ALLOW_COMPLETE_TASK", "完成任务"],
    ["FEISHU_ALLOW_CREATE_PROJECT", "创建商机项目"],
    ["FEISHU_ALLOW_UPDATE_PROJECT", "更新商机项目"],
    ["FEISHU_ALLOW_CREATE_QUOTE", "报价创建"],
    ["FEISHU_ALLOW_UPDATE_QUOTE", "报价更新"],
    ["FEISHU_ALLOW_SEND_QUOTE", "报价发送"],
    ["FEISHU_ALLOW_ACCEPT_QUOTE", "报价接受"],
    ["FEISHU_ALLOW_QUOTE_TO_ORDER", "报价转订单"],
    ["FEISHU_ALLOW_CREATE_ORDER", "订单创建"],
    ["FEISHU_ALLOW_UPDATE_ORDER", "订单更新"],
  ] as const;
  const disabledItems = [
    ["FEISHU_ALLOW_CREATE_INVOICE", "发票写入"],
    ["FEISHU_ALLOW_UPDATE_INVOICE", "发票更新"],
    ["FEISHU_ALLOW_RECORD_PAYMENT", "付款写入"],
    ["FEISHU_ALLOW_REFUND", "退款"],
    ["FEISHU_ALLOW_DELETE", "删除"],
    ["FEISHU_ALLOW_BATCH_WRITE", "批量写入"],
    ["FEISHU_ALLOW_PERMANENT_DELETE", "永久删除"],
    ["FEISHU_ALLOW_RAW_SQL", "原始SQL"],
  ] as const;

  console.log(`自然语言影子模式：${flag("FEISHU_NL_SHADOW_MODE") ? "是" : "否"}`);
  console.log(`自然语言写入确认模式：${process.env.FEISHU_NL_WRITE_CONFIRMATION_MODE || "未设置"}`);
  console.log("当前开放：");
  for (const [key, label] of enabledItems) {
    if (flag(key)) console.log(`* ${label}`);
  }
  console.log("当前关闭：");
  for (const [key, label] of disabledItems) {
    if (!flag(key)) console.log(`* ${label}`);
  }
  console.log("NLU处理器路径：lib/im/feishu-parser.ts + lib/im/nlu-extractor.ts");
  console.log("实际handler路径：lib/im/feishu-handler.ts");
  console.log(`实际环境文件：${envFile}`);
}
